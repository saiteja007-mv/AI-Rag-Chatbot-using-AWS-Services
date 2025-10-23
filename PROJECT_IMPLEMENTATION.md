# AI RAG Chatbot – Implementation Guide

This document captures the complete deployment blueprint, service configuration, and ongoing change history for the AI Retrieval-Augmented Generation (RAG) Chatbot project. Update this file whenever the stack changes so GitHub readers and future maintainers have an accurate reference.

## Current Architecture

```
Browser (Login, Upload, Chat)
   │
   ├─▶ API Gateway (REST, stage: prod)
   │      ├─ POST /register ─▶ Lambda: rag-chatbot-auth ─┐
   │      ├─ POST /login    ─▶ Lambda: rag-chatbot-auth ─┘ DynamoDB (rag-chatbot-users, rag-chatbot-sessions)
   │      ├─ GET  /documents ─▶ Lambda: rag-chatbot-documents ─┐
   │      ├─ POST /upload    ─▶ Lambda: rag-chatbot-upload      │
   │      ├─ POST /delete    ─▶ Lambda: rag-chatbot-delete      ├─▶ S3 documents bucket + Amazon Kendra
   │      └─ POST /chat      ─▶ Lambda: rag-chatbot-chat        │      (Developer index + S3 data source)
   │                                                           └─▶ Amazon Bedrock (Claude 3 Sonnet with Titan fallback)
   │
   └─▶ S3 Static Website bucket (index.html, styles.css, script.js)
```

## AWS Resources in Use

| Category | Name / Identifier | Notes |
| --- | --- | --- |
| **Static Hosting** | `ai-rag-chatbot-g6` (S3) | Hosts the SPA (HTML/CSS/JS). Static website hosting enabled. |
| **Document Storage** | `ai-rag-documents-g6` (S3) | Stores uploads under `documents/{userId}/`. Versioning optional. |
| **DynamoDB** | `rag-chatbot-users` | PK: `email`. Stores `userId`, `name`, salted password hash, created-at. |
| | `rag-chatbot-sessions` | PK: `token`. Stores active sessions with TTL (`expiresAt`). |
| **Lambda Functions** | `rag-chatbot-auth` | Handles `/register` + `/login`, hashing, and session issuance. |
| | `rag-chatbot-documents` | Lists a user’s documents from S3 (GET `/documents`). |
| | `rag-chatbot-upload` | Authenticated upload + S3 write + Kendra sync trigger. |
| | `rag-chatbot-delete` | Authenticated delete + S3 object removal + Kendra sync. |
| | `rag-chatbot-chat` | Authenticated chat, Kendra query + Bedrock inference (Claude with Titan fallback). |
| **IAM Roles** | `RAGChatbotLambdaRole` | Lambda execution. Now includes DynamoDB, S3, Kendra, Bedrock permissions. |
| | `RAGChatbotKendraRole` | Amazon Kendra data source role (S3 access + CloudWatch + BatchPut/Delete). |
| **Custom IAM Policies** | `RAGChatbotKendraBedrockPolicy` | Allows Kendra query + Bedrock invoke for Lambda role. |
| | Inline `RAGChatbotDynamoDBPolicy` | Grants DynamoDB CRUD & Describe on user/session tables. |
| **Amazon Kendra** | Index `28726c3c-71af-492b-b98d-89e2735fd7a7` | Developer Edition. |
| | Data source `bd7c7753-9160-4804-96d6-cfcae9be8e5d` | S3 connector for `documents/`. |
| **Amazon Bedrock** | Primary model | `anthropic.claude-3-sonnet-20240229-v1:0` (fallback to `amazon.titan-text-express-v1`). |
| **API Gateway** | REST API `qvx2qq6sra` | Stage `prod`. Endpoints: `/register`, `/login`, `/documents`, `/upload`, `/delete`, `/chat`. |

## Frontend Overview (`index.html`, `styles.css`, `script.js`)

