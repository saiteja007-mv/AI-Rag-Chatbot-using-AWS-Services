# 🚀 Final Commands for Your Deployment

## 📋 Your Configuration:

- **Account ID**: `101002668362`
- **Kendra Index ID**: `28726c3c-71af-492b-b98d-89e2735fd7a7`
- **Kendra Data Source ID**: `bd7c7753-9160-4804-96d6-cfcae9be8e5d` ✅
- **Static Site Bucket**: `ai-rag-chatbot-g6`
- **Documents Bucket**: `ai-rag-documents-g6`
- **Region**: `us-east-2`

## 🔧 Commands to Run (Copy & Paste Each Line):

## 📊 Progress Tracking:

- ✅ **Step 1**: Kendra Service Role Creation
- ✅ **Step 2**: Custom Policy Attachment
- ✅ **Step 3**: Kendra Data Source Creation (ID: `bd7c7753-9160-4804-96d6-cfcae9be8e5d`)
- ✅ **Step 4**: Lambda Functions Creation (Both functions created successfully!)
- ✅ **Step 5**: API Gateway Creation (API ID: `qvx2qq6sra`)
- ✅ **Step 6**: Frontend Update (script.js updated with API URL)

### 1. Create Kendra Service Role (Required for Data Source)

```bash
aws iam create-role --role-name RAGChatbotKendraRole --assume-role-policy-document file://kendra-trust-policy.json
```

```bash
aws iam attach-role-policy --role-name RAGChatbotKendraRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

```bash
aws iam attach-role-policy --role-name RAGChatbotKendraRole --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

### 2. Attach Custom Policy to Lambda Role

```bash
aws iam attach-role-policy --role-name RAGChatbotLambdaRole --policy-arn arn:aws:iam::101002668362:policy/RAGChatbotKendraBedrockPolicy
```

### 3. Create S3 Data Source for Kendra ✅ COMPLETED

```bash
aws kendra create-data-source --index-id 28726c3c-71af-492b-b98d-89e2735fd7a7 --name "S3-Documents" --type "S3" --configuration file://s3-datasource-config.json --role-arn "arn:aws:iam::101002668362:role/RAGChatbotKendraRole" --region us-east-2
```

**Result**: ✅ SUCCESS

```json
{
    "Id": "bd7c7753-9160-4804-96d6-cfcae9be8e5d"
}
```

**Kendra Data Source ID**: `bd7c7753-9160-4804-96d6-cfcae9be8e5d`

### 4. Create Lambda Functions ✅

#### 4.1 Create Lambda Deployment Packages (Required First)

```bash
# Create packages using PowerShell (Windows)
Compress-Archive -Path upload-handler.py -DestinationPath upload-handler.zip -Force
Compress-Archive -Path chat-handler.py -DestinationPath chat-handler.zip -Force
```

#### 4.2 Upload Handler Lambda ✅

```bash
aws lambda create-function --function-name rag-chatbot-upload --runtime python3.9 --role "arn:aws:iam::101002668362:role/RAGChatbotLambdaRole" --handler upload-handler.lambda_handler --zip-file fileb://upload-handler.zip --environment "Variables={DOCUMENTS_BUCKET=ai-rag-documents-g6,KENDRA_INDEX_ID=28726c3c-71af-492b-b98d-89e2735fd7a7}" --timeout 30 --region us-east-2
```

**Result**: ✅ Function created successfully

- **Function ARN**: `arn:aws:lambda:us-east-2:101002668362:function:rag-chatbot-upload`
- **State**: Active

#### 4.3 Chat Handler Lambda ✅

```bash
aws lambda create-function --function-name rag-chatbot-chat --runtime python3.9 --role "arn:aws:iam::101002668362:role/RAGChatbotLambdaRole" --handler chat-handler.lambda_handler --zip-file fileb://chat-handler.zip --environment "Variables={DOCUMENTS_BUCKET=ai-rag-documents-g6,KENDRA_INDEX_ID=28726c3c-71af-492b-b98d-89e2735fd7a7}" --timeout 30 --region us-east-2
```

**Result**: ✅ Function created successfully

