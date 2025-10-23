// Global state
let uploadedFiles = [];
let chatHistory = [];
let selectedDocumentId = 'all';
let authToken = null;
let currentUser = null;
let isLoadingDocuments = false;

// DOM elements
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterButton = document.getElementById('showRegister');
const showLoginButton = document.getElementById('showLogin');
const loginCard = document.getElementById('loginCard');
const registerCard = document.getElementById('registerCard');
const logoutButton = document.getElementById('logoutButton');
const userNameDisplay = document.getElementById('userNameDisplay');

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const filesList = document.getElementById('filesList');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const clearChatButton = document.getElementById('clearChat');
const newChatButton = document.getElementById('newChat');
const documentSelect = document.getElementById('documentSelect');

// API Configuration
const API_BASE_URL = 'https://qvx2qq6sra.execute-api.us-east-2.amazonaws.com/prod';

// Initialize

document.addEventListener('DOMContentLoaded', () => {
    initializeAuthUI();
    initializeEventListeners();
    attemptSessionRestore();
});

// Auth UI

function initializeAuthUI() {
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
    if (showRegisterButton) {
        showRegisterButton.addEventListener('click', () => toggleAuthMode('register'));
    }
    if (showLoginButton) {
        showLoginButton.addEventListener('click', () => toggleAuthMode('login'));
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}

function toggleAuthMode(mode) {
    if (mode === 'register') {
        loginCard.style.display = 'none';
        registerCard.style.display = 'block';
    } else {
        registerCard.style.display = 'none';
        loginCard.style.display = 'block';
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to sign in');
        }

        const data = await response.json();
        applySession(data);
        showNotification('Signed in successfully', 'success');
        await loadDocuments();
        loadStoredData();
        focusChatInput();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create account');
        }

        const data = await response.json();
        applySession(data);
        showNotification('Account created successfully', 'success');
        await loadDocuments();
        loadStoredData();
        focusChatInput();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function applySession(data) {
    authToken = data.token;
    currentUser = data.user;
    const record = {
        token: data.token,
        user: data.user,
        expiresAt: data.expiresAt
    };
    localStorage.setItem('ragAuthSession', JSON.stringify(record));
    userNameDisplay.textContent = data.user.name;
    showApp();
}

function attemptSessionRestore() {
    const stored = localStorage.getItem('ragAuthSession');
    if (!stored) {
        showAuth();
        return;
    }

    try {
        const session = JSON.parse(stored);
        if (!session.token || !session.user) {
            showAuth();
            return;
        }
        authToken = session.token;
        currentUser = session.user;
        userNameDisplay.textContent = currentUser.name;
        showApp();
        loadDocuments();
        loadStoredData();
        focusChatInput();
    } catch (error) {
        console.error('Failed to restore session:', error);
        showAuth();
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    uploadedFiles = [];
    chatHistory = [];
    selectedDocumentId = 'all';
    localStorage.removeItem('ragAuthSession');
    showAuth();
    resetAppState();
    showNotification('Signed out successfully', 'info');
}

function showAuth() {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
}

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'grid';
    chatInput.disabled = false;
    sendButton.disabled = false;
}

function resetAppState() {
    filesList.innerHTML = '<p class="no-files">Sign in to upload documents</p>';
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-content">
                <p>Hello! I'm your AI assistant. Upload some documents and ask me questions about them. I'll help you find relevant information from your knowledge base.</p>
            </div>
        </div>
    `;
    if (documentSelect) {
        documentSelect.innerHTML = '<option value="all">All documents</option>';
        documentSelect.value = 'all';
    }
}

function getStorageKey() {
    if (!currentUser) return 'ragChatbotData_guest';
    return `ragChatbotData_${currentUser.userId}`;
}

// Document and chat handlers

function initializeEventListeners() {
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        chatInput.addEventListener('focus', () => {
            if (uploadArea && uploadArea.style.display === 'none') {
                uploadArea.style.display = 'flex';
            }
        });
    }

    if (clearChatButton) {
        clearChatButton.addEventListener('click', clearChat);
    }

    if (newChatButton) {
        newChatButton.addEventListener('click', startNewChat);
    }

    if (documentSelect) {
        documentSelect.addEventListener('change', handleDocumentSelection);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (!ensureAuthenticated()) return;
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(e) {
    if (!ensureAuthenticated()) return;
    const files = Array.from(e.target.files);
    processFiles(files);
}

function processFiles(files) {
    if (!files.length) return;

    const validFiles = files.filter(file => {
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 7.5 * 1024 * 1024; // 7.5MB to stay under API Gateway limit

        if (!validTypes.includes(file.type)) {
            showNotification(`Unsupported file type: ${file.type}. Please upload PDF, DOC, or DOCX files.`, 'error');
            return false;
        }

        if (file.size > maxSize) {
            showNotification('File too large. Please upload files smaller than 7.5 MB.', 'error');
            return false;
        }
        return true;
    });

    if (validFiles.length > 0) {
        validFiles.forEach(uploadFile);
        uploadArea.style.display = 'none';
    }
}

async function uploadFile(file) {
    const fileId = generateFileId();
    const fileItem = {
        id: fileId,
        name: file.name,
        size: file.size,
        sizeReadable: formatFileSize(file.size),
        status: 'uploading',
        uploadTime: new Date().toISOString(),
        s3Key: null,
        sourceUri: null
    };

    uploadedFiles.unshift(fileItem);
    updateFilesList();
    showUploadProgress(fileItem);

    try {
        const fileContent = await fileToBase64(file);
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                fileName: file.name,
                fileContent,
                fileType: file.type
            })
        });

        if (!response.ok) {
            let errorMessage = 'Upload failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (err) {
                // ignore
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        fileItem.s3Key = result.fileId;
        fileItem.sourceUri = result.sourceUri;
        fileItem.status = result.kendraSyncId ? 'processing' : 'completed';
        showNotification(`File "${file.name}" uploaded successfully!`, 'success');
        if (result.kendraSyncId) {
            showNotification('Indexing has started. Answers will improve once indexing finishes.', 'info');
        }

        await loadDocuments();
    } catch (error) {
        fileItem.status = 'error';
        showNotification(`Failed to upload "${file.name}". ${error.message}`, 'error');
        console.error('Upload error:', error);
    }

    updateFilesList();
    hideUploadProgress();
    saveStoredData();
}

async function deleteFile(fileId) {
    const file = uploadedFiles.find(f => f.id === fileId || f.s3Key === fileId);
    if (!file) return;

    if (file.status === 'uploading') {
        showNotification('Please wait until the upload finishes before deleting.', 'info');
        return;
    }

    if (!confirm(`Delete "${file.name}"?`)) {
        return;
    }

    file.status = 'deleting';
    updateFilesList();

    try {
        const response = await fetch(`${API_BASE_URL}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                fileKey: file.s3Key || file.id,
                fileName: file.name
            })
        });

        if (!response.ok) {
            let errorMessage = 'File deletion failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (err) {}
            throw new Error(errorMessage);
        }

        showNotification(`"${file.name}" deleted.`, 'success');
        await loadDocuments();
    } catch (error) {
        console.error('Delete error:', error);
        file.status = 'completed';
        showNotification(error.message || 'Failed to delete file.', 'error');
        updateFilesList();
    }
}

