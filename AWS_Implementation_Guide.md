# AWS Implementation Guide: AI-Powered RAG Chatbot

This comprehensive guide will walk you through implementing your AI-Powered RAG Chatbot on AWS, from static site deployment to full backend integration.

## 📋 Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js and npm installed (for local testing)
- Basic understanding of AWS services

## 🖥️ Windows Users Note

If you're using Windows Command Prompt or PowerShell, some commands may need to be adjusted:

1. **Command Substitution**: Use `$env:VARIABLE` in PowerShell or set variables manually
2. **File Creation**: Use `echo` instead of `cat` for creating files
3. **Path Separators**: Use forward slashes `/` in AWS CLI commands

**Example for Windows PowerShell:**
```powershell
# Instead of: $(aws sts get-caller-identity --query Account --output text)
# Use: 
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
echo "Account ID: $ACCOUNT_ID"
```

## 🏗️ Architecture Overview

```
User → S3 Static Site → API Gateway → Lambda → [S3 + Kendra + Bedrock]
```

**Services Used:**

- **S3**: Static website hosting + document storage
- **API Gateway**: HTTP API management
- **Lambda**: Serverless compute functions
- **Amazon Kendra**: Document indexing and search
- **Amazon Bedrock**: AI response generation
- **IAM**: Permissions and roles

---

## Step 1: Prepare Your Static Site

### 1.1 Update API Endpoint

First, update your JavaScript to use a placeholder API endpoint that we'll configure later.

**File: `script.js`**

```javascript
// Update this line in script.js
const API_BASE_URL = 'https://YOUR_API_GATEWAY_URL.execute-api.REGION.amazonaws.com/prod';
```

### 1.2 Test Locally

```bash
# Open index.html in your browser to test functionality
# Ensure all features work before deployment
```

---

## Step 2: Create S3 Bucket for Static Website

### 2.1 Create S3 Bucket

```bash
# Replace 'your-rag-chatbot-bucket' with your unique bucket name
aws s3 mb s3://your-rag-chatbot-bucket

# Enable versioning (optional but recommended)
aws s3api put-bucket-versioning --bucket your-rag-chatbot-bucket --versioning-configuration Status=Enabled
```

### 2.2 Configure Static Website Hosting

```bash
# Create website configuration
cat > website-config.json << EOF
{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}
EOF

# Apply website configuration
aws s3api put-bucket-website --bucket your-rag-chatbot-bucket --website-configuration file://website-config.json
```

### 2.3 Upload Static Files

```bash
# Upload your website files
aws s3 cp index.html s3://your-rag-chatbot-bucket/
aws s3 cp styles.css s3://your-rag-chatbot-bucket/
aws s3 cp script.js s3://your-rag-chatbot-bucket/

# Set proper content types
aws s3 cp index.html s3://your-rag-chatbot-bucket/ --content-type "text/html"
aws s3 cp styles.css s3://your-rag-chatbot-bucket/ --content-type "text/css"
aws s3 cp script.js s3://your-rag-chatbot-bucket/ --content-type "application/javascript"
```

### 2.4 Configure Bucket Policy for Public Access

```bash
# Create bucket policy
cat > bucket-policy.json << EOF
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
EOF

# Apply bucket policy
aws s3api put-bucket-policy --bucket your-rag-chatbot-bucket --policy file://bucket-policy.json
```

### 2.5 Get Website URL

```bash
# Get your website URL
echo "Your website is available at:"
echo "http://your-rag-chatbot-bucket.s3-website-REGION.amazonaws.com"
```

---

## Step 3: Create S3 Bucket for Document Storage

### 3.1 Create Document Storage Bucket

```bash
# Create bucket for storing uploaded documents
aws s3 mb s3://your-rag-chatbot-documents

# Enable versioning for document storage
aws s3api put-bucket-versioning --bucket your-rag-chatbot-documents --versioning-configuration Status=Enabled
```

---

## Step 4: Set Up IAM Roles and Policies

### 4.1 Create Lambda Execution Role

```bash
# Create trust policy for Lambda
cat > lambda-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create Lambda execution role
aws iam create-role --role-name RAGChatbotLambdaRole --assume-role-policy-document file://lambda-trust-policy.json
```

### 4.1.1 Create Kendra Service Role (Required for Kendra Index)

**Important**: Kendra requires a separate service role that trusts `kendra.amazonaws.com`. This is different from the Lambda role.

```bash
# Create trust policy for Kendra service
cat > kendra-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "kendra.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create Kendra service role
aws iam create-role --role-name RAGChatbotKendraRole --assume-role-policy-document file://kendra-trust-policy.json
```

### 4.2 Attach Basic Lambda Policies