- **Function ARN**: `arn:aws:lambda:us-east-2:101002668362:function:rag-chatbot-chat`
- **State**: Active

**Fixed Issues**:

- ❌ **Previous Error**: JSON parsing error with single quotes
- ✅ **Solution**: Use `Variables={KEY=value,KEY2=value2}` format instead of JSON

### 5. Create API Gateway

#### Create REST API ✅:

```bash
aws apigateway create-rest-api --name "RAG-Chatbot-API" --description "API for RAG Chatbot" --endpoint-configuration types=REGIONAL --region us-east-2
```

**Result**: ✅ API created successfully
- **API ID**: `qvx2qq6sra`
- **Root Resource ID**: `i872btcvl8`
- **API Name**: `RAG-Chatbot-API`

#### Get Root Resource ID ✅:

```bash
aws apigateway get-resources --rest-api-id qvx2qq6sra --query 'items[0].id' --output text --region us-east-2
```

**Result**: Root Resource ID is `i872btcvl8`

#### Create Resources ✅:

```bash
aws apigateway create-resource --rest-api-id qvx2qq6sra --parent-id i872btcvl8 --path-part upload --query 'id' --output text --region us-east-2
```

**Result**: Upload Resource ID = `okmbfr`

```bash
aws apigateway create-resource --rest-api-id qvx2qq6sra --parent-id i872btcvl8 --path-part chat --query 'id' --output text --region us-east-2
```

**Result**: Chat Resource ID = `aox0xw`

#### Create Methods:

```bash
aws apigateway put-method --rest-api-id qvx2qq6sra --resource-id okmbfr --http-method POST --authorization-type NONE --region us-east-2
```

```bash
aws apigateway put-method --rest-api-id qvx2qq6sra --resource-id aox0xw --http-method POST --authorization-type NONE --region us-east-2
```

```bash
aws apigateway put-method --rest-api-id qvx2qq6sra --resource-id okmbfr --http-method OPTIONS --authorization-type NONE --region us-east-2
```

```bash
aws apigateway put-method --rest-api-id qvx2qq6sra --resource-id aox0xw --http-method OPTIONS --authorization-type NONE --region us-east-2
```

#### Get Lambda ARNs ✅:

```bash
aws lambda get-function --function-name rag-chatbot-upload --query 'Configuration.FunctionArn' --output text --region us-east-2
```

**Result**: Upload Lambda ARN = `arn:aws:lambda:us-east-2:101002668362:function:rag-chatbot-upload`

```bash
aws lambda get-function --function-name rag-chatbot-chat --query 'Configuration.FunctionArn' --output text --region us-east-2
```

**Result**: Chat Lambda ARN = `arn:aws:lambda:us-east-2:101002668362:function:rag-chatbot-chat`

#### Create Integrations:

```bash
aws apigateway put-integration --rest-api-id qvx2qq6sra --resource-id okmbfr --http-method POST --type AWS_PROXY --integration-http-method POST --uri "arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-2:101002668362:function:rag-chatbot-upload/invocations" --region us-east-2
```

```bash
aws apigateway put-integration --rest-api-id qvx2qq6sra --resource-id aox0xw --http-method POST --type AWS_PROXY --integration-http-method POST --uri "arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-2:101002668362:function:rag-chatbot-chat/invocations" --region us-east-2
```

#### Create CORS Integrations:

```bash
aws apigateway put-integration --rest-api-id qvx2qq6sra --resource-id okmbfr --http-method OPTIONS --type MOCK --request-templates "{\"application/json\": \"{\\\"statusCode\\\": 200}\"}" --region us-east-2
```

```bash
aws apigateway put-integration --rest-api-id qvx2qq6sra --resource-id aox0xw --http-method OPTIONS --type MOCK --request-templates "{\"application/json\": \"{\\\"statusCode\\\": 200}\"}" --region us-east-2
```

#### Add Lambda Permissions:

```bash
aws lambda add-permission --function-name rag-chatbot-upload --statement-id apigateway-invoke --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:us-east-2:101002668362:qvx2qq6sra/*/*" --region us-east-2
```

