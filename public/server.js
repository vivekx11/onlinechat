const socket = io();

const roleSelection = document.getElementById('role-selection');
const adminSection = document.getElementById('admin-section');
const adminRoomSection = document.getElementById('admin-room-section');
const userSection = document.getElementById('user-section');
const userChatSection = document.getElementById('user-chat-section');
const adminBtn = document.getElementById('admin-btn');
const userBtn = document.getElementById('user-btn');
const roomNameInput = document.getElementById('room-name');
const roomPasswordInput = document.getElementById('room-password');
const createRoomBtn = document.getElementById('create-room-btn');
const userNameInput = document.getElementById('user-name');
const joinRoomNameInput = document.getElementById('join-room-name');
const joinRoomPasswordInput = document.getElementById('join-room-password');
const joinRoomBtn = document.getElementById('join-room-btn');
const joinStatus = document.getElementById('join-status');
const requestsList = document.getElementById('requests-list');
const roomNameDisplay = document.getElementById('room-name-display');
const roomPasswordDisplay = document.getElementById('room-password-display');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messages = document.getElementById('messages');
const usersList = document.getElementById('users');
const typingIndicator = document.getElementById('typing-indicator');

let currentUserName = '';
let currentRoomName = '';

// Role selection
adminBtn.addEventListener('click', () => {
    roleSelection.style.display = 'none';
    adminSection.style.display = 'block';
});

userBtn.addEventListener('click', () => {
    roleSelection.style.display = 'none';
    userSection.style.display = 'block';
});

// Admin create room
createRoomBtn.addEventListener('click', () => {
    const roomName = roomNameInput.value.trim();
    const password = roomPasswordInput.value.trim();
    if (roomName && password) {
        socket.emit('create-room', { roomName, password });
        currentRoomName = roomName;
        roomNameDisplay.textContent = roomName;
        roomPasswordDisplay.textContent = `Password: ${password}`;
        adminSection.style.display = 'none';
        adminRoomSection.style.display = 'flex';
        roomNameInput.value = '';
        roomPasswordInput.value = '';
    }
});

// User join room
joinRoomBtn.addEventListener('click', () => {
    const userName = userNameInput.value.trim();
    const roomName = joinRoomNameInput.value.trim();
    const password = joinRoomPasswordInput.value.trim();
    if (userName && roomName && password) {
        currentUserName = userName;
        socket.emit('request-join', { userName, roomName, password });
        joinStatus.textContent = 'Waiting for admin approval...';
        joinStatus.style.color = '#e0e0ff';
        joinStatus.style.display = 'block';
    }
});

// Send message
sendBtn.addEventListener('click', () => {
    sendMessage();
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

messageInput.addEventListener('input', () => {
    socket.emit('typing', currentUserName);
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('send-message', message);
        appendMessage(currentUserName, message, true);
        messageInput.value = '';
        socket.emit('stop-typing');
    }
}

// Append message with avatar
function appendMessage(username, message, isSelf = false) {
    const div = document.createElement('div');
    div.className = `message ${isSelf ? 'self' : ''}`;
    const avatarUrl = `https://i.pravatar.cc/40?img=${Math.floor(Math.random() * 70)}`;
    div.innerHTML = `
        ${isSelf ? '' : `<img src="${avatarUrl}" class="avatar" alt="Avatar">`}
        <div>
            <div class="username">${username}</div>
            <div class="bubble">${message}</div>
        </div>
        ${isSelf ? `<img src="${avatarUrl}" class="avatar" alt="Avatar">` : ''}
    `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// Append notification
function appendNotification(text) {
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// Update users list
function updateUsers(users) {
    usersList.innerHTML = '';
    users.forEach((user) => {
        const li = document.createElement('li');
        li.textContent = user;
        usersList.appendChild(li);
    });
}

// Handle join requests (Admin)
socket.on('join-request', ({ userName, roomName, requestId }) => {
    const li = document.createElement('li');
    li.id = `request-${requestId}`;
    li.innerHTML = `
        <p>${userName} wants to join ${roomName}</p>
        <button class="accept-btn" onclick="handleRequest('approve', '${requestId}')">Accept</button>
        <button class="reject-btn" onclick="handleRequest('reject', '${requestId}')">Reject</button>
    `;
    requestsList.appendChild(li);
});

// Handle accept/reject to remove notification
function handleRequest(action, requestId) {
    const requestElement = document.getElementById(`request-${requestId}`);
    if (requestElement) {
        requestElement.remove();
        socket.emit(`${action}-join`, requestId);
    }
}

// Handle join response (User)
socket.on('join-approved', ({ roomName, users }) => {
    userSection.style.display = 'none';
    userChatSection.style.display = 'block';
    joinStatus.style.display = 'none';
    currentRoomName = roomName;
    updateUsers(users);
});

socket.on('join-rejected', () => {
    joinStatus.textContent = 'Sorry, your request was not accepted.';
    joinStatus.style.color = '#ff6666';
});

// Chat events
socket.on('chat-message', ({ username, message }) => {
    appendMessage(username, message);
});

socket.on('user-joined', (username) => {
    appendNotification(`${username} joined the room`);
});

socket.on('user-left', (username) => {
    appendNotification(`${username} left the room`);
});

socket.on('update-users', (users) => {
    updateUsers(users);
});

// Typing indicator
socket.on('typing', (username) => {
    if (username !== currentUserName) {
        typingIndicator.style.display = 'block';
    }
});

socket.on('stop-typing', () => {
    typingIndicator.style.display = 'none';
});
