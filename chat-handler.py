import json
import boto3
import os
import time
from botocore.exceptions import ClientError

BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')
PRIMARY_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20240620-v1:0')
FALLBACK_MODEL_ID = os.environ.get('BEDROCK_FALLBACK_MODEL_ID', 'amazon.titan-text-express-v1')
DOCUMENTS_BUCKET = os.environ.get('DOCUMENTS_BUCKET')
KENDRA_INDEX_ID = os.environ.get('KENDRA_INDEX_ID')
USERS_TABLE = os.environ.get('USERS_TABLE', 'rag-chatbot-users')
SESSIONS_TABLE = os.environ.get('SESSIONS_TABLE', 'rag-chatbot-sessions')

kendra_client = boto3.client('kendra')
bedrock_client = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
dynamodb = boto3.resource('dynamodb')

USERS = dynamodb.Table(USERS_TABLE)
SESSIONS = dynamodb.Table(SESSIONS_TABLE)


def lambda_handler(event, context):
    try:
        session = authenticate(event)
        body = json.loads(event['body']) if 'body' in event else event

        user_message = (body.get('message') or '').strip()
        chat_history = body.get('chatHistory', [])
        target_document_id = body.get('targetDocumentId') or None
        target_document_name = body.get('targetDocumentName') or ''

        if not user_message:
            return _response(400, {'error': 'Message is required'})

        if not KENDRA_INDEX_ID:
            return _response(500, {'error': 'Kendra index is not configured'})

        user_prefix = f"documents/{session['userId']}/"
        if target_document_id and not allows_document(target_document_id, user_prefix):
            return _response(403, {'error': 'You are not allowed to access this document'})

        kendra_query = {
            'IndexId': KENDRA_INDEX_ID,
            'QueryText': user_message,
            'PageSize': 5
        }

        attribute_filter = build_attribute_filter(target_document_id, user_prefix)
        if attribute_filter:
            kendra_query['AttributeFilter'] = attribute_filter

        kendra_response = kendra_client.query(**kendra_query)

        context_entries = []
        context_references = normalize_reference(target_document_id) if target_document_id else None

        if 'ResultItems' in kendra_response:
            for item in kendra_response['ResultItems']:
                doc_id = item.get('DocumentId', '')
                doc_uri = item.get('DocumentURI', '')

                if not document_belongs_to_user(doc_id, doc_uri, user_prefix):
                    continue

                if context_references and not matches_reference(item, context_references):
                    continue

                excerpt = ''
                if 'DocumentExcerpt' in item and item['DocumentExcerpt']:
                    excerpt = item['DocumentExcerpt'].get('Text', '')
                title = ''
                if 'DocumentTitle' in item and item['DocumentTitle']:
                    title = item['DocumentTitle'].get('Text', '')

                source = title or doc_id or 'Document'
                if excerpt:
                    context_entries.append(f"Document: {source}\n{excerpt.strip()}")

        context = '\n\n'.join(context_entries).strip()

        prompt = build_prompt(user_message, chat_history, target_document_id, target_document_name, context)
        ai_output = invoke_with_fallback(prompt)

        if not ai_output:
            ai_output = "I could not find enough context in the knowledge base to answer that." if not context else "I could not generate a response. Please try again."

        return _response(200, {
            'response': ai_output,
            'context': context,
            'documents': context_entries,
            'targetDocumentId': target_document_id
        })

    except AuthError as auth_err:
        return _response(auth_err.status, {'error': auth_err.message})
    except Exception as exc:
        return _response(500, {'error': str(exc)})


def build_attribute_filter(target_document_id, user_prefix):
    if target_document_id:
        refs = normalize_reference(target_document_id)
        filters = []
        for ref in refs:
            if ref.startswith('s3://'):
                filters.append({'EqualsTo': {'Key': '_source_uri', 'Value': {'StringValue': ref}}})
            else:
                filters.append({'EqualsTo': {'Key': '_document_id', 'Value': {'StringValue': ref}}})
        if len(filters) == 1:
            return filters[0]
        return {'Or': filters}

    # When no specific document is selected, restrict to the user's folder
    if user_prefix:
        refs = normalize_reference(user_prefix)
        filters = [{'Contains': {'Key': '_document_id', 'Value': {'StringListValue': [ref]}}} for ref in refs]
        if len(filters) == 1:
            return filters[0]
        return {'Or': filters}

    return None


