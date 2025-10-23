import json
import boto3
import hashlib
import os
import secrets
import time
import uuid
from datetime import datetime

USERS_TABLE = os.environ.get('USERS_TABLE', 'rag-chatbot-users')
SESSIONS_TABLE = os.environ.get('SESSIONS_TABLE', 'rag-chatbot-sessions')
SESSION_TTL_SECONDS = int(os.environ.get('SESSION_TTL_SECONDS', str(7 * 24 * 3600)))  # default 7 days

DYNAMODB = boto3.resource('dynamodb')
USERS = DYNAMODB.Table(USERS_TABLE)
SESSIONS = DYNAMODB.Table(SESSIONS_TABLE)

PBKDF2_ITERATIONS = 120_000


def lambda_handler(event, context):
    try:
        path = event.get('resource') or event.get('path', '')
        method = event.get('httpMethod', 'GET').upper()
        body = json.loads(event.get('body') or '{}')

        if path.endswith('/register') and method == 'POST':
            return register_user(body)
        if path.endswith('/login') and method == 'POST':
            return login_user(body)

        return response(404, {'error': 'Not Found'})
    except Exception as exc:
        return response(500, {'error': str(exc)})


def register_user(payload):
    name = (payload.get('name') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''

    if not name or not email or not password:
        return response(400, {'error': 'Name, email, and password are required'})

    if '@' not in email:
        return response(400, {'error': 'Invalid email address'})

    if len(password) < 8:
        return response(400, {'error': 'Password must be at least 8 characters long'})

    existing = USERS.get_item(Key={'email': email}).get('Item')
    if existing:
        return response(409, {'error': 'An account with this email already exists'})

    salt, password_hash = hash_password(password)
    user_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat() + 'Z'

    USERS.put_item(
        Item={
            'email': email,
            'userId': user_id,
            'name': name,
            'passwordSalt': salt,
            'passwordHash': password_hash,
            'createdAt': now_iso
        }
    )

    token_item = create_session(user_id, email)

    return response(201, {
        'token': token_item['token'],
        'expiresAt': token_item['expiresAt'],
        'user': {
            'userId': user_id,
            'name': name,
            'email': email
        }
    })


def login_user(payload):
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''

    if not email or not password:
        return response(400, {'error': 'Email and password are required'})

    user = USERS.get_item(Key={'email': email}).get('Item')
    if not user:
        return response(401, {'error': 'Invalid email or password'})

    if not verify_password(password, user['passwordSalt'], user['passwordHash']):
        return response(401, {'error': 'Invalid email or password'})

    token_item = create_session(user['userId'], email)

    return response(200, {
        'token': token_item['token'],
        'expiresAt': token_item['expiresAt'],
        'user': {
            'userId': user['userId'],
            'name': user['name'],
            'email': email
        }
    })


def create_session(user_id, email):
    token = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + SESSION_TTL_SECONDS

    SESSIONS.put_item(
        Item={
            'token': token,
            'userId': user_id,
            'email': email,
            'expiresAt': expires_at
        }
    )

    return {'token': token, 'expiresAt': expires_at}


def hash_password(password):
    salt = secrets.token_bytes(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PBKDF2_ITERATIONS)
    return salt.hex(), hashed.hex()


def verify_password(password, salt_hex, hash_hex):
    salt = bytes.fromhex(salt_hex)
    expected_hash = bytes.fromhex(hash_hex)
    computed_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PBKDF2_ITERATIONS)
    return secrets.compare_digest(computed_hash, expected_hash)


def response(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps(body)
    }
