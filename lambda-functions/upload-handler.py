import json
import boto3
import base64
import time
import uuid
import secrets

DOCUMENTS_BUCKET = 'rag-chatbot-docs-1761415396'
KENDRA_INDEX_ID = 'a1698683-7390-406c-b969-1356535e71b6'
KENDRA_DATA_SOURCE_ID = 'a7852dcd-ef30-4f75-becd-69d8344191ff'
USERS_TABLE = 'rag-chatbot-users'
SESSIONS_TABLE = 'rag-chatbot-sessions'

s3_client = boto3.client('s3')
kendra_client = boto3.client('kendra')
dynamodb = boto3.resource('dynamodb')
SESSIONS = dynamodb.Table(SESSIONS_TABLE)


def lambda_handler(event, context):
    try:
        session = authenticate(event)
        body = json.loads(event.get('body', '{}'))

        file_name = body.get('fileName')
        file_content = body.get('fileContent')
        file_type = body.get('fileType')

        if not all([file_name, file_content, file_type]):
            return response(400, {'error': 'Missing required fields'})

        user_id = session['userId']
        safe_name = sanitize_filename(file_name)
        unique_prefix = uuid.uuid4().hex[:8]
        s3_key = f"documents/{user_id}/{unique_prefix}-{safe_name}"
        source_uri = f"s3://{DOCUMENTS_BUCKET}/{s3_key}"

        file_data = base64.b64decode(file_content)

        s3_client.put_object(
            Bucket=DOCUMENTS_BUCKET,
            Key=s3_key,
            Body=file_data,
            ContentType=file_type
        )

        sync_id = start_kendra_sync()

        return response(201, {
            'message': 'File uploaded successfully',
            'fileId': s3_key,
            'fileName': file_name,
            'sourceUri': source_uri,
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


def sanitize_filename(filename):
    keep = [c if c.isalnum() or c in ('.', '-', '_') else '_' for c in filename]
    cleaned = ''.join(keep)
    return cleaned or f"file_{secrets.token_hex(4)}"


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
