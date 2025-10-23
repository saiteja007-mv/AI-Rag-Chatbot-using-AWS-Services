import json
import boto3
import os
import time

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

DOCUMENTS_BUCKET = os.environ.get('DOCUMENTS_BUCKET')
USERS_TABLE = os.environ.get('USERS_TABLE', 'rag-chatbot-users')
SESSIONS_TABLE = os.environ.get('SESSIONS_TABLE', 'rag-chatbot-sessions')

USERS = dynamodb.Table(USERS_TABLE)
SESSIONS = dynamodb.Table(SESSIONS_TABLE)


def lambda_handler(event, context):
    try:
        session = authenticate(event)

        if not DOCUMENTS_BUCKET:
            raise ValueError('DOCUMENTS_BUCKET environment variable is not set')

        prefix = f"documents/{session['userId']}/"
        docs = list_user_documents(prefix)

        return response(200, {'documents': docs})

    except AuthError as auth_err:
        return response(auth_err.status, {'error': auth_err.message})
    except Exception as exc:
        return response(500, {'error': str(exc)})


def list_user_documents(prefix):
    documents = []
    continuation_token = None

    while True:
        params = {
            'Bucket': DOCUMENTS_BUCKET,
            'Prefix': prefix
        }
        if continuation_token:
            params['ContinuationToken'] = continuation_token

        result = s3_client.list_objects_v2(**params)
        for obj in result.get('Contents', []):
            key = obj['Key']
            if key.endswith('/'):
                continue
            stored_name = key.split('/')[-1]
            display_name = extract_display_name(stored_name)
            documents.append({
                'id': key,
                's3Key': key,
                'name': display_name,
                'storedName': stored_name,
                'size': obj.get('Size', 0),
                'sizeReadable': format_size(obj.get('Size', 0)),
                'lastModified': obj.get('LastModified').isoformat() if obj.get('LastModified') else None,
                'sourceUri': f"s3://{DOCUMENTS_BUCKET}/{key}",
                'status': 'completed'
            })

        if result.get('IsTruncated'):
            continuation_token = result.get('NextContinuationToken')
        else:
            break

    documents.sort(key=lambda x: x.get('lastModified') or '', reverse=True)
    return documents


def extract_display_name(stored_name):
    if not stored_name:
        return 'Untitled Document'
    parts = stored_name.split('-', 1)
    if len(parts) == 2 and len(parts[0]) == 8:
        return parts[1]
    return stored_name


def format_size(num_bytes):
    if num_bytes is None:
        return '0 Bytes'
    step = 1024.0
    units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    size = float(num_bytes)
    unit = 0
    while size >= step and unit < len(units) - 1:
        size /= step
        unit += 1
    return f"{size:.2f} {units[unit]}"


def authenticate(event):
    headers = event.get('headers') or {}
    auth_header = headers.get('Authorization') or headers.get('authorization')

    if not auth_header or not auth_header.lower().startswith('bearer '):
        raise AuthError(401, 'Authorization token missing')

    token = auth_header.split()[1]
    session = SESSIONS.get_item(Key={'token': token}).get('Item')
    if not session:
        raise AuthError(401, 'Invalid or expired session token')

    if session.get('expiresAt') and session['expiresAt'] < int(time.time()):
        raise AuthError(401, 'Session token has expired')

    return session


def response(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        'body': json.dumps(body)
    }


class AuthError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message