- **Authentication UI**: Account creation + login forms with client validation. Session persisted in `localStorage` (`ragAuthSession`).
- **Secure Upload/Chat**: JWT-like bearer token added to every API request. Upload size capped at 7.5 MB to respect API Gateway limits.
- **Document Dashboard**: Sidebar list populated from `/documents`; “focus” button ties chat to a single document. Delete button invokes `/delete`.
- **Chat Experience**: Chat history cached per user (`ragChatbotData_<userId>`). The “Answer using” dropdown persists selection and drives `targetDocumentId` in chat requests.

## Backend Lambda Details

### `rag-chatbot-auth`
- **Register**: Validates input, salts + hashes password via PBKDF2, stores user record, returns new session token.
- **Login**: Validates password, issues new session token. Sessions expire after 7 days (TTL enforced via DynamoDB + client checks).

### `rag-chatbot-documents`
- Authenticates the bearer token, lists S3 objects under `documents/{userId}/`, strips the random prefix from filenames for display, returns size + last modified metadata.

### `rag-chatbot-upload`
- Authenticates user, sanitises filename, uploads to S3 with a random prefix to avoid collisions.
- Starts a Kendra sync job (ignoring conflict errors). Returns S3 key + source URI + sync execution ID.

### `rag-chatbot-delete`
- Authenticates user, ensures the key lives under their prefix, deletes the object, and triggers a new Kendra sync.

### `rag-chatbot-chat`
- Authenticates user, restricts Kendra results to the caller’s prefix, respects optional `targetDocumentId` filter.
- Builds a prompt with retrieved excerpts + chat history.
- Attempts Claude 3 Sonnet first; gracefully falls back to Titan Text Express if Anthropic access is unavailable.

## REST Endpoints (API Gateway)

| Method | Path | Lambda | Auth | Description |
| --- | --- | --- | --- | --- |
| POST | `/register` | `rag-chatbot-auth` | None | Create user account. |
| POST | `/login` | `rag-chatbot-auth` | None | Authenticate user (returns token + user payload). |
| GET | `/documents` | `rag-chatbot-documents` | Bearer token | List user documents. |
| POST | `/upload` | `rag-chatbot-upload` | Bearer token | Upload document (Base64 JSON payload). |
| POST | `/delete` | `rag-chatbot-delete` | Bearer token | Delete document. |
| POST | `/chat` | `rag-chatbot-chat` | Bearer token | Run RAG chat (optional targeted doc). |

All endpoints expose CORS with `Access-Control-Allow-Headers: Content-Type,Authorization`.

## Deployment & Operations Checklist

1. **Frontend**
   - Update local files (`index.html`, `styles.css`, `script.js`).
   - Deploy via `aws s3 cp <file> s3://ai-rag-chatbot-g6/ --content-type ...`.
2. **Backend Packages**
   - Zip each handler (`Compress-Archive -Path <handler>.py -DestinationPath <handler>.zip -Force`).
   - `aws lambda update-function-code --function-name ... --zip-file fileb://...` for upload, delete, chat, documents, auth.
3. **Lambda Environment Variables**
   - Shared: `DOCUMENTS_BUCKET`, `KENDRA_INDEX_ID`, `KENDRA_DATA_SOURCE_ID` (upload/delete), `USERS_TABLE`, `SESSIONS_TABLE`.
   - Chat-specific: `BEDROCK_REGION`, `BEDROCK_MODEL_ID`, `BEDROCK_FALLBACK_MODEL_ID`.
4. **DynamoDB**
   - Tables: `rag-chatbot-users`, `rag-chatbot-sessions` (TTL enabled on `expiresAt`).
5. **IAM**
   - `RAGChatbotLambdaRole`: Inline `RAGChatbotDynamoDBPolicy` + existing policies (`AWSLambdaBasicExecutionRole`, `AmazonS3FullAccess`, `RAGChatbotKendraBedrockPolicy`).
   - `RAGChatbotKendraRole`: AmazonS3FullAccess, CloudWatchLogsFullAccess, inline Kendra document policy (`BatchPut/Delete/Get`).