async function loadDocuments() {
    if (!ensureAuthenticated()) return;
    isLoadingDocuments = true;
    try {
        const response = await fetch(`${API_BASE_URL}/documents`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.status === 401) {
            handleSessionExpired();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load documents');
        }

        const data = await response.json();
        uploadedFiles = (data.documents || []).map(doc => ({
            id: doc.s3Key,
            name: doc.name,
            storedName: doc.storedName || doc.name,
            size: doc.size,
            sizeReadable: doc.sizeReadable,
            status: 'completed',
            s3Key: doc.s3Key,
            sourceUri: doc.sourceUri,
            lastModified: doc.lastModified
        }));

        if (!uploadedFiles.some(file => file.s3Key === selectedDocumentId)) {
            selectedDocumentId = 'all';
        }

        updateFilesList();
        saveStoredData();
    } catch (error) {
        console.error('Failed to load documents:', error);
        showNotification(error.message, 'error');
    } finally {
        isLoadingDocuments = false;
    }
}

function focusChatInput() {
    setTimeout(() => chatInput && chatInput.focus(), 200);
}

// Chat Functions

async function sendMessage() {
    if (!ensureAuthenticated()) return;
    const message = chatInput.value.trim();
    if (!message) return;

    addMessageToChat(message, 'user');
    chatInput.value = '';
    sendButton.disabled = true;

    const targetDocumentKey = selectedDocumentId !== 'all' ? selectedDocumentId : null;
    const targetDocumentName = targetDocumentKey ? getDocumentNameByReference(targetDocumentKey) : null;

    const typingId = addTypingIndicator();

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                message,
                chatHistory,
                targetDocumentId: targetDocumentKey,
                targetDocumentName: targetDocumentName
            })
        });

        if (response.status === 401) {
            handleSessionExpired();
            removeTypingIndicator(typingId);
            return;
        }

        if (!response.ok) {
            let errorMessage = 'Chat request failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (err) {}
            throw new Error(errorMessage);
        }

        const data = await response.json();
        removeTypingIndicator(typingId);
        addMessageToChat(data.response, 'bot');

        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: data.response });
    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator(typingId);
        addMessageToChat('Sorry, I encountered an error while processing your request. Please try again.', 'bot');
    }

    sendButton.disabled = false;
    saveStoredData();
}

