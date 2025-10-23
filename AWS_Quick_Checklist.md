# AWS Implementation Quick Checklist

## ✅ Pre-Implementation Setup
- [ ] AWS Account with appropriate permissions
- [ ] AWS CLI installed and configured
- [ ] Static site files ready (index.html, styles.css, script.js)
- [ ] Unique bucket names chosen

## ✅ Step 1: Static Website (S3)
- [ ] Create S3 bucket for static site
- [ ] Enable static website hosting
- [ ] Upload HTML, CSS, JS files
- [ ] Configure bucket policy for public access
- [ ] Test website URL

## ✅ Step 2: Document Storage (S3)
- [ ] Create S3 bucket for documents
- [ ] Enable versioning
- [ ] Note bucket name for Lambda functions

## ✅ Step 3: IAM Setup
- [ ] Create Lambda execution role
- [ ] Attach basic Lambda policies
- [ ] Create custom policy for Kendra/Bedrock
- [ ] Attach custom policy to role

## ✅ Step 4: Amazon Kendra
- [ ] Create Kendra index (Developer Edition)
- [ ] Save Index ID
- [ ] Create S3 data source
- [ ] Save Data Source ID

## ✅ Step 5: Lambda Functions
- [ ] Create upload handler Lambda
- [ ] Create chat handler Lambda
- [ ] Set environment variables
- [ ] Test functions individually

## ✅ Step 6: API Gateway
- [ ] Create REST API
- [ ] Create /upload and /chat resources
- [ ] Set up POST methods
- [ ] Configure Lambda integrations
- [ ] Add CORS support
- [ ] Deploy to prod stage
- [ ] Save API Gateway URL

## ✅ Step 7: Integration
- [ ] Update script.js with API Gateway URL
- [ ] Re-upload updated script.js to S3
- [ ] Test file upload functionality
- [ ] Test chat functionality

## ✅ Step 8: Testing & Validation
- [ ] Upload a test document
- [ ] Wait for Kendra indexing (5-10 minutes)
- [ ] Ask questions about uploaded document
- [ ] Check CloudWatch logs for errors
- [ ] Verify all features work

## 🔧 Troubleshooting Checklist
- [ ] Check Lambda function logs in CloudWatch
- [ ] Verify IAM permissions are correct
- [ ] Ensure CORS is properly configured
- [ ] Check Kendra index status
- [ ] Verify API Gateway deployment
- [ ] Test each component individually

## 📊 Post-Implementation
- [ ] Set up CloudWatch alarms
- [ ] Monitor costs in AWS Billing
- [ ] Document any custom configurations
- [ ] Plan for production enhancements

## 🚨 Important Notes
- Replace placeholder values (bucket names, API IDs, etc.)
- Save all IDs and ARNs for reference
- Kendra indexing takes 5-10 minutes
- Test thoroughly before production use
- Monitor costs regularly

## 📞 Quick Commands Reference
```bash
# Get your AWS account ID
aws sts get-caller-identity --query Account --output text

# Get your current region
aws configure get region

# List all your S3 buckets
aws s3 ls

# List Lambda functions
aws lambda list-functions

# Check API Gateway APIs
aws apigateway get-rest-apis
```

## 💰 Cost Monitoring
- [ ] Set up billing alerts
- [ ] Monitor S3 storage costs
- [ ] Track Lambda execution costs
- [ ] Monitor API Gateway request costs
- [ ] Check Kendra usage costs
- [ ] Monitor Bedrock usage costs