```bash
# Attach basic execution policy
aws iam attach-role-policy --role-name RAGChatbotLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Attach S3 full access policy
aws iam attach-role-policy --role-name RAGChatbotLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

### 4.2.1 Attach Policies to Kendra Role

```bash
# Attach S3 full access policy to Kendra role (needed for document access)
aws iam attach-role-policy --role-name RAGChatbotKendraRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Attach CloudWatch Logs policy to Kendra role
aws iam attach-role-policy --role-name RAGChatbotKendraRole --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

### 4.3 Create Custom Policy for Kendra and Bedrock

```bash
# Create custom policy for Kendra and Bedrock access
cat > kendra-bedrock-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "kendra:Query",
                "kendra:Index",
                "kendra:DescribeIndex",
                "kendra:ListDataSources",
                "kendra:StartDataSourceSyncJob",
                "kendra:StopDataSourceSyncJob",
                "kendra:DescribeDataSourceSyncJob"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Create and attach the policy
aws iam create-policy --policy-name RAGChatbotKendraBedrockPolicy --policy-document file://kendra-bedrock-policy.json

# Get your account ID first (Windows compatible)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"

# Attach the policy using the account ID variable
aws iam attach-role-policy --role-name RAGChatbotLambdaRole --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/RAGChatbotKendraBedrockPolicy"
```

---

## Step 5: Create Amazon Kendra Index

### 5.1 Create Kendra Index

```bash
# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"

# Create Kendra index using the Kendra service role
aws kendra create-index \
    --name "RAG-Chatbot-Index" \
    --description "Index for RAG Chatbot documents" \
    --role-arn "arn:aws:iam::$ACCOUNT_ID:role/RAGChatbotKendraRole" \
    --edition "DEVELOPER_EDITION" \
    --region us-east-2
```

**Note:** Save the Index ID from the response - you'll need it later.

**Important**: Make sure you're using the `RAGChatbotKendraRole` (not the Lambda role) for the Kendra index creation.

### 5.2 Create S3 Data Source

```bash
# Replace INDEX_ID with your actual index ID from step 5.1
INDEX_ID="your-index-id-here"

# Create S3 data source configuration
cat > s3-datasource-config.json << EOF
{
    "S3Configuration": {
        "BucketName": "your-rag-chatbot-documents",
        "DocumentsMetadataConfiguration": {
            "S3Prefix": "documents/"
        },
        "AccessControlListConfiguration": {
            "KeyPath": "s3://your-rag-chatbot-documents/access-control-list.json"
        }
    }
}
EOF

# Create the data source using the Kendra service role
aws kendra create-data-source \
    --index-id $INDEX_ID \
    --name "S3-Documents" \
    --type "S3" \
    --configuration file://s3-datasource-config.json \
    --role-arn "arn:aws:iam::$ACCOUNT_ID:role/RAGChatbotKendraRole" \
    --region us-east-2
```

---

## Step 6: Create Lambda Functions

### 6.1 Create Upload Handler Lambda

```bash
# Create upload handler function
cat > upload-handler.py << 'EOF'
import json
import boto3
import os
from urllib.parse import unquote_plus

s3_client = boto3.client('s3')
kendra_client = boto3.client('kendra')

def lambda_handler(event, context):
    try:
        # Parse the request
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event
          
        # Get file information
        file_name = body.get('fileName')
        file_content = body.get('fileContent')  # Base64 encoded
        file_type = body.get('fileType')
      
        if not all([file_name, file_content, file_type]):
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'Missing required fields'})
            }
      
        # Decode and upload to S3
        import base64
        file_data = base64.b64decode(file_content)
      
        s3_key = f"documents/{file_name}"
        s3_client.put_object(
            Bucket=os.environ['DOCUMENTS_BUCKET'],
            Key=s3_key,
            Body=file_data,
            ContentType=file_type
        )
      
        # Trigger Kendra sync (optional - can be done manually)
        # kendra_client.start_data_source_sync_job(
        #     IndexId=os.environ['KENDRA_INDEX_ID'],
        #     Id=os.environ['KENDRA_DATA_SOURCE_ID']
        # )
      
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'message': 'File uploaded successfully',
                'fileId': s3_key
            })
        }
      
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
EOF

# Create deployment package
zip upload-handler.zip upload-handler.py

# Create Lambda function
aws lambda create-function \
    --function-name rag-chatbot-upload \
    --runtime python3.9 \
    --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/RAGChatbotLambdaRole \
    --handler upload-handler.lambda_handler \
    --zip-file fileb://upload-handler.zip \
    --environment Variables='{
        "DOCUMENTS_BUCKET":"your-rag-chatbot-documents",
        "KENDRA_INDEX_ID":"'$INDEX_ID'"
    }' \
    --region us-east-2
```

