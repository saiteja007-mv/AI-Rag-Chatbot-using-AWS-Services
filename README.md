# AI-Powered RAG Chatbot

A sophisticated Retrieval-Augmented Generation (RAG) chatbot built on AWS that allows users to upload documents and ask questions about their content using AI-powered responses.

## 🎯 Quick Demo

### Login Interface
![Login Page](Outputs/Login%20Page.png)

### Chat Interface with Document Upload
![Chatbot Output using PDFs](Outputs/Chatbot%20Output%20using%20PDFs.png)

## 🚀 Features

- **User Authentication**: Secure login and registration system with JWT tokens
- **Document Upload**: Support for PDF, DOC, and DOCX files with drag-and-drop interface
- **AI-Powered Q&A**: Ask questions about uploaded documents using Amazon Bedrock AI models
- **Real-time Chat**: Interactive chat interface with conversation history
- **Document Management**: View, delete, and manage uploaded documents
- **Responsive Design**: Clean, modern UI that works on all devices

## 🏗️ Architecture

The application uses a serverless architecture with the following AWS services:

- **Frontend**: Static website hosted on S3
- **API Gateway**: RESTful API endpoints
- **Lambda Functions**: Serverless compute for business logic
- **DynamoDB**: User authentication and session management
- **S3**: Document storage
- **Amazon Kendra**: Intelligent document search and indexing
- **Amazon Bedrock**: AI model inference (Claude 3.5 Sonnet & Titan)

## 📁 Project Structure

```
├── Frontend Files (Root)
│   ├── index.html          # Main application interface
│   ├── script.js           # Frontend JavaScript logic
│   └── styles.css          # Application styling
├── lambda-functions/       # Lambda function source code
│   ├── auth-handler.py     # User authentication (login/register)
│   ├── chat-handler.py     # AI chat processing
│   ├── upload-handler.py   # Document upload processing
│   ├── delete-handler.py   # Document deletion
│   ├── documents-handler.py # Document listing
│   └── *.zip              # Lambda deployment packages
├── config/                 # AWS configuration files
│   ├── bucket-policy.json  # S3 bucket permissions
│   ├── lambda-trust-policy.json # Lambda execution role
│   ├── lambda-permissions-policy.json # Lambda permissions
│   ├── s3-datasource-config.json # Kendra data source config
│   └── kendra-trust-policy.json # Kendra service role
├── docs/                   # Project documentation
│   ├── Teamwork Assessment.docx # Project documentation
│   └── Teamwork Assessment.pdf  # Project documentation
├── assets/                 # Project assets and images
│   ├── AI-Powered RAG Chat Bot V 2.png
│   └── AI-Powered RAG Chat Bot.png
├── Outputs/                # Application screenshots
│   ├── Login Page.png      # Login interface screenshot
│   └── Chatbot Output using PDFs.png # Chat interface screenshot
└── README.md              # Project documentation
```

## 🛠️ AWS Services Used

### Core Services

- **Amazon S3**: Static website hosting and document storage
- **Amazon API Gateway**: REST API endpoints
- **AWS Lambda**: Serverless compute functions
- **Amazon DynamoDB**: User data and session storage

### AI/ML Services

- **Amazon Kendra**: Intelligent document search and indexing
- **Amazon Bedrock**: AI model inference
  - Primary: Claude 3.5 Sonnet (anthropic.claude-3-5-sonnet-20240620-v1:0)
  - Fallback: Amazon Titan Text Express (amazon.titan-text-express-v1)

### Security & Access

- **IAM Roles**: Service-specific permissions
- **JWT Tokens**: Secure session management
- **CORS**: Cross-origin resource sharing

## 🔧 Setup Instructions

### Prerequisites

- AWS CLI configured with appropriate permissions
- Python 3.9+ for Lambda functions
- Node.js (optional, for local development)

### 1. Create AWS Resources

#### S3 Buckets

```bash
# Create web hosting bucket
aws s3 mb s3://rag-chatbot-web-1761415396 --region us-east-2

# Create documents bucket
aws s3 mb s3://rag-chatbot-docs-1761415396 --region us-east-2

# Apply bucket policies
aws s3api put-bucket-policy --bucket rag-chatbot-web-1761415396 --policy file://config/bucket-policy.json
```

#### DynamoDB Tables

```bash
# Users table
aws dynamodb create-table \
    --table-name rag-chatbot-users \
    --attribute-definitions AttributeName=email,AttributeType=S \
    --key-schema AttributeName=email,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-2

# Sessions table
aws dynamodb create-table \
    --table-name rag-chatbot-sessions \
    --attribute-definitions AttributeName=token,AttributeType=S \
    --key-schema AttributeName=token,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-2
```

#### IAM Roles

```bash
# Create Lambda execution role
aws iam create-role \
    --role-name rag-chatbot-lambda-role \
    --assume-role-policy-document file://config/lambda-trust-policy.json

# Attach permissions policy
aws iam put-role-policy \
    --role-name rag-chatbot-lambda-role \
    --policy-name LambdaPermissions \
    --policy-document file://config/lambda-permissions-policy.json
```

### 2. Deploy Lambda Functions

```bash
# Package and deploy each Lambda function
cd lambda-functions
zip auth-handler.zip auth-handler.py
aws lambda create-function \
    --function-name rag-chatbot-auth \
    --runtime python3.9 \
    --role arn:aws:iam::YOUR_ACCOUNT:role/rag-chatbot-lambda-role \
    --handler auth-handler.lambda_handler \
    --zip-file fileb://auth-handler.zip

# Repeat for other functions: chat-handler, upload-handler, delete-handler, documents-handler
cd ..
```

