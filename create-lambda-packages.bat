@echo off
echo Creating Lambda deployment packages...

echo Creating upload-handler.zip...
zip upload-handler.zip upload-handler.py

echo Creating chat-handler.zip...
zip chat-handler.zip chat-handler.py

echo Lambda packages created successfully!
echo Files created:
echo - upload-handler.zip
echo - chat-handler.zip
