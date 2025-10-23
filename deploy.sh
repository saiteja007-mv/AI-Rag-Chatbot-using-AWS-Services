#!/bin/bash

# AWS RAG Chatbot Deployment Script
# This script automates the deployment of your AI-Powered RAG Chatbot to AWS

set -e  # Exit on any error

# Configuration - UPDATE THESE VALUES
BUCKET_NAME="ai-rag-chatbot-g6-$(date +%s)"  # Unique bucket name
DOCUMENTS_BUCKET="your-rag-chatbot-documents-$(date +%s)"  # Unique documents bucket
REGION=$(aws configure get region)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Starting AWS RAG Chatbot Deployment"
echo "======================================"
echo "Bucket Name: $BUCKET_NAME"
echo "Documents Bucket: $DOCUMENTS_BUCKET"
echo "Region: $REGION"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command_exists aws; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

if ! command_exists zip; then
    echo "❌ zip command not found. Please install zip first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 1: Create S3 buckets
echo "🪣 Creating S3 buckets..."
aws s3 mb s3://$BUCKET_NAME --region $REGION
aws s3 mb s3://$DOCUMENTS_BUCKET --region $REGION

# Enable versioning
aws s3api put-bucket-versioning --bucket $BUCKET_NAME --versioning-configuration Status=Enabled
aws s3api put-bucket-versioning --bucket $DOCUMENTS_BUCKET --versioning-configuration Status=Enabled

echo "✅ S3 buckets created"
echo ""

# Step 2: Configure static website hosting
echo "🌐 Configuring static website hosting..."
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

aws s3api put-bucket-website --bucket $BUCKET_NAME --website-configuration file://website-config.json

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
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json

echo "✅ Static website hosting configured"
echo ""

# Step 3: Upload static files
echo "📤 Uploading static files..."
if [ -f "index.html" ]; then
    aws s3 cp index.html s3://$BUCKET_NAME/ --content-type "text/html"
    echo "✅ index.html uploaded"
else
    echo "❌ index.html not found in current directory"
    exit 1
fi

if [ -f "styles.css" ]; then
    aws s3 cp styles.css s3://$BUCKET_NAME/ --content-type "text/css"
    echo "✅ styles.css uploaded"
else
    echo "❌ styles.css not found in current directory"
    exit 1
fi

if [ -f "script.js" ]; then
    aws s3 cp script.js s3://$BUCKET_NAME/ --content-type "application/javascript"
    echo "✅ script.js uploaded"
else
    echo "❌ script.js not found in current directory"
    exit 1
fi

echo "✅ Static files uploaded"
echo ""

# Step 4: Create IAM role
echo "🔐 Creating IAM role..."
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

aws iam create-role --role-name RAGChatbotLambdaRole --assume-role-policy-document file://lambda-trust-policy.json || echo "Role may already exist"

# Attach policies
aws iam attach-role-policy --role-name RAGChatbotLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole || echo "Policy may already be attached"
aws iam attach-role-policy --role-name RAGChatbotLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess || echo "Policy may already be attached"

# Create custom policy
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

aws iam create-policy --policy-name RAGChatbotKendraBedrockPolicy --policy-document file://kendra-bedrock-policy.json || echo "Policy may already exist"
aws iam attach-role-policy --role-name RAGChatbotLambdaRole --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/RAGChatbotKendraBedrockPolicy" || echo "Policy may already be attached"

echo "✅ IAM role created and policies attached"
echo ""

# Step 5: Create Lambda functions
echo "⚡ Creating Lambda functions..."

# Create upload handler
cat > upload-handler.py << 'EOF'
import json
import boto3
import os
import base64

s3_client = boto3.client('s3')

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
        file_data = base64.b64decode(file_content)
        
        s3_key = f"documents/{file_name}"
        s3_client.put_object(
            Bucket=os.environ['DOCUMENTS_BUCKET'],
            Key=s3_key,
            Body=file_data,
            ContentType=file_type
        )
        
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

# Create chat handler
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
        
        # For demo purposes, return a simple response
        # In production, you would query Kendra and Bedrock here
        ai_response = f"I received your message: '{user_message}'. This is a demo response. To enable full functionality, please follow the complete setup guide to configure Kendra and Bedrock."
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'response': ai_response
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

# Create deployment packages
zip upload-handler.zip upload-handler.py
zip chat-handler.zip chat-handler.py

# Create Lambda functions
aws lambda create-function \
    --function-name rag-chatbot-upload \
    --runtime python3.9 \
    --role "arn:aws:iam::$ACCOUNT_ID:role/RAGChatbotLambdaRole" \
    --handler upload-handler.lambda_handler \
    --zip-file fileb://upload-handler.zip \
    --environment Variables="{\"DOCUMENTS_BUCKET\":\"$DOCUMENTS_BUCKET\"}" \
    --timeout 30 \
    --region us-east-2 || echo "Upload function may already exist"