### 3. Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api \
    --name rag-chatbot-api \
    --description "RAG Chatbot API" \
    --region us-east-2

# Create resources and methods for each endpoint
# /register, /login, /chat, /upload, /delete, /documents
```

### 4. Setup Amazon Kendra

```bash
# Create Kendra index
aws kendra create-index \
    --name "RAG Chatbot Index" \
    --role-arn arn:aws:iam::YOUR_ACCOUNT:role/kendra-service-role \
    --region us-east-2

# Create S3 data source
aws kendra create-data-source \
    --index-id YOUR_INDEX_ID \
    --name "Documents Data Source" \
    --type S3 \
    --configuration file://config/s3-datasource-config.json \
    --role-arn arn:aws:iam::YOUR_ACCOUNT:role/kendra-service-role
```

### 5. Deploy Frontend

```bash
# Upload static files to S3
aws s3 cp index.html s3://rag-chatbot-web-1761415396/
aws s3 cp script.js s3://rag-chatbot-web-1761415396/
aws s3 cp styles.css s3://rag-chatbot-web-1761415396/

# Enable static website hosting
aws s3 website s3://rag-chatbot-web-1761415396 \
    --index-document index.html \
    --error-document index.html
```

## 🎯 Usage

### 1. Access the Application

Visit the S3 website URL: `http://rag-chatbot-web-1761415396.s3-website.us-east-2.amazonaws.com`

### 2. User Registration/Login

![Login Page](Outputs/Login%20Page.png)

- Create a new account or sign in with existing credentials
- Secure authentication with JWT tokens
- Clean, intuitive interface for user management

### 3. Upload Documents

- Drag and drop PDF, DOC, or DOCX files
- Files are automatically indexed by Amazon Kendra
- Maximum file size: 5MB
- Real-time upload progress indication

### 4. Chat with Documents

![Chatbot Output using PDFs](Outputs/Chatbot%20Output%20using%20PDFs.png)

- Ask questions about your uploaded documents
- AI responses are generated using Amazon Bedrock
- Conversation history is maintained during the session
- Interactive chat interface with document management panel

## 📸 Screenshots

### Login Page
![Login Page](Outputs/Login%20Page.png)
*Clean, modern login interface with registration option*

### Chat Interface
![Chatbot Output using PDFs](Outputs/Chatbot%20Output%20using%20PDFs.png)
*Interactive chat interface showing document upload and AI responses*

### Application Features Showcase

The screenshots above demonstrate the key features of the RAG chatbot:

**Login Page Features:**
- User-friendly authentication interface
- Registration and login forms
- Clean, modern design with black and white theme
- Responsive layout

**Chat Interface Features:**
- Document upload area with drag-and-drop functionality
- Real-time chat with AI responses
- Document management panel
- User session information
- Interactive Q&A based on uploaded documents

## 🔒 Security Features

- **Password Hashing**: PBKDF2 with 120,000 iterations
- **JWT Tokens**: Secure session management with expiration
- **User Isolation**: Documents are stored per user with access controls
- **CORS Protection**: Configured for secure cross-origin requests
- **Input Validation**: File type and size validation

## 🚀 Performance Optimizations

- **Serverless Architecture**: Auto-scaling Lambda functions
- **Intelligent Caching**: Kendra indexing for fast document search
- **Fallback Models**: Primary and backup AI models for reliability
- **Efficient Storage**: S3 for scalable document storage

## 📊 API Endpoints

| Endpoint       | Method | Description         |
| -------------- | ------ | ------------------- |
| `/register`  | POST   | User registration   |
| `/login`     | POST   | User authentication |
| `/chat`      | POST   | AI chat processing  |
| `/upload`    | POST   | Document upload     |
| `/delete`    | POST   | Document deletion   |
| `/documents` | GET    | List user documents |

## 🔧 Configuration

### Environment Variables

- `BEDROCK_REGION`: AWS region for Bedrock (us-east-1)
- `DOCUMENTS_BUCKET`: S3 bucket for document storage
- `KENDRA_INDEX_ID`: Amazon Kendra index identifier
- `KENDRA_DATA_SOURCE_ID`: Kendra data source identifier

### Supported File Types

- PDF (.pdf)
- Microsoft Word (.doc, .docx)
- Maximum file size: 5MB

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure API Gateway CORS is properly configured
2. **Authentication Failures**: Check DynamoDB table permissions
3. **File Upload Issues**: Verify S3 bucket permissions and Lambda timeout
4. **AI Response Errors**: Check Bedrock model access and Kendra indexing

### Debug Steps

1. Check CloudWatch logs for Lambda functions
2. Verify IAM role permissions
3. Test API endpoints individually
4. Ensure Kendra index is properly configured

## 📈 Future Enhancements

- [ ] Support for additional file formats (TXT, RTF)
- [ ] Real-time document processing status
- [ ] Advanced search filters
- [ ] Document sharing capabilities
- [ ] Multi-language support
- [ ] Analytics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

This project was developed as part of the Cloud Computing course at the University of Central Missouri.

---

**Note**: This is a demonstration project showcasing AWS serverless architecture and AI integration. Ensure proper security measures are implemented for production use.