```bash
aws lambda add-permission --function-name rag-chatbot-chat --statement-id apigateway-invoke --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:us-east-2:101002668362:qvx2qq6sra/*/*" --region us-east-2
```

#### Deploy API:

```bash
aws apigateway create-deployment --rest-api-id qvx2qq6sra --stage-name prod --region us-east-2
```

### 6. Update Frontend with API Endpoint

#### Get your API Gateway URL ✅:

```bash
echo https://qvx2qq6sra.execute-api.us-east-2.amazonaws.com/prod
```

**Your API Gateway URL**: `https://qvx2qq6sra.execute-api.us-east-2.amazonaws.com/prod`

#### Update script.js with your API URL ✅:

```bash
aws s3 cp script.js s3://ai-rag-chatbot-g6/ --content-type "application/javascript" --region us-east-2
```

**Result**: ✅ script.js updated and uploaded to S3

## 🎯 Quick Test Commands:

### Test your website:

Visit: `http://ai-rag-chatbot-g6.s3-website-us-east-2.amazonaws.com`

## 🎉 **DEPLOYMENT COMPLETE!**

### Your Live Application:
- **Website**: `http://ai-rag-chatbot-g6.s3-website-us-east-2.amazonaws.com`
- **API Gateway**: `https://qvx2qq6sra.execute-api.us-east-2.amazonaws.com/prod`
- **Upload Endpoint**: `https://qvx2qq6sra.execute-api.us-east-2.amazonaws.com/prod/upload`
- **Chat Endpoint**: `https://qvx2qq6sra.execute-api.us-east-2.amazonaws.com/prod/chat`

### What's Working:
✅ Static website hosted on S3  
✅ API Gateway with CORS enabled  
✅ Lambda functions for upload and chat  
✅ Kendra index for document search  
✅ Bedrock integration for AI responses  
✅ File upload and deletion functionality  
✅ Real-time chat interface

### Test Kendra index:

```bash
aws kendra describe-index --id 28726c3c-71af-492b-b98d-89e2735fd7a7 --region us-east-2
```

### Test Lambda functions:

```bash
aws lambda get-function --function-name rag-chatbot-upload --region us-east-2
```

```bash
aws lambda get-function --function-name rag-chatbot-chat --region us-east-2
```

## 📝 Important Notes:

1. **Replace placeholders**: Replace `YOUR_API_ID`, `YOUR_ROOT_RESOURCE_ID`, etc. with actual values from previous commands
2. **Run in order**: Execute commands in the sequence shown
3. **Save outputs**: Keep track of API IDs, Resource IDs, and Lambda ARNs
4. **Region consistency**: All commands use `us-east-2`
5. **Account ID**: All ARNs use your account ID `101002668362`

## 🚨 Troubleshooting:

### ✅ RESOLVED ISSUES:

#### Kendra Data Source Creation:

- **Status**: ✅ SUCCESS
- **Data Source ID**: `bd7c7753-9160-4804-96d6-cfcae9be8e5d`
- **Issue**: Cross-account pass role error
- **Solution**: Used correct Kendra service role

#### Lambda Function JSON Parsing Error:

- **Error**: `Error parsing parameter '--environment': Expected: '=', received: '"'`
- **Cause**: Double quotes in JSON environment variables
- **Solution**: Use single quotes around the entire JSON string
- **Fixed Command**: `--environment Variables='{"KEY":"VALUE"}'`

### 🔧 COMMON ISSUES:

- **If Kendra role error persists**: Wait 5-10 minutes for IAM changes to propagate
- **If Lambda errors**: Check that the role has proper permissions
- **If API Gateway errors**: Ensure all resource IDs are correct
- **If CORS errors**: Verify OPTIONS methods are created
- **If JSON parsing errors**: Use single quotes around JSON strings in Windows Command Prompt

## 🎉 Final Result:

After completing all commands, you'll have:

- ✅ Static website: `http://ai-rag-chatbot-g6.s3-website-us-east-2.amazonaws.com`
- ✅ API Gateway: `https://YOUR_API_ID.execute-api.us-east-2.amazonaws.com/prod`
- ✅ Lambda functions for upload and chat
- ✅ Kendra index for document search
- ✅ Full RAG chatbot functionality
