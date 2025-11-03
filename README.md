# 🤖 AWS RAG Chatbot Project

**A Retrieval-Augmented Generation (RAG) chatbot built on AWS that allows users to upload documents and ask questions about them using AI.**

[![AWS](https://img.shields.io/badge/AWS-Cloud-orange)](https://aws.amazon.com/)
[![Lambda](https://img.shields.io/badge/AWS-Lambda-orange)](https://aws.amazon.com/lambda/)
[![API Gateway](https://img.shields.io/badge/AWS-API%20Gateway-orange)](https://aws.amazon.com/api-gateway/)
[![S3](https://img.shields.io/badge/AWS-S3-orange)](https://aws.amazon.com/s3/)
[![DynamoDB](https://img.shields.io/badge/AWS-DynamoDB-orange)](https://aws.amazon.com/dynamodb/)
[![Bedrock](https://img.shields.io/badge/AWS-Bedrock-purple)](https://aws.amazon.com/bedrock/)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://www.python.org/)

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Architecture Diagram](#-architecture-diagram)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Features](#-features)
- [API Endpoints](#-api-endpoints)
- [Data Flow](#-data-flow)
- [Technology Stack](#-technology-stack)
- [Security](#-security)
- [Limitations](#-limitations)
- [License](#-license)

---

## 🎯 Project Overview

This chatbot uses **Amazon Bedrock** (Claude 3.5 Sonnet) for AI inference, **DynamoDB** for vector storage and user management, and **S3** for document storage to provide intelligent answers based on uploaded documents.

The system implements a **RAG (Retrieval-Augmented Generation)** architecture where:

- 📄 Documents are processed and converted into vector embeddings
- 🔍 User queries are matched against document embeddings using in-memory cosine similarity search
- 📚 Relevant document context is retrieved and provided to the AI model
- 💬 The AI generates contextual answers based on the retrieved information

---

## 🏗️ Architecture

The application follows a **serverless architecture**:

### Frontend Layer
- 🌐 Static website hosted on S3
- 🎨 User interface for authentication, document upload, and chat

### API Layer
- 🚪 API Gateway routes requests to Lambda functions
- 🌍 CORS enabled for cross-origin requests

### Backend Layer
- ⚡ Lambda function handles all business logic
- 💾 DynamoDB stores user credentials (`rag-chatbot-users` table)
- 📦 DynamoDB stores document chunks with embeddings (`rag-docs` table)
- 📁 S3 stores original uploaded documents
- 🤖 Bedrock provides AI model inference (Claude 3.5 Sonnet and Titan Embeddings)
- 🔢 NumPy Lambda Layer enables vector calculations for cosine similarity

### Authentication
- 🔐 JWT tokens for user authentication
- 🛡️ IAM roles for AWS service access

### Vector Search Process
1. 👤 User submits query → Lambda generates query embedding (Bedrock Titan)
2. 🔍 Lambda queries DynamoDB (`rag-docs` table) via `userId-index` GSI
3. 📊 Lambda calculates cosine similarity in-memory using NumPy for all user's chunks
4. 📈 Lambda sorts by similarity and returns top 5 matches
5. 🚀 Lambda sends context to Claude 3.5 Sonnet
6. ✨ AI response returned to user

---

## 📊 Architecture Diagram

![Workflow Diagram V3](frontend/assets/Ai%20Powered%20RAG%20Chatbot%20V%203.png)

*Architecture workflow diagram showing the complete system flow from user interaction to AI response.*

---

## 📁 Project Structure

```
AWS Project/
├── frontend/                      # Frontend web application
│   ├── index.html                # Main HTML interface
│   ├── styles.css                # Styling and layout
│   ├── script.js                 # Client-side logic and API calls
│   └── assets/                   # Images and icons
│       ├── Fav_icon_chatbot.png
│       └── AI-Powered RAG Chat Bot V 3.png  # Workflow diagram
│
├── backend/                       # Backend services
│   ├── lambda/                   # Lambda function code
│   │   ├── lambda_function.py   # Main handler with all endpoints
│   │   ├── requirements.txt     # Python dependencies
│   │   └── lambda-package/      # Packaged dependencies
│   └── policies/                 # IAM policies
│       ├── trust-policy.json    # Lambda execution role trust
│       ├── lambda-policy.json   # Lambda permissions
│       └── bucket-policy.json   # S3 bucket policy
│
├── scripts/                       # Utility scripts
│   └── update-opensearch-access-policy.py  # Legacy OpenSearch config
│
├── docs/                          # Documentation
│   ├── PROJECT_SUMMARY.md       # Detailed project overview
│   ├── DEPLOYMENT.md            # Deployment guide
│   ├── RESOURCES.md             # AWS resources documentation
│   └── ACCESS_INFO.md           # Access credentials
│
└── Outputs/                       # Screenshots and output files
    ├── Login Page.png
    └── Chatbot Output using PDFs.png
```

---

## 📸 Screenshots

### Login Page
![Login Page](outputs/Login%20page.png)

*User authentication interface showing the login form for accessing the chatbot.*

### Chatbot Output
![Chatbot Output using PDFs](outputs/Chat_Interface%20with%20Chat.png)

*Example of the chatbot interface showing a conversation with AI responses based on uploaded PDF documents.*

---

## ✨ Features

### 🔐 User Authentication
- **Registration**: Users can create accounts with email and password
- **Login**: Secure authentication using JWT tokens
- **Session Management**: Tokens expire after 7 days

### 📄 Document Management
- **Upload**: Supports PDF and DOCX file formats
- **Processing**: Documents are automatically chunked and embedded
- **Storage**: Files stored in S3 with user-specific organization
- **Indexing**: Document chunks stored in DynamoDB (`rag-docs` table) with vector embeddings
- **View**: Users can view their uploaded documents
- **Delete**: Users can delete their documents (removes from both S3 and DynamoDB)

### 💬 AI Chat
- **Query Processing**: User questions are converted to embeddings using Titan Embeddings V2
- **Semantic Search**: Finds most relevant document chunks using in-memory cosine similarity
- **Context Retrieval**: Retrieves top 5 most relevant document segments
- **Answer Generation**: Claude 3.5 Sonnet generates answers based on retrieved context
- **Chat History**: Maintains conversation context

---

## 🔌 API Endpoints

### `POST /register`
**Description:** Register a new user account

**Input:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

**Output:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user-uuid",
    "name": "User Name",
    "email": "user@example.com"
  },
  "expiresAt": "2025-11-08T20:00:00"
}
```

---

### `POST /login`
**Description:** Authenticate user and receive JWT token

**Input:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Output:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user-uuid",
    "name": "User Name",
    "email": "user@example.com"
  },
  "expiresAt": "2025-11-08T20:00:00"
}
```

---

### `POST /upload`
**Description:** Upload and process a document

**Authentication:** Required (Bearer token)

**Input:**
```json
{
  "fileName": "document.pdf",
  "fileContent": "base64_encoded_file_content",
  "fileType": "application/pdf"
}
```

**Output:**
```json
{
  "message": "File uploaded successfully",
  "fileId": "user-uuid/document-uuid_document.pdf",
  "chunks": 15
}
```

---

### `GET /documents`
**Description:** List all documents for the authenticated user

**Authentication:** Required (Bearer token)

**Input:** None (uses authentication token)

**Output:**
```json
{
  "documents": [
    {
      "s3Key": "user-uuid/document-uuid_document.pdf",
      "name": "document.pdf",
      "size": 245760,
      "sizeReadable": "240.00 KB",
      "uploadDate": "2025-11-01T20:00:00"
    }
  ]
}
```

---

### `POST /delete`
**Description:** Delete a document and its associated chunks

**Authentication:** Required (Bearer token)

**Input:**
```json
{
  "fileKey": "user-uuid/document-uuid_document.pdf"
}
```

**Output:**
```json
{
  "message": "File deleted successfully"
}
```

---

### `POST /chat`
**Description:** Send a chat message and receive AI response based on uploaded documents

**Authentication:** Required (Bearer token)

**Input:**
```json
{
  "message": "What is lecture 3 about?",
  "chatHistory": []
}
```

**Output:**
```json
{
  "response": "Lecture 3 covers the fundamentals of...",
  "sourcesCount": 5
}
```

---

## 🔄 Data Flow

### Document Upload Flow
1. 👤 User uploads document through frontend
2. 📤 File is base64 encoded and sent to `/upload` endpoint
3. ⚡ Lambda function:
   - ✅ Validates authentication
   - 🔓 Decodes file content
   - 📤 Uploads to S3 with user-specific path
   - 📄 Extracts text from PDF/DOCX
   - ✂️ Splits text into chunks (~500 words each)
   - 🔢 Generates embeddings for each chunk using Titan Embeddings V2
   - 💾 Stores chunks in DynamoDB (`rag-docs` table) with embeddings
4. ✅ Returns success confirmation with chunk count

### Chat Query Flow
1. 👤 User submits question through frontend
2. 📤 Query sent to `/chat` endpoint
3. ⚡ Lambda function:
   - ✅ Validates authentication
   - 🔢 Converts query to embedding using Titan Embeddings V2
   - 🔍 Queries DynamoDB (`rag-docs` table) using `userId-index` GSI to get all user's chunks
   - 📊 Calculates cosine similarity in-memory using NumPy for all chunks
   - 📈 Sorts by similarity score and selects top 5 matches
   - 📚 Builds context from retrieved chunks
   - 🤖 Sends query and context to Claude 3.5 Sonnet
   - ✨ Returns AI-generated response
4. 💬 Response displayed to user

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | AWS Lambda (Python 3.11) |
| **AI Model** | Amazon Bedrock |
|  | • Claude 3.5 Sonnet (text generation) |
|  | • Titan Embeddings V2 (vector embeddings, 1024 dimensions) |
| **Vector Storage** | Amazon DynamoDB (`rag-docs` table) |
| **Vector Search** | In-memory cosine similarity using NumPy (Lambda Layer) |
| **Database** | Amazon DynamoDB (`rag-chatbot-users` table) |
| **Storage** | Amazon S3 (document storage and website hosting) |
| **API** | Amazon API Gateway (REST API) |
| **Authentication** | JWT tokens |

---

## 🔒 Security

- 🔐 User passwords are hashed using SHA256
- 🎫 JWT tokens expire after 7 days
- 🔒 API endpoints require authentication (except register/login)
- 🔐 S3 documents bucket is private
- 🛡️ DynamoDB uses IAM roles for access control
- ✅ IAM roles enforce least privilege access
- 🌍 CORS configured for API Gateway

---

## ⚠️ Limitations

- 📏 Maximum file size: ~5MB (practical limit)
- 📄 Supported formats: PDF and DOCX only
- 🔢 Embedding dimension: 1024 (Titan V2)
- ✂️ Chunk size: ~500 words per chunk
- 🔍 Search results: Top 5 most relevant chunks
- ⏰ Token expiration: 7 days
- ⚡ **In-memory search**: Performance depends on number of chunks per user (scales well for typical use cases)

---

## 📝 License

This project is for educational purposes.

---

