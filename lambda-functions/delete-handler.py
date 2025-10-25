import json
import boto3
import time

DOCUMENTS_BUCKET = 'rag-chatbot-docs-1761415396'
KENDRA_INDEX_ID = 'a1698683-7390-406c-b969-1356535e71b6'
KENDRA_DATA_SOURCE_ID = 'a7852dcd-ef30-4f75-becd-69d8344191ff'
SESSIONS_TABLE = 'rag-chatbot-sessions'

s3_client = boto3.client('s3')
kendra_client = boto3.client('kendra')
dynamodb = boto3.resource('dynamodb')
SESSIONS = dynamodb.Table(SESSIONS_TABLE)


def lambda_handler(event, context):
    try:
        session = authenticate(event)
        body = json.loads(event.get('body', '{}'))

        file_key = body.get('fileKey') or body.get('fileId')

        if not file_key:
            return response(400, {'error': 'fileKey required'})

        user_prefix = f"documents/{session['userId']}/"
        if not file_key.startswith(user_prefix):
            return response(403, {'error': 'Access denied'})

        s3_client.delete_object(Bucket=DOCUMENTS_BUCKET, Key=file_key)

        sync_id = start_kendra_sync()

        return response(200, {
            'message': 'File deleted',
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

    try:
        result = kendra_client.start_data_source_sync_job(
            Id=KENDRA_DATA_SOURCE_ID,
            IndexId=KENDRA_INDEX_ID
        )
        return result.get('ExecutionId')
    except kendra_client.exceptions.ConflictException:
        return None
    except Exception:
        return None


def authenticate(event):
    headers = event.get('headers') or {}
    auth_header = headers.get('Authorization') or headers.get('authorization')

    if not auth_header or not auth_header.lower().startswith('bearer '):
        raise AuthError(401, 'Authorization required')

    token = auth_header.split()[1]
    session = SESSIONS.get_item(Key={'token': token}).get('Item')
    if not session:
        raise AuthError(401, 'Invalid token')

    if session.get('expiresAt') and session['expiresAt'] < int(time.time()):
        raise AuthError(401, 'Token expired')

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