aws lambda create-function \
    --function-name rag-chatbot-chat \
    --runtime python3.9 \
    --role "arn:aws:iam::$ACCOUNT_ID:role/RAGChatbotLambdaRole" \
    --handler chat-handler.lambda_handler \
    --zip-file fileb://chat-handler.zip \
    --timeout 30 \
    --region us-east-2 || echo "Chat function may already exist"

echo "✅ Lambda functions created"
echo ""

# Step 6: Create API Gateway
echo "🌐 Creating API Gateway..."

# Create REST API
API_ID=$(aws apigateway create-rest-api \
    --name "RAG-Chatbot-API" \
    --description "API for RAG Chatbot" \
    --endpoint-configuration types=REGIONAL \
    --region us-east-2 \
    --query 'id' --output text)

echo "API ID: $API_ID"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text --region us-east-2)

# Create resources
UPLOAD_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_RESOURCE_ID \
    --path-part upload \
    --query 'id' --output text \
    --region us-east-2)

CHAT_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_RESOURCE_ID \
    --path-part chat \
    --query 'id' --output text \
    --region us-east-2)

# Create methods
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $UPLOAD_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region us-east-2

aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region us-east-2

# Create OPTIONS methods for CORS
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

# Get Lambda ARNs
UPLOAD_LAMBDA_ARN=$(aws lambda get-function --function-name rag-chatbot-upload --query 'Configuration.FunctionArn' --output text --region us-east-2)
CHAT_LAMBDA_ARN=$(aws lambda get-function --function-name rag-chatbot-chat --query 'Configuration.FunctionArn' --output text --region us-east-2)

# Create integrations
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $UPLOAD_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/$UPLOAD_LAMBDA_ARN/invocations \
    --region us-east-2

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

# Add Lambda permissions
aws lambda add-permission \
    --function-name rag-chatbot-upload \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-2:$ACCOUNT_ID:$API_ID/*/*" \
    --region us-east-2 || echo "Permission may already exist"

aws lambda add-permission \
    --function-name rag-chatbot-chat \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-2:$ACCOUNT_ID:$API_ID/*/*" \
    --region us-east-2 || echo "Permission may already exist"

# Deploy API
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region us-east-2

echo "✅ API Gateway created and deployed"
echo ""

# Step 7: Update frontend with API endpoint
echo "🔄 Updating frontend with API endpoint..."
API_URL="https://$API_ID.execute-api.us-east-2.amazonaws.com/prod"

# Create updated script.js with API endpoint
if [ -f "script.js" ]; then
    # Backup original script.js
    cp script.js script.js.backup
    
    # Update API_BASE_URL in script.js
    sed -i.bak "s|const API_BASE_URL = '.*';|const API_BASE_URL = '$API_URL';|g" script.js
    
    # Upload updated script.js
    aws s3 cp script.js s3://$BUCKET_NAME/ --content-type "application/javascript"
    
    echo "✅ Frontend updated with API endpoint"
else
    echo "❌ script.js not found"
fi

echo ""

# Cleanup temporary files
echo "🧹 Cleaning up temporary files..."
rm -f website-config.json bucket-policy.json lambda-trust-policy.json kendra-bedrock-policy.json
rm -f upload-handler.py chat-handler.py upload-handler.zip chat-handler.zip
rm -f script.js.bak

echo "✅ Cleanup completed"
echo ""

# Final output
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "📊 Deployment Summary:"
echo "  Static Website URL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo "  API Gateway URL: $API_URL"
echo "  Documents Bucket: $DOCUMENTS_BUCKET"
echo "  API ID: $API_ID"
echo ""
echo "🔧 Next Steps:"
echo "  1. Visit your website URL to test the basic functionality"
echo "  2. Follow the complete AWS Implementation Guide to set up Kendra and Bedrock"
echo "  3. Test file upload and chat functionality"
echo "  4. Monitor costs in AWS Billing dashboard"
echo ""
echo "📚 Documentation:"
echo "  - Complete Guide: AWS_Implementation_Guide.md"
echo "  - Quick Checklist: AWS_Quick_Checklist.md"
echo ""
echo "⚠️  Important Notes:"
echo "  - This script creates a basic working version"
echo "  - For full AI functionality, you need to set up Kendra and Bedrock"
echo "  - Monitor your AWS costs regularly"
echo "  - The current setup includes demo responses for chat"
echo ""
echo "🚀 Your AI RAG Chatbot is ready for basic testing!"