def build_prompt(user_message, chat_history, target_document_id, target_document_name, context):
    focus_line = 'Use any relevant information from the uploaded collection.'
    if target_document_id:
        descriptor = target_document_name or target_document_id
        focus_line = f"Focus strictly on the document named '{descriptor}'."

    history_lines = []
    for previous in chat_history[-10:]:
        role = previous.get('role')
        prefix = 'User' if role == 'user' else 'Assistant'
        content = previous.get('content', '').strip()
        if content:
            history_lines.append(f"{prefix}: {content}")
    history_text = '\n'.join(history_lines) or 'None'

    return f"""You are a precise assistant that answers questions using provided document excerpts only.

Instructions:
- {focus_line}
- If the context does not contain enough information, say so explicitly and suggest reviewing the source document.
- Keep answers concise, structured, and cite the referenced document title when possible.

Context:
{context or 'NO_MATCHING_CONTEXT'}

Conversation:
{history_text}

Question:
{user_message}
"""


def invoke_with_fallback(prompt):
    try:
        return invoke_model(prompt, PRIMARY_MODEL_ID)
    except ClientError as error:
        message = str(error)
        if FALLBACK_MODEL_ID and (
            error.response['Error']['Code'] in ['AccessDeniedException', 'ResourceNotFoundException'] or
            'use case details' in message.lower()
        ):
            print(f"Primary model unavailable ({message}). Falling back to {FALLBACK_MODEL_ID}.")
            return invoke_model(prompt, FALLBACK_MODEL_ID)
        raise


def invoke_model(prompt, model_id):
    if model_id.startswith('anthropic.'):
        request_body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 600,
            'temperature': 0.4,
            'messages': [
                {
                    'role': 'user',
                    'content': [{'type': 'text', 'text': prompt}]
                }
            ]
        }
        response = bedrock_client.invoke_model(
            modelId=model_id,
            accept='application/json',
            contentType='application/json',
            body=json.dumps(request_body)
        )
        body = json.loads(response['body'].read())
        output = ''.join(part.get('text', '') for part in body.get('content', []) if part.get('type') == 'text')
        return output.strip()

    request_body = {
        'inputText': prompt,
        'textGenerationConfig': {
            'maxTokenCount': 600,
            'temperature': 0.4,
            'topP': 0.9
        }
    }
    response = bedrock_client.invoke_model(
        modelId=model_id,
        accept='application/json',
        contentType='application/json',
        body=json.dumps(request_body)
    )
    body = json.loads(response['body'].read())
    results = body.get('results')
    if results:
        return results[0].get('outputText', '').strip()
    return ''


def matches_reference(item, references):
    values = {item.get('DocumentId', ''), item.get('DocumentURI', '')}
    for attribute in item.get('DocumentAttributes', []):
        value = attribute.get('Value', {})
        if isinstance(value, dict):
            string_value = value.get('StringValue')
            if string_value:
                values.add(string_value)
    cleaned = set()
    for value in values:
        if value:
            cleaned.add(value)
            cleaned.add(value.split('/', 3)[-1])
    return any(ref and ref in cleaned for ref in references)


def normalize_reference(reference):
    refs = set()
    if not reference:
        return refs
    if reference.startswith('s3://'):
        refs.add(reference)
        parts = reference.split('/', 3)
        if len(parts) > 3:
            refs.add(parts[3])
    else:
        cleaned = reference.lstrip('/')
        refs.add(cleaned)
        if DOCUMENTS_BUCKET:
            refs.add(f"s3://{DOCUMENTS_BUCKET}/{cleaned}")
            refs.add(f"https://{DOCUMENTS_BUCKET}.s3.{BEDROCK_REGION}.amazonaws.com/{cleaned}")
    return refs


def document_belongs_to_user(doc_id, doc_uri, user_prefix):
    if not user_prefix:
        return True
    return any(
        value and user_prefix in value
        for value in (doc_id, doc_uri)
    )


def allows_document(reference, user_prefix):
    if not reference:
        return True
    cleaned = reference.split('/', 3)[-1] if reference.startswith('s3://') else reference.lstrip('/')
    return cleaned.startswith(user_prefix)


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


def _response(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps(body)
    }


class AuthError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message
