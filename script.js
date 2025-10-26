// API Configuration - Will be updated after API Gateway creation
const API_BASE_URL = 'https://juj0jhl4i0.execute-api.us-east-2.amazonaws.com/prod';

// Global state
let authToken = null;
let currentUser = null;
let uploadedFiles = [];
let chatHistory = [];
let currentSessionId = null;
let chatSessions = [];

// DOM Elements
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginCard = document.getElementById('loginCard');
const registerCard = document.getElementById('registerCard');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
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
const newChatButton = document.getElementById('newChatButton');
const sessionsList = document.getElementById('sessionsList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    initializeUpload();
    initializeChat();
    initializeSessions();
    attemptSessionRestore();
});

// Auth Functions
function initializeAuth() {
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginCard.style.display = 'none';
        registerCard.style.display = 'block';
    });
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerCard.style.display = 'none';
        loginCard.style.display = 'block';
    });
    logoutButton.addEventListener('click', handleLogout);
}

async function handleLogin(e) {
    e.preventDefault();
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
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        applySession(data);
        showNotification('Logged in successfully', 'success');
        await loadDocuments();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
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
            throw new Error(error.error || 'Registration failed');
        }

        const data = await response.json();
        applySession(data);
        showNotification('Account created successfully', 'success');
        await loadDocuments();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function applySession(data) {
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('ragAuthSession', JSON.stringify({
        token: data.token,
        user: data.user,
        expiresAt: data.expiresAt
    }));
    userNameDisplay.textContent = data.user.name;
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    loadChatSessions();
}

function attemptSessionRestore() {
    const stored = localStorage.getItem('ragAuthSession');
    if (!stored) return;

    try {
        const session = JSON.parse(stored);
        if (session.token && session.user) {
            authToken = session.token;
            currentUser = session.user;
            userNameDisplay.textContent = currentUser.name;
            authContainer.style.display = 'none';
            appContainer.style.display = 'flex';
            loadDocuments();
            loadChatSessions();
        }
    } catch (error) {
        console.error('Session restore failed:', error);
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    uploadedFiles = [];
    chatHistory = [];
    currentSessionId = null;
    chatSessions = [];
    localStorage.removeItem('ragAuthSession');
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    loginCard.style.display = 'block';
    registerCard.style.display = 'none';
    filesList.innerHTML = '<p class="no-files">No documents uploaded</p>';
    chatMessages.innerHTML = '<div class="message bot-message"><p>Hello! Upload documents and ask me questions about them.</p></div>';
    sessionsList.innerHTML = '<p class="no-sessions">No chat sessions</p>';
    showNotification('Logged out', 'success');
}

// Upload Functions
function initializeUpload() {
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.style.background = '#f5f5f5';
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.style.background = '#ffffff';
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.style.background = '#ffffff';
    if (!authToken) {
        showNotification('Please log in first', 'error');
        return;
    }
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(e) {
    if (!authToken) {
        showNotification('Please log in first', 'error');
        return;
    }
    const files = Array.from(e.target.files);
    processFiles(files);
}

function processFiles(files) {
    const validFiles = files.filter(file => {
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            showNotification(`Invalid file type: ${file.name}`, 'error');
            return false;
        }
        if (file.size > maxSize) {
            showNotification(`File too large: ${file.name}`, 'error');
            return false;
        }
        return true;
    });

    validFiles.forEach(uploadFile);
}

async function uploadFile(file) {
    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const fileItem = {
        id: fileId,
        name: file.name,
        size: formatFileSize(file.size),
        status: 'uploading'
    };

    uploadedFiles.unshift(fileItem);
    updateFilesList();
    showUploadProgress(file.name);

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
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        fileItem.status = 'completed';
        fileItem.s3Key = result.fileId;
        showNotification(`${file.name} uploaded successfully`, 'success');
        await loadDocuments();
    } catch (error) {
        fileItem.status = 'error';
        showNotification(`Upload failed: ${error.message}`, 'error');
    }

    updateFilesList();
    hideUploadProgress();
}

