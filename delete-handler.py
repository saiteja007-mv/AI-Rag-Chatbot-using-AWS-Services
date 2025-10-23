import json
import boto3
import os
import time

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

DOCUMENTS_BUCKET = os.environ.get('DOCUMENTS_BUCKET')
KENDRA_INDEX_ID = os.environ.get('KENDRA_INDEX_ID')
KENDRA_DATA_SOURCE_ID = os.environ.get('KENDRA_DATA_SOURCE_ID')
USERS_TABLE = os.environ.get('USERS_TABLE', 'rag-chatbot-users')
SESSIONS_TABLE = os.environ.get('SESSIONS_TABLE', 'rag-chatbot-sessions')

USERS = dynamodb.Table(USERS_TABLE)
SESSIONS = dynamodb.Table(SESSIONS_TABLE)


def lambda_handler(event, context):
    try:
        session = authenticate(event)
        body = json.loads(event.get('body') or '{}')

        file_key = body.get('fileKey') or body.get('fileId')
        file_name = body.get('fileName', file_key)

        if not DOCUMENTS_BUCKET:
            raise ValueError('DOCUMENTS_BUCKET environment variable is not set')

        if not file_key:
            return response(400, {'error': 'fileKey is required'})

        user_prefix = f"documents/{session['userId']}/"
        if not file_key.startswith(user_prefix):
            return response(403, {'error': 'You are not allowed to delete this file'})

        s3_client.delete_object(Bucket=DOCUMENTS_BUCKET, Key=file_key)

        sync_id = start_kendra_sync()

        return response(200, {
            'message': f'Deleted {file_name or file_key}',
            'fileId': file_key,
            'kendraSyncId': sync_id
        })

    except AuthError as auth_err:
        return response(auth_err.status, {'error': auth_err.message})
    except Exception as exc:
        return response(500, {'error': str(exc)})


def start_kendra_sync():
    if not (KENDRA_INDEX_ID and KENDRA_DATA_SOURCE_ID):
        return None

    client = boto3.client('kendra')
    try:
        result = client.start_data_source_sync_job(
            Id=KENDRA_DATA_SOURCE_ID,
            IndexId=KENDRA_INDEX_ID
        )
        return result.get('ExecutionId')
    except client.exceptions.ConflictException:
        return None
    except Exception as error:
        print('Failed to start Kendra sync job:', error)
        return None


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
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps(body)
    }


class AuthError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message
