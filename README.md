# AI-Powered RAG Chatbot

A modern, responsive web application for document upload and AI-powered chat interactions, built to work with AWS Cloud services including S3, API Gateway, Lambda, Kendra, and Bedrock.

## 🏗️ Architecture Overview

This application follows the architecture shown in the workflow diagram:

```
User → S3 Static Site → API Gateway → Lambda Function → [S3 + Kendra + Bedrock]
```

### Key Components:
- **Frontend**: S3 Static Site (HTML, CSS, JavaScript)
- **API Gateway**: Handles HTTP requests for uploads and chat
- **Lambda Function**: Central orchestrator for backend logic
- **S3 Bucket**: Stores uploaded documents
- **Amazon Kendra**: Indexes and retrieves document context
- **Amazon Bedrock**: Generates AI responses

## 🚀 Features

### Document Upload
- **Drag & Drop Interface**: Intuitive file upload with visual feedback
- **File Validation**: Supports PDF, DOC, DOCX files up to 10MB
- **Progress Tracking**: Real-time upload progress with status indicators
- **File Management**: View uploaded documents with status tracking

### AI Chat Interface
- **Real-time Chat**: Interactive chat interface with typing indicators
- **Context-Aware Responses**: AI responses based on uploaded documents
- **Chat History**: Persistent chat history with local storage
- **Message Management**: Clear chat and start new conversations

### User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern UI**: Clean, professional interface with smooth animations
- **Accessibility**: Keyboard navigation and screen reader friendly
- **Architecture Visualization**: Interactive modal showing system architecture

## 📁 Project Structure

```
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and responsive design
├── script.js           # JavaScript functionality
├── README.md           # Project documentation
└── AI-Powered RAG Chat Bot V 2.png  # Architecture diagram
```

## 🛠️ Setup Instructions

### 1. Deploy to AWS S3 (Static Website Hosting)

1. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://your-rag-chatbot-bucket
   ```

2. **Enable Static Website Hosting**:
   ```bash
   aws s3 website s3://your-rag-chatbot-bucket --index-document index.html --error-document index.html
   ```

3. **Upload Files**:
   ```bash
   aws s3 cp . s3://your-rag-chatbot-bucket --recursive --exclude "*.png" --exclude "*.docx" --exclude "*.pdf"
   ```

4. **Configure Bucket Policy** (for public access):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-rag-chatbot-bucket/*"
       }
     ]
   }
   ```

### 2. Configure API Gateway

1. **Create API Gateway REST API**
2. **Set up CORS** for your S3 static site domain
3. **Create Resources**:
   - `POST /upload` - For document uploads
   - `POST /chat` - For chat interactions

### 3. Update API Endpoint

In `script.js`, update the API_BASE_URL:

```javascript
const API_BASE_URL = 'https://your-api-gateway-url.amazonaws.com/prod';
```

### 4. Lambda Function Integration

Your Lambda function should handle:

**Upload Endpoint** (`/upload`):
- Receive multipart/form-data with file
- Store file in S3 bucket
- Trigger Kendra indexing
- Return success/error response

**Chat Endpoint** (`/chat`):
- Receive JSON with message and chat history
- Query Kendra for relevant document context
- Send query + context to Bedrock
- Return AI response

## 🎨 Customization

### Styling
- Modify `styles.css` to change colors, fonts, and layout
- Update CSS variables for consistent theming
- Adjust responsive breakpoints as needed

### Functionality
- Extend `script.js` for additional features
- Add new file types in the validation logic
- Implement additional chat features

### API Integration
- Update API endpoints in `script.js`
- Add authentication headers if required
- Implement error handling for different response codes

## 🔧 Development

### Local Development
1. Open `index.html` in a web browser
2. Use browser developer tools for debugging
3. Test file upload and chat functionality

### Testing
- Test with different file types and sizes
- Verify responsive design on various devices
- Test chat functionality and error handling

## 📱 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🔒 Security Considerations

- Implement proper CORS policies
- Add authentication for production use
- Validate file types and sizes on backend
- Sanitize user inputs
- Use HTTPS for all communications

## 🚀 Deployment Checklist

- [ ] S3 bucket created and configured
- [ ] Static website hosting enabled
- [ ] Files uploaded to S3
- [ ] API Gateway configured
- [ ] Lambda functions deployed
- [ ] Kendra index created
- [ ] Bedrock access configured
- [ ] API endpoint updated in frontend
- [ ] CORS policies configured
- [ ] Error handling tested

## 📞 Support

For issues or questions:
1. Check the browser console for JavaScript errors
2. Verify API Gateway logs for backend issues
3. Ensure all AWS services are properly configured
4. Test with different file types and sizes

## 📄 License

This project is part of an AWS Cloud Computing course assignment.

---

**Note**: This is a frontend implementation for the AI-Powered RAG Chatbot. The backend AWS services (Lambda, Kendra, Bedrock) need to be implemented separately according to the architecture diagram.