async function loadDocuments() {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_BASE_URL}/documents`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Failed to load documents');

        const data = await response.json();
        uploadedFiles = data.documents || [];
        updateFilesList();
    } catch (error) {
        console.error('Failed to load documents:', error);
    }
}

async function deleteFile(fileId) {
    if (!confirm('Delete this file?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ fileKey: fileId })
        });

        if (!response.ok) throw new Error('Delete failed');

        showNotification('File deleted', 'success');
        await loadDocuments();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function updateFilesList() {
    if (!uploadedFiles.length) {
        filesList.innerHTML = '<p class="no-files">No documents uploaded</p>';
        return;
    }

    filesList.innerHTML = uploadedFiles.map(file => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-size">${file.size || file.sizeReadable || ''}</div>
            </div>
            <div class="file-actions">
                <button onclick="deleteFile('${file.s3Key || file.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function showUploadProgress(fileName) {
    uploadProgress.style.display = 'block';
    progressText.textContent = `Uploading ${fileName}...`;
    progressFill.style.width = '50%';
}

function hideUploadProgress() {
    setTimeout(() => {
        uploadProgress.style.display = 'none';
        progressFill.style.width = '0%';
    }, 1000);
}

// Chat Session Functions
function initializeSessions() {
    newChatButton.addEventListener('click', startNewChat);
}

function startNewChat() {
    currentSessionId = null;
    chatHistory = [];
    chatMessages.innerHTML = '<div class="message bot-message"><p>Hello! Upload documents and ask me questions about them.</p></div>';
    chatInput.value = '';
    updateSessionsList();
}

async function loadChatSessions() {
    if (!authToken) return;

    try {
        const stored = localStorage.getItem(`ragChatSessions_${currentUser.id}`);
        if (stored) {
            chatSessions = JSON.parse(stored);
        } else {
            chatSessions = [];
        }
        updateSessionsList();
    } catch (error) {
        console.error('Failed to load sessions:', error);
    }
}

async function saveChatSession() {
    if (!authToken || !currentSessionId || chatHistory.length === 0) return;

    try {
        // Update session in local storage
        const sessionIndex = chatSessions.findIndex(s => s.id === currentSessionId);
        if (sessionIndex !== -1) {
            chatSessions[sessionIndex] = {
                id: currentSessionId,
                title: chatHistory[0]?.content?.substring(0, 50) || 'Untitled Chat',
                timestamp: new Date(chatSessions[sessionIndex].timestamp),
                messages: chatHistory
            };
        }
        localStorage.setItem(`ragChatSessions_${currentUser.id}`, JSON.stringify(chatSessions));
        updateSessionsList();
    } catch (error) {
        console.error('Failed to save session:', error);
    }
}

function updateSessionsList() {
    if (!chatSessions || chatSessions.length === 0) {
        sessionsList.innerHTML = '<p class="no-sessions">No chat sessions</p>';
        return;
    }

    sessionsList.innerHTML = chatSessions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(session => `
            <div class="session-item ${session.id === currentSessionId ? 'active' : ''}" onclick="loadChatSession('${session.id}')">
                <div class="session-info">
                    <span class="session-title">${escapeHtml(session.title)}</span>
                    <span class="session-date">${new Date(session.timestamp).toLocaleDateString()}</span>
                </div>
                <button class="session-delete-btn" onclick="event.stopPropagation(); deleteSession('${session.id}')">Delete</button>
            </div>
        `).join('');
}

function deleteSession(sessionId) {
    const sessionIndex = chatSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;

    chatSessions.splice(sessionIndex, 1);
    if (currentSessionId === sessionId) {
        startNewChat();
    } else {
        updateSessionsList();
    }
    localStorage.setItem(`ragChatSessions_${currentUser.id}`, JSON.stringify(chatSessions));
    showNotification('Chat session deleted', 'success');
}

function loadChatSession(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    currentSessionId = sessionId;
    chatHistory = session.messages || [];

    // Clear and repopulate messages
    chatMessages.innerHTML = session.messages
        .map(msg => `
            <div class="message ${msg.role}-message">
                <p>${escapeHtml(msg.content)}</p>
            </div>
        `).join('');

    scrollToBottom();
    updateSessionsList();
}

// Chat Functions
function initializeChat() {
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

async function sendMessage() {
    if (!authToken) {
        showNotification('Please log in first', 'error');
        return;
    }

    const message = chatInput.value.trim();
    if (!message) return;

    // Create new session if this is the first message
    if (!currentSessionId) {
        currentSessionId = 'session_' + Date.now();
        chatSessions.unshift({
            id: currentSessionId,
            title: message.substring(0, 50),
            timestamp: new Date().toISOString(),
            messages: []
        });
    }

    addMessageToChat(message, 'user');
    chatInput.value = '';
    sendButton.disabled = true;

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
                chatHistory
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Chat request failed');
        }

        const data = await response.json();
        removeTypingIndicator(typingId);
        addMessageToChat(data.response, 'bot');

        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: data.response });

        saveChatSession();
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToChat('Sorry, an error occurred. Please try again.', 'bot');
        console.error('Chat error:', error);
    }

    sendButton.disabled = false;
}

function addMessageToChat(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = `<p>${escapeHtml(message)}</p>`;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function addTypingIndicator() {
    const typingId = 'typing_' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = typingId;
    typingDiv.innerHTML = '<p>...</p>';
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return typingId;
}

function removeTypingIndicator(typingId) {
    const typingDiv = document.getElementById(typingId);
    if (typingDiv) typingDiv.remove();
}

// Utility Functions
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#000000' : '#ffffff'};
        color: ${type === 'error' ? '#ffffff' : '#000000'};
        border: 2px solid #000000;
        padding: 16px 24px;
        z-index: 1000;
        font-size: 14px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}