6. **Kendra**
   - Ensure data source points to `documents/` prefix.
   - Monitor sync jobs with `aws kendra list-data-source-sync-jobs ...`.
7. **API Gateway**
   - Resources & methods (`/register`, `/login`, `/documents`, `/upload`, `/delete`, `/chat`).
   - Proxy integrations to respective Lambdas.
   - OPTIONS methods sent back with `Access-Control-Allow-Headers: Content-Type,Authorization`.
   - Deploy with `aws apigateway create-deployment --stage-name prod`.
8. **Bedrock Access**
   - Claude is the primary model. If the account lacks Anthropic access, the code automatically falls back to Titan; request access for best RAG quality.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| **401 Unauthorized** | Ensure frontend stored token, Authorization header present, session not expired (re-login). |
| **Upload fails** | File size >7.5 MB? Unsupported MIME type? Verify Lambda logs (`/aws/lambda/rag-chatbot-upload`). |
| **Chat returns generic answers** | Confirm Kendra sync completed (`Status: SUCCEEDED`) after upload. Validate document prefix matches user ID. |
| **Claude access error** | Bedrock may deny Anthropic models; fallback to Titan should work. Request Anthropic access if needed. |
| **Documents list empty** | Check `/documents` response; ensure user uploaded docs under their account (remember each account sees only its prefix). |

## Change Log

| Date (UTC) | Update |
| --- | --- |
| 2025-10-21 | Base deployment operational. Upload/chat Lambdas wired to Kendra + Bedrock; CORS enabled. |
| 2025-10-21 | Added document selector UI, delete route, automatic Kendra syncs, and richer prompts. |
| 2025-10-22 | Established this `PROJECT_IMPLEMENTATION.md` guide to centralize deployment steps and updates. |
| 2025-10-22 | Created `rag-chatbot-delete` Lambda & API route; frontend now focuses chat per document and removes S3 objects via backend. |
| 2025-10-22 | Added inline Kendra permissions (BatchPut/Delete/Get) to `RAGChatbotKendraRole` to fix sync failures. |
| 2025-10-22 | Updated `chat-handler.py` to normalize document references and filter Kendra results precisely. |
| 2025-10-22 | Switched Bedrock inference to Claude 3 Sonnet with automatic Titan fallback for accounts lacking Anthropic access. |
| 2025-10-22 | Implemented account system (register/login), DynamoDB-backed sessions, per-user document namespaces, secured uploads/deletes/chats, and `/documents` listing endpoint. |

## Quick Commands Reference

```powershell
# Update frontend assets
aws s3 cp index.html s3://ai-rag-chatbot-g6/ --content-type "text/html" --region us-east-2
aws s3 cp styles.css s3://ai-rag-chatbot-g6/ --content-type "text/css" --region us-east-2
aws s3 cp script.js s3://ai-rag-chatbot-g6/ --content-type "application/javascript" --region us-east-2

# Package & deploy Lambdas
Compress-Archive -Path chat-handler.py -DestinationPath chat-handler.zip -Force
aws lambda update-function-code --function-name rag-chatbot-chat --zip-file fileb://chat-handler.zip --region us-east-2

# Trigger Kendra sync manually
aws kendra start-data-source-sync-job `
  --id bd7c7753-9160-4804-96d6-cfcae9be8e5d `
  --index-id 28726c3c-71af-492b-b98d-89e2735fd7a7 `
  --region us-east-2

# Inspect sync status
aws kendra list-data-source-sync-jobs `
  --id bd7c7753-9160-4804-96d6-cfcae9be8e5d `
  --index-id 28726c3c-71af-492b-b98d-89e2735fd7a7 `
  --region us-east-2
```

Maintain this guide alongside the root `README.md`. Treat it as the authoritative change log and runbook for the deployed stack.