### 6.2 Create Chat Handler Lambda

```bash
# Create chat handler function
cat > chat-handler.py << 'EOF'
import json
import boto3
import os

kendra_client = boto3.client('kendra')
bedrock_client = boto3.client('bedrock-runtime')

def lambda_handler(event, context):
    try:
        # Parse the request
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event
          
        user_message = body.get('message', '')
        chat_history = body.get('chatHistory', [])
      
        if not user_message:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'Message is required'})
            }
      
        # Query Kendra for relevant documents
        kendra_response = kendra_client.query(
            IndexId=os.environ['KENDRA_INDEX_ID'],
            QueryText=user_message,
            MaxResults=5
        )
      
        # Extract relevant context
        context = ""
        if 'ResultItems' in kendra_response:
            for item in kendra_response['ResultItems']:
                if 'DocumentExcerpt' in item:
                    context += item['DocumentExcerpt']['Text'] + "\n"
      
        # Prepare prompt for Bedrock
        prompt = f"""Based on the following context from uploaded documents, please answer the user's question.

Context:
{context}

User Question: {user_message}

Please provide a helpful and accurate response based on the context. If the context doesn't contain enough information to answer the question, please say so."""

        # Call Bedrock (Claude model)
        bedrock_response = bedrock_client.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })
        )
      
        # Parse Bedrock response
        response_body = json.loads(bedrock_response['body'].read())
        ai_response = response_body['content'][0]['text']
      
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'response': ai_response,
                'context': context
            })
        }
      
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
EOF

# Create deployment package
zip chat-handler.zip chat-handler.py

# Create Lambda function
aws lambda create-function \
    --function-name rag-chatbot-chat \
    --runtime python3.9 \
    --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/RAGChatbotLambdaRole \
    --handler chat-handler.lambda_handler \
    --zip-file fileb://chat-handler.zip \
    --environment Variables='{
        "KENDRA_INDEX_ID":"'$INDEX_ID'"
    }' \
    --region us-east-2
```

---

## Step 7: Create API Gateway

### 7.1 Create REST API

```bash
# Create REST API
aws apigateway create-rest-api \
    --name "RAG-Chatbot-API" \
    --description "API for RAG Chatbot" \
    --endpoint-configuration types=REGIONAL \
    --region us-east-2
```

**Note:** Save the API ID from the response.

### 7.2 Get Root Resource ID

```bash
# Replace API_ID with your actual API ID
API_ID="your-api-id-here"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text --region us-east-2)
```

### 7.3 Create Resources and Methods

```bash
# Create /upload resource
UPLOAD_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_RESOURCE_ID \
    --path-part upload \
    --query 'id' --output text \
    --region us-east-2)

# Create /chat resource
CHAT_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_RESOURCE_ID \
    --path-part chat \
    --query 'id' --output text \
    --region us-east-2)

# Create POST method for /upload
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $UPLOAD_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region us-east-2

# Create POST method for /chat
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region us-east-2

# Create OPTIONS method for CORS
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $UPLOAD_RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region us-east-2

aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region us-east-2
```

### 7.4 Set Up Lambda Integration

```bash
# Get Lambda function ARNs
UPLOAD_LAMBDA_ARN=$(aws lambda get-function --function-name rag-chatbot-upload --query 'Configuration.FunctionArn' --output text --region us-east-2)
CHAT_LAMBDA_ARN=$(aws lambda get-function --function-name rag-chatbot-chat --query 'Configuration.FunctionArn' --output text --region us-east-2)

# Create integration for upload
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $UPLOAD_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/$UPLOAD_LAMBDA_ARN/invocations \
    --region us-east-2

# Create integration for chat
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/$CHAT_LAMBDA_ARN/invocations \
    --region us-east-2

# Create CORS integrations
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $UPLOAD_RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region us-east-2

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region us-east-2
```

### 7.5 Add Lambda Permissions

```bash
# Add permission for API Gateway to invoke Lambda functions
aws lambda add-permission \
    --function-name rag-chatbot-upload \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-2:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*" \
    --region us-east-2

aws lambda add-permission \
    --function-name rag-chatbot-chat \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-2:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*" \
    --region us-east-2
```

### 7.6 Deploy API

```bash
# Create deployment
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region us-east-2

# Get API Gateway URL
echo "Your API Gateway URL is:"
echo "https://$API_ID.execute-api.us-east-2.amazonaws.com/prod"
```

---

## Step 8: Update Frontend with API Endpoint

### 8.1 Update JavaScript

