import json
import boto3
import time
from botocore.exceptions import ClientError

BEDROCK_REGION = 'us-east-1'
PRIMARY_MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0'
FALLBACK_MODEL_ID = 'amazon.titan-text-express-v1'
DOCUMENTS_BUCKET = 'rag-chatbot-docs-1761415396'
KENDRA_INDEX_ID = 'a1698683-7390-406c-b969-1356535e71b6'
SESSIONS_TABLE = 'rag-chatbot-sessions'

kendra_client = boto3.client('kendra')
bedrock_client = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
dynamodb = boto3.resource('dynamodb')
SESSIONS = dynamodb.Table(SESSIONS_TABLE)


def lambda_handler(event, context):
    try:
        session = authenticate(event)
        body = json.loads(event['body']) if 'body' in event else event

        user_message = (body.get('message') or '').strip()
        chat_history = body.get('chatHistory', [])

        if not user_message:
            return response(400, {'error': 'Message required'})

        if not KENDRA_INDEX_ID:
            return response(500, {'error': 'Kendra not configured'})

        user_prefix = f"documents/{session['userId']}/"

        # Query Kendra - no filters, will filter results in Python
        kendra_response = kendra_client.query(
            IndexId=KENDRA_INDEX_ID,
            QueryText=user_message,
            PageSize=5
        )

        context_entries = []

        if 'ResultItems' in kendra_response:
            for item in kendra_response['ResultItems']:
                doc_id = item.get('DocumentId', '')
                doc_uri = item.get('DocumentURI', '')

                # Only include documents from user's folder
                if not (user_prefix in doc_id or user_prefix in doc_uri):
                    continue

                excerpt = ''
                if 'DocumentExcerpt' in item and item['DocumentExcerpt']:
                    excerpt = item['DocumentExcerpt'].get('Text', '')

                if excerpt:
                    context_entries.append(excerpt.strip())

        context = '\n\n'.join(context_entries).strip()

        prompt = build_prompt(user_message, chat_history, context)
        ai_output = invoke_with_fallback(prompt)

        if not ai_output:
            ai_output = "I couldn't generate a response. Please try again."

        return response(200, {
            'response': ai_output,
            'context': context
        })

    except AuthError as auth_err:
        return response(auth_err.status, {'error': auth_err.message})
    except Exception as exc:
        return response(500, {'error': str(exc)})


def build_prompt(user_message, chat_history, context):
    history_lines = []
    for msg in chat_history[-10:]:
        role = 'User' if msg.get('role') == 'user' else 'Assistant'
        content = msg.get('content', '').strip()
        if content:
            history_lines.append(f"{role}: {content}")
    history_text = '\n'.join(history_lines) or 'None'

    return f"""You are a helpful assistant that answers questions based on provided documents.

Context from documents:
{context or 'NO_CONTEXT_AVAILABLE'}

Conversation history:
{history_text}

User question: {user_message}

Please provide a clear, concise answer based on the context. If the context doesn't contain relevant information, say so."""


def invoke_with_fallback(prompt):
    try:
        return invoke_model(prompt, PRIMARY_MODEL_ID)
    except ClientError as error:
        if FALLBACK_MODEL_ID:
            print(f"Primary model failed, using fallback: {error}")
            return invoke_model(prompt, FALLBACK_MODEL_ID)
        raise


def invoke_model(prompt, model_id):
    if model_id.startswith('anthropic.'):
        request_body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 600,
            'temperature': 0.4,
            'messages': [{
                'role': 'user',
                'content': [{'type': 'text', 'text': prompt}]
            }]
        }
        result = bedrock_client.invoke_model(
            modelId=model_id,
            accept='application/json',
            contentType='application/json',
            body=json.dumps(request_body)
        )
        body = json.loads(result['body'].read())
        return ''.join(part.get('text', '') for part in body.get('content', []) if part.get('type') == 'text').strip()

    # Titan model
    request_body = {
        'inputText': prompt,
        'textGenerationConfig': {
            'maxTokenCount': 600,
            'temperature': 0.4,
            'topP': 0.9
        }
    }
    result = bedrock_client.invoke_model(
        modelId=model_id,
        accept='application/json',
        contentType='application/json',
        body=json.dumps(request_body)
    )
    body = json.loads(result['body'].read())
    results = body.get('results')
    return results[0].get('outputText', '').strip() if results else ''


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