function addMessageToChat(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
    const typingId = `typing_${Date.now()}`;
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.id = typingId;
    typingDiv.innerHTML = `
        <div class="message-content">
            <p><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></p>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingId;
}

function removeTypingIndicator(typingId) {
    const typingDiv = document.getElementById(typingId);
    if (typingDiv) {
        typingDiv.remove();
    }
}

function clearChat() {
    chatHistory = [];
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-content">
                <p>Chat cleared. Ask a new question when you're ready!</p>
            </div>
        </div>
    `;
    saveStoredData();
}

function startNewChat() {
    if (confirm('Start a new chat session? This will clear the current conversation.')) {
        clearChat();
    }
}

function setDocumentContext(fileId) {
    const file = uploadedFiles.find(f => f.id === fileId || f.s3Key === fileId);
    if (!file) return;

    if (!file.s3Key) {
        showNotification('This document is still being prepared. Please try again shortly.', 'info');
        return;
    }

    selectedDocumentId = file.s3Key;
    if (documentSelect) {
        documentSelect.value = selectedDocumentId;
        handleDocumentSelection({ target: documentSelect });
    }
}

function handleDocumentSelection(event) {
    selectedDocumentId = event.target.value || 'all';
    updateFilesList();
    saveStoredData();

    if (selectedDocumentId === 'all') {
        showNotification('Chat will use all uploaded documents.', 'info');
    } else {
        const name = getDocumentNameByReference(selectedDocumentId);
        if (name) {
            showNotification(`Chat will focus on "${name}".`, 'info');
        }
    }
}