```bash
# Update script.js with your actual API Gateway URL
API_URL="https://$API_ID.execute-api.us-east-2.amazonaws.com/prod"

# Create updated script.js
cat > script-updated.js << EOF
// API Configuration - Replace with your actual API Gateway endpoint
const API_BASE_URL = '$API_URL';

// Rest of your existing script.js content...
EOF

# Upload updated script.js
aws s3 cp script-updated.js s3://your-rag-chatbot-bucket/script.js --content-type "application/javascript"
```

---

## Step 9: Test the Integration

### 9.1 Test File Upload

1. Open your S3 website URL
2. Try uploading a PDF or DOC file
3. Check CloudWatch logs for any errors

### 9.2 Test Chat Functionality

1. Upload a document first
2. Wait for Kendra indexing (may take a few minutes)
3. Try asking questions about the uploaded document

### 9.3 Monitor with CloudWatch

```bash
# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/rag-chatbot"

# View recent logs
aws logs tail /aws/lambda/rag-chatbot-upload --follow
aws logs tail /aws/lambda/rag-chatbot-chat --follow
```

---

## Step 10: Optional Enhancements

### 10.1 Add Custom Domain (Optional)

```bash
# If you have a custom domain, you can set up CloudFront
# This is optional but recommended for production
```

### 10.2 Set Up Monitoring

```bash
# Create CloudWatch alarms for Lambda errors
aws cloudwatch put-metric-alarm \
    --alarm-name "RAG-Chatbot-Upload-Errors" \
    --alarm-description "Alert on upload Lambda errors" \
    --metric-name Errors \
    --namespace AWS/Lambda \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=FunctionName,Value=rag-chatbot-upload
```

### 10.3 Add Authentication (Optional)

```bash
# For production, consider adding AWS Cognito for user authentication
```

---

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure API Gateway has proper CORS configuration
2. **Lambda Timeout**: Increase timeout for Lambda functions if needed
3. **Kendra Indexing**: May take 5-10 minutes for documents to be indexed
4. **Permissions**: Ensure all IAM roles have necessary permissions

### Specific Error Solutions:

#### Error: "Please make sure your role exists and has `kendra.amazonaws.com` as trusted entity"
**Solution**: Create a separate Kendra service role:
```bash
# Create Kendra trust policy
cat > kendra-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "kendra.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create Kendra role
aws iam create-role --role-name RAGChatbotKendraRole --assume-role-policy-document file://kendra-trust-policy.json

# Attach necessary policies
aws iam attach-role-policy --role-name RAGChatbotKendraRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-role-policy --role-name RAGChatbotKendraRole --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

#### Error: "Found invalid choice 'text):policy/RAGChatbotKendraBedrockPolicy'" (Windows)
**Solution**: Use variables instead of command substitution:
```bash
# Get account ID first
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Then use the variable
aws iam attach-role-policy --role-name RAGChatbotLambdaRole --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/RAGChatbotKendraBedrockPolicy"
```

#### Error: "Policy has invalid resource" (Bucket Policy)
**Solution**: Update bucket policy with correct bucket name:
```bash
# Create bucket policy with your actual bucket name
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR_ACTUAL_BUCKET_NAME/*"
        }
    ]
}
EOF
```

### Debug Commands:

```bash
# Check Lambda function status
aws lambda get-function --function-name rag-chatbot-upload
aws lambda get-function --function-name rag-chatbot-chat

# Check API Gateway deployment
aws apigateway get-deployment --rest-api-id $API_ID --deployment-id $(aws apigateway get-deployments --rest-api-id $API_ID --query 'items[0].id' --output text)

# Check Kendra index status
aws kendra describe-index --id $INDEX_ID
```

---

## 📊 Cost Optimization

### Estimated Monthly Costs (for development):

- **S3**: ~$1-5 (depending on storage and requests)
- **Lambda**: ~$1-10 (depending on usage)
- **API Gateway**: ~$1-5 (depending on requests)
- **Kendra**: ~$25 (Developer Edition)
- **Bedrock**: ~$1-20 (depending on usage)

**Total**: ~$30-65/month for development use

---

## 🚀 Production Considerations

1. **Security**: Implement proper authentication and authorization
2. **Monitoring**: Set up comprehensive logging and monitoring
3. **Backup**: Implement backup strategies for your data
4. **Scaling**: Consider auto-scaling for high-traffic scenarios
5. **Cost**: Monitor and optimize costs regularly

---

## 📞 Support

If you encounter issues:

1. Check CloudWatch logs for error details
2. Verify all AWS services are properly configured
3. Ensure IAM permissions are correctly set
4. Test each component individually

This guide provides a complete implementation of your AI-Powered RAG Chatbot on AWS. Follow each step carefully, and you'll have a fully functional system!
