# Corrected Commands for Your Current Progress

Based on your terminal output, here are the corrected commands to continue your deployment:

## ✅ What You've Already Done
- Created S3 buckets: `ai-rag-chatbot-g6` and `ai-rag-documents-g6`
- Created IAM role: `RAGChatbotLambdaRole`
- Created custom policy: `RAGChatbotKendraBedrockPolicy`
- Account ID: `101002668362`

## 🔧 Commands to Fix Current Issues

### 1. Create Kendra Service Role (Required for Kendra Index)

```bash
# Create Kendra trust policy file
echo '{
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
}' > kendra-trust-policy.json

# Create Kendra service role
aws iam create-role --role-name RAGChatbotKendraRole --assume-role-policy-document file://kendra-trust-policy.json

# Attach necessary policies to Kendra role
aws iam attach-role-policy --role-name RAGChatbotKendraRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-role-policy --role-name RAGChatbotKendraRole --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

### 2. Attach Custom Policy to Lambda Role (Windows Compatible)

```bash
# Use your account ID directly (no command substitution)
aws iam attach-role-policy --role-name RAGChatbotLambdaRole --policy-arn arn:aws:iam::101002668362:policy/RAGChatbotKendraBedrockPolicy
```

### 3. Create Kendra Index (Using Correct Role)

```bash
# Create Kendra index using the Kendra service role
aws kendra create-index \
    --name "RAG-Chatbot-Index" \
    --description "Index for RAG Chatbot documents" \
    --role-arn "arn:aws:iam::101002668362:role/RAGChatbotKendraRole" \
    --edition "DEVELOPER_EDITION" \
    --region us-east-2
```

**Important**: Save the Index ID from the response - you'll need it for the next step.

### 4. Create S3 Data Source for Kendra

```bash
# Replace INDEX_ID with the actual index ID from step 3
INDEX_ID="your-index-id-from-step-3"

# Create S3 data source configuration
echo '{
    "S3Configuration": {
        "BucketName": "ai-rag-documents-g6",
        "DocumentsMetadataConfiguration": {
            "S3Prefix": "documents/"
        }
    }
}' > s3-datasource-config.json

# Create the data source
aws kendra create-data-source \
    --index-id $INDEX_ID \
    --name "S3-Documents" \
    --type "S3" \
    --configuration file://s3-datasource-config.json \
    --role-arn "arn:aws:iam::101002668362:role/RAGChatbotKendraRole" \
    --region us-east-2
```

### 5. Fix Bucket Policy (Update with Correct Bucket Name)

```bash
# Create corrected bucket policy
echo '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::ai-rag-chatbot-g6/*"
        }
    ]
}' > bucket-policy.json

# Apply the corrected bucket policy
aws s3api put-bucket-policy --bucket ai-rag-chatbot-g6 --policy file://bucket-policy.json
```

### 6. Configure Static Website Hosting

```bash
# Create website configuration
echo '{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}' > website-config.json

# Apply website configuration
aws s3api put-bucket-website --bucket ai-rag-chatbot-g6 --website-configuration file://website-config.json
```

## 🎯 Next Steps After These Commands

1. **Test your website**: Visit `http://ai-rag-chatbot-g6.s3-website-us-east-2.amazonaws.com`
2. **Continue with Lambda functions** (follow the main guide)
3. **Set up API Gateway** (follow the main guide)
4. **Test the complete integration**

## 📝 Important Notes

- **Account ID**: `101002668362` (use this directly in commands)
- **Region**: `us-east-2` (make sure you're using the correct region)
- **Bucket Names**: 
  - Static site: `ai-rag-chatbot-g6`
  - Documents: `ai-rag-documents-g6`
- **Roles**: 
  - Lambda: `RAGChatbotLambdaRole`
  - Kendra: `RAGChatbotKendraRole` (newly created)

## 🚨 If You Get Errors

1. **Check your region**: Make sure all commands use the same region
2. **Verify role names**: Use exact role names as shown
3. **Check permissions**: Ensure your AWS CLI has necessary permissions
4. **Wait for propagation**: IAM changes may take a few minutes to propagate

Run these commands in order, and you should be able to continue with your deployment!