function updateFilesList() {
    if (!uploadedFiles.length) {
        filesList.innerHTML = '<p class="no-files">No documents uploaded yet</p>';
        updateDocumentSelector();
        chatInput.disabled = true;
        sendButton.disabled = true;
        return;
    }

    chatInput.disabled = false;
    sendButton.disabled = false;

    filesList.innerHTML = uploadedFiles.map(file => {
        const reference = file.s3Key || file.id;
        const isActive = reference && selectedDocumentId === reference;
        const focusButton = reference ? `<button class="focus-file-btn" onclick="setDocumentContext('${file.id || reference}')" title="Focus chat on this document"><i class="fas fa-headset"></i></button>` : '';
        const statusLabel = file.sizeReadable ? file.sizeReadable : '';

        return `
        <div class="file-item ${isActive ? 'file-item-active' : ''}">
            <i class="fas fa-file-${getFileIcon(file.name)}"></i>
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.name || 'Untitled document')}</div>
                <div class="file-size">${escapeHtml(statusLabel)}</div>
            </div>
            <div class="file-actions">
                <div class="file-status status-${file.status}">
                    ${getStatusText(file.status)}
                </div>
                ${focusButton}
                <button class="delete-file-btn" onclick="deleteFile('${file.id || reference}')" title="Delete file">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');

    updateDocumentSelector();
}

function updateDocumentSelector() {
    if (!documentSelect) return;

    const options = ['<option value="all">All documents</option>'];
    uploadedFiles
        .filter(file => (file.s3Key || file.id) && file.status !== 'error')
        .forEach(file => {
            const reference = file.s3Key || file.id;
            options.push(`<option value="${reference}">${escapeHtml(file.name || reference)}</option>`);
        });

    const previousValue = selectedDocumentId;
    documentSelect.innerHTML = options.join('');

    const hasMatch = uploadedFiles.some(file => (file.s3Key || file.id) === previousValue);
    if (!hasMatch) {
        selectedDocumentId = 'all';
    }

    documentSelect.value = selectedDocumentId;
}

function getDocumentNameByReference(reference) {
    if (!reference) return '';
    const match = uploadedFiles.find(file => file.s3Key === reference || file.id === reference || (file.sourceUri && file.sourceUri.endsWith(reference)));
    return match ? match.name : '';
}

function getFileIcon(filename) {
    const extension = (filename || '').split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf': return 'pdf';
        case 'doc':
        case 'docx': return 'word';
        default: return 'alt';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'uploading': return 'Uploading...';
        case 'processing': return 'Indexing...';
        case 'deleting': return 'Deleting...';
        case 'completed': return 'Ready';
        case 'error': return 'Error';
        default: return 'Unknown';
    }
}

function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function generateFileId() {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

function saveStoredData() {
    if (!currentUser) return;
    const data = {
        uploadedFiles,
        chatHistory,
        selectedDocumentId
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
}

function loadStoredData() {
    if (!currentUser) return;
    const stored = localStorage.getItem(getStorageKey());
    if (!stored) return;

    try {
        const data = JSON.parse(stored);
        chatHistory = data.chatHistory || [];
        selectedDocumentId = data.selectedDocumentId || 'all';

        chatMessages.innerHTML = '';
        if (chatHistory.length === 0) {
            chatMessages.innerHTML = `
                <div class="message bot-message">
                    <div class="message-content">
                        <p>Hello! I'm your AI assistant. Upload some documents and ask me questions about them. I'll help you find relevant information from your knowledge base.</p>
                    </div>
                </div>
            `;
        } else {
            chatHistory.forEach(msg => {
                addMessageToChat(msg.content, msg.role === 'user' ? 'user' : 'bot');
            });
        }
    } catch (error) {
        console.error('Error loading stored data:', error);
    }
}

function ensureAuthenticated() {
    if (!authToken || !currentUser) {
        showNotification('Please sign in to continue.', 'error');
        return false;
    }
    return true;
}

function handleSessionExpired() {
    showNotification('Session expired. Please sign in again.', 'error');
    handleLogout();
}

function showUploadProgress(fileItem) {
    uploadProgress.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = `Uploading ${fileItem.name}...`;
}

function hideUploadProgress() {
    setTimeout(() => {
        uploadProgress.style.display = 'none';
        uploadArea.style.display = 'flex';
    }, 800);
}

// Utilities

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        font-weight: 600;
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(20px)';
        setTimeout(() => notification.remove(), 200);
    }, 3000);
}

// Typing indicator styling injections
const style = document.createElement('style');
style.textContent = `
    .typing-indicator .message-content {
        display: inline-flex;
        gap: 6px;
    }
    .typing-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        background-color: #6b7280;
        border-radius: 50%;
        animation: typingBounce 1.2s infinite ease-in-out;
    }
    .typing-dot:nth-child(2) {
        animation-delay: 0.15s;
    }
    .typing-dot:nth-child(3) {
        animation-delay: 0.3s;
    }
    @keyframes typingBounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
        40% { transform: translateY(-6px); opacity: 1; }
    }
`;
document.head.appendChild(style);
