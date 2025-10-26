# 🤖 RAG Chatbot - AI-Powered Document Q&A

> **An intelligent chatbot built on AWS that leverages Retrieval-Augmented Generation (RAG) to answer questions about your documents with precision and context awareness.**

![AWS](https://img.shields.io/badge/AWS-Cloud%20Native-FF9900?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.9-3776AB?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)

## 📋 Table of Contents

- [🎯 Quick Demo](#-quick-demo)
- [🚀 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [📁 Project Structure](#-project-structure)
- [🛠️ AWS Services Used](#️-aws-services-used)
- [🔧 Setup Instructions](#-setup-instructions)
- [🎯 Usage](#-usage)
- [📸 Screenshots](#-screenshots)
- [🔒 Security Features](#-security-features)
- [🚀 Performance Optimizations](#-performance-optimizations)
- [📊 API Endpoints](#-api-endpoints)
- [🔧 Configuration](#-configuration)
- [🐛 Troubleshooting](#-troubleshooting)
- [📈 Future Enhancements](#-future-enhancements)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👥 Team](#-team)

## 🎯 Quick Demo

### Login Interface
![Login Page](Outputs/Login%20Page.png)

### Chat Interface with Document Upload
![Chatbot Output using PDFs](Outputs/Chatbot%20Output%20using%20PDFs.png)

## ✨ Features

### 🔐 **Authentication & Security**
- Secure user registration and login system
- PBKDF2-HMAC-SHA256 password hashing (120,000 iterations)
- Session-based authentication with 7-day token validity
- User data isolation and privacy protection

### 📄 **Document Management**
- Upload PDF and Word documents (max 5MB each)
- Automatic document indexing with Amazon Kendra
- View and delete documents easily
- Per-user document isolation

### 💬 **Intelligent Chat Interface**
- Ask questions about your uploaded documents
- AI-powered responses using Claude 3.5 Sonnet
- Multi-turn conversation support
- Chat history and sessions management

### 💾 **Chat Sessions**
- Create and manage multiple chat sessions
- Persistent chat history
- Switch between previous conversations
- Delete old sessions

### 📱 **Responsive Design**
- Desktop, tablet, and mobile optimized
- Minimal black & white aesthetic
- Smooth user experience across all devices
- Touch-friendly interface

## 🏗️ Architecture

The application uses a serverless architecture with the following AWS services:

### System Workflow
![AI-Powered RAG Chat Bot V 2](assets/AI-Powered%20RAG%20Chat%20Bot%20V%202.png)
*Complete system workflow showing all AWS services and their interactions*

### Core Components:

- **Frontend**: Static website hosted on S3
- **API Gateway**: RESTful API endpoints
- **Lambda Functions**: Serverless compute for business logic
- **DynamoDB**: User authentication and session management
- **S3**: Document storage
- **Amazon Kendra**: Intelligent document search and indexing
- **Amazon Bedrock**: AI model inference (Claude 3.5 Sonnet & Titan)

### Architecture Flow:

1. **User Authentication**: Users register/login through the frontend, authenticated via Lambda functions and stored in DynamoDB
2. **Document Upload**: Files are uploaded to S3 and automatically indexed by Amazon Kendra
3. **AI Processing**: User queries are processed through Kendra search, then enhanced with AI responses via Amazon Bedrock
4. **Response Delivery**: AI-generated responses are returned through the API Gateway to the frontend

The architecture diagram above shows the complete workflow, demonstrating how each AWS service works together to create a seamless RAG chatbot experience.

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

## 🚀 Quick Start Guide

### Prerequisites

- AWS Account with appropriate permissions
- Modern web browser (Chrome, Safari, Firefox, Edge)
- Internet connection

### Step 1: Access the Application

Simply visit the deployed website:
```
http://rag-chatbot-web-1761415396.s3-website.us-east-2.amazonaws.com
```

No installation or setup required! The application is already deployed and ready to use.

### Step 2: Create an Account

1. Click **"Register"** on the login page
2. Enter your name, email, and password
3. Click **"Create Account"**
4. You'll be automatically logged in

### Step 3: Upload Documents

1. **Drag & Drop**: Drag PDF or Word files into the upload area
2. **Or Click**: Click the upload area to select files from your computer
3. **Supported Formats**:
   - PDF (.pdf)
   - Microsoft Word (.doc, .docx)
4. **Maximum Size**: 5MB per file
5. **Wait**: Kendra will index the document (2-10 minutes)

### Step 4: Start Chatting

1. Type your question in the chat input box
2. Press **Enter** or click **Send**
3. The AI will search your documents and provide an answer
4. Continue the conversation as needed

### Step 5: Manage Chat Sessions

1. **New Chat**: Click **"+ New"** to start a fresh conversation
2. **View Previous**: Click any session in the "Chat Sessions" panel
3. **Delete Session**: Click **"Delete"** next to a session you don't need

---

## 📁 Project Resources

### Cloud Infrastructure

The application is built on AWS with the following services:

| Service | Purpose | Status |
|---------|---------|--------|
| **S3** | Website hosting & document storage | ✅ Active |
| **Lambda** | API processing (5 functions) | ✅ Active |
| **DynamoDB** | User & session data | ✅ Active |
| **Kendra** | Document search & indexing | ✅ Active |
| **Bedrock** | Claude AI responses | ✅ Active |
| **API Gateway** | REST API endpoints | ✅ Active |

### Current Deployment

- **Website URL**: http://rag-chatbot-web-1761415396.s3-website.us-east-2.amazonaws.com
- **Region**: US East 2
- **API Endpoints**: 6 (Register, Login, Upload, Chat, Documents, Delete)
- **Storage**: Unlimited (AWS managed)

## 🎯 Usage Guide

### 1. Register or Login

![Login Page](Outputs/Login%20Page.png)

**For New Users:**
- Click "Create Account"
- Enter your name, email, and password
- Click "Create Account"

**For Existing Users:**
- Enter your email and password
- Click "Sign In"

Features:
- ✅ Secure authentication with encrypted passwords
- ✅ Session expires after 7 days
- ✅ Auto-logout for security
- ✅ Easy account management

### 2. Upload Your Documents

- **Drag & Drop**: Simply drag files into the upload area
- **Click to Browse**: Click the dashed box to select files
- **Supported Formats**: PDF, DOC, DOCX
- **File Size**: Maximum 5MB per document
- **Indexing**: Documents are indexed automatically (2-10 minutes)

The Documents panel shows:
- Document name
- File size
- Delete button for each document
- Upload progress bar

### 3. Chat with Your Documents

![Chatbot Output using PDFs](Outputs/Chatbot%20Output%20using%20PDFs.png)

**How to Chat:**
1. Type your question in the chat input box
2. Press Enter or click Send
3. AI searches your documents for relevant information
4. Response appears in the chat window

**Features:**
- ✅ AI-powered responses using Claude 3.5 Sonnet
- ✅ Multi-turn conversations
- ✅ Real-time chat updates
- ✅ Scroll through chat history
- ✅ Copy and share responses

### 4. Manage Chat Sessions

**View Previous Conversations:**
- Click any session in the "Chat Sessions" panel
- Your entire conversation history loads
- Switch between sessions easily

**Start New Chat:**
- Click "+ New" button
- All messages are saved automatically
- Create organized conversations

**Delete Sessions:**
- Click "Delete" button next to any session
- Confirmation prompt appears
- Deleted sessions cannot be recovered

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

### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/register` | POST | Create new user account |
| `/login` | POST | Authenticate user |

### Documents
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/upload` | POST | Upload document to S3 |
| `/documents` | GET | List all user documents |
| `/delete` | POST | Delete document |

### Chat
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chat` | POST | Send message & get AI response |

### Request/Response Examples

**POST /chat**
```json
{
  "message": "What is the main topic?",
  "chatHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ]
}

Response:
{
  "response": "The document discusses..."
}
```

**POST /upload**
```json
{
  "fileName": "report.pdf",
  "fileContent": "base64encodedcontent...",
  "fileType": "application/pdf"
}

Response:
{
  "fileId": "documents/user123/abc123-report.pdf"
}
```

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

## 🐛 Troubleshooting Guide

### Common Issues & Solutions

#### ❌ "Login Failed" Error
**Problem**: Cannot log in to your account
- **Solution 1**: Check if email and password are correct
- **Solution 2**: Try registering a new account
- **Solution 3**: Clear browser cookies and try again
- **Solution 4**: Try a different browser

#### ❌ Document Upload Fails
**Problem**: Getting error when trying to upload files
- **Check**: File size is less than 5MB
- **Check**: File format is PDF, DOC, or DOCX
- **Check**: Internet connection is stable
- **Wait**: Try again after 1 minute

#### ❌ Document Not Appearing in Chat
**Problem**: Uploaded document but AI can't find it
- **Wait**: Kendra needs 2-10 minutes to index the document
- **Check**: Document appears in "Documents" panel
- **Refresh**: Close and reopen the browser
- **Ask**: Try asking a different question

#### ❌ Chat Not Responding
**Problem**: Send message but no response from AI
- **Wait**: AI response takes 2-5 seconds
- **Refresh**: Reload the page
- **Check**: Internet connection is working
- **Try**: Ask a simpler question

#### ❌ Session Expired
**Problem**: Logged out suddenly or session invalid
- **Normal**: Sessions expire after 7 days of inactivity
- **Solution**: Log in again with your credentials
- **Prevent**: Check "Remember me" (if available)

#### ❌ Cannot Delete Document
**Problem**: Delete button not working
- **Check**: Make sure you own the document
- **Wait**: Try again after 30 seconds
- **Refresh**: Reload the page first

---

## ✅ How to Get Help

**Check These First:**
1. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cookies
3. Try a different browser
4. Check your internet connection
5. Wait 5 minutes and try again

**Still Having Issues?**
- 📧 Email: saiteja@student.ucmo.edu
- 💬 Create an issue on GitHub
- 📞 Check the documentation for more details

---

## 📱 Browser Compatibility

| Browser | Status | Version |
|---------|--------|---------|
| Chrome | ✅ Fully Supported | Latest |
| Safari | ✅ Fully Supported | Latest |
| Firefox | ✅ Fully Supported | Latest |
| Edge | ✅ Fully Supported | Latest |
| Opera | ✅ Supported | Latest |
| IE 11 | ❌ Not Supported | - |

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

**Developer**: Sai Teja
**Institution**: University of Central Missouri
**Course**: Intro to Cloud Computing (Fall 2025)
**Contact**: saiteja@student.ucmo.edu

---

## 🎓 Learning Outcomes

This project demonstrates:
- ✅ Serverless architecture design
- ✅ AWS service integration
- ✅ AI/ML model integration
- ✅ RESTful API development
- ✅ Responsive web design
- ✅ Cloud-native security practices
- ✅ Document indexing and search
- ✅ Authentication & authorization

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| Page Load Time | < 2 seconds |
| Chat Response Time | 2-5 seconds |
| Document Upload | < 10 seconds |
| Kendra Indexing | 2-10 minutes |
| Session Expiry | 7 days |

---

## 🔗 Quick Links

- 📚 **[Documentation](docs/)** - Full project documentation
- 📸 **[Screenshots](Outputs/)** - UI/UX demonstrations
- 🏗️ **[Architecture Diagram](assets/)** - System architecture
- 🐛 **[Issue Tracker](../../issues)** - Report bugs
- 💬 **[Discussions](../../discussions)** - Ask questions

---

## 📝 Notes

**⚠️ Important**: This is a demonstration project showcasing AWS serverless architecture and AI integration. For production use, ensure:
- Enhanced security measures
- Data encryption at rest and in transit
- Comprehensive error handling
- Rate limiting and DDoS protection
- Compliance with data protection regulations

---

<div align="center">

### 🌟 If you find this project helpful, please consider giving it a star! ⭐

**Built with ❤️ on AWS Cloud**

```
  ┌─────────────────────────────────────┐
  │  RAG Chatbot - AI Document Q&A      │
  │  Powered by AWS & Claude AI         │
  └─────────────────────────────────────┘
```

[Live Demo](#) • [Documentation](#) • [GitHub](#) • [Contact](#)

</div>

---

**Last Updated**: October 2025
**Version**: 2.0
**Status**: Active Development
