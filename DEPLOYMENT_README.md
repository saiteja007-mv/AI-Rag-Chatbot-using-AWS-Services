# 🚀 Quick Deployment Guide

## Overview
This repository contains everything you need to deploy your AI-Powered RAG Chatbot to AWS, including automated deployment scripts and comprehensive guides.

## 📁 Files Included

### Core Application Files
- `index.html` - Main HTML structure
- `styles.css` - Minimal black/white ChatGPT-like styling
- `script.js` - Interactive JavaScript functionality

### Deployment Files
- `deploy.sh` - **Automated deployment script** (recommended for quick setup)
- `AWS_Implementation_Guide.md` - **Complete step-by-step manual guide**
- `AWS_Quick_Checklist.md` - Quick reference checklist
- `DEPLOYMENT_README.md` - This file

## 🚀 Quick Start (Automated Deployment)

### Prerequisites
1. AWS CLI installed and configured
2. Appropriate AWS permissions
3. All application files in the same directory

### Run Automated Deployment
```bash
# Make script executable (Linux/Mac)
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

**What the script does:**
- ✅ Creates S3 buckets for static site and documents
- ✅ Configures static website hosting
- ✅ Uploads your HTML, CSS, and JS files
- ✅ Creates IAM roles and policies
- ✅ Deploys Lambda functions (upload and chat handlers)
- ✅ Sets up API Gateway with CORS
- ✅ Updates frontend with API endpoint
- ✅ Provides you with all URLs and configuration details

### After Running the Script
1. **Visit your website** using the provided URL
2. **Test basic functionality** (upload and chat)
3. **Follow the complete guide** to add Kendra and Bedrock for full AI functionality

## 📖 Manual Deployment (Step-by-Step)

If you prefer manual control or need to customize the deployment:

1. **Read the complete guide**: `AWS_Implementation_Guide.md`
2. **Follow each step carefully**
3. **Use the checklist**: `AWS_Quick_Checklist.md` to track progress

## 🎯 What You Get

### Basic Deployment (Automated Script)
- ✅ Static website hosted on S3
- ✅ File upload functionality
- ✅ Basic chat interface
- ✅ API Gateway integration
- ✅ Lambda functions for backend
- ⚠️ Demo chat responses (no AI yet)

### Full AI Functionality (Manual Setup Required)
- ✅ Everything from basic deployment
- ✅ Amazon Kendra for document indexing
- ✅ Amazon Bedrock for AI responses
- ✅ Full RAG (Retrieval-Augmented Generation) capability

## 💰 Estimated Costs

### Basic Deployment
- **S3**: ~$1-5/month
- **Lambda**: ~$1-10/month  
- **API Gateway**: ~$1-5/month
- **Total**: ~$3-20/month

### Full AI Deployment
- **Basic costs**: ~$3-20/month
- **Kendra**: ~$25/month (Developer Edition)
- **Bedrock**: ~$1-20/month (usage-based)
- **Total**: ~$30-65/month

## 🔧 Troubleshooting

### Common Issues
1. **Permission errors**: Ensure AWS CLI has proper permissions
2. **Bucket name conflicts**: Script uses timestamps for unique names
3. **Region issues**: Ensure you're deploying to the correct region
4. **CORS errors**: API Gateway CORS is configured automatically

### Getting Help
1. Check CloudWatch logs for Lambda functions
2. Verify all AWS services are properly configured
3. Test each component individually
4. Refer to the complete implementation guide

## 📊 Monitoring

After deployment, monitor:
- **AWS Billing Dashboard** for costs
- **CloudWatch Logs** for errors
- **S3 metrics** for storage usage
- **Lambda metrics** for function performance

## 🚀 Next Steps

1. **Test the basic deployment**
2. **Set up Kendra and Bedrock** for full AI functionality
3. **Customize the interface** as needed
4. **Add authentication** for production use
5. **Set up monitoring and alerts**

## 📞 Support

- **Complete Guide**: `AWS_Implementation_Guide.md`
- **Quick Reference**: `AWS_Quick_Checklist.md`
- **AWS Documentation**: [AWS Official Docs](https://docs.aws.amazon.com/)

---

**Ready to deploy? Run `./deploy.sh` and follow the prompts!** 🚀
