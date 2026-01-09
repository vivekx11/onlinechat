const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store rooms and users
const rooms = {}; // { roomName: { password, adminSocketId, users: { socketId: username } } }
const pendingRequests = {}; // { requestId: { userName, roomName, socketId } }

io.on('connection', (socket) => {
    // Create room (Admin)
    socket.on('create-room', ({ roomName, password }) => {
        if (rooms[roomName]) {
            socket.emit('error', 'Room already exists');
            return;
        }
        rooms[roomName] = {
            password,
            adminSocketId: socket.id,
            users: {}
        };
        socket.join(roomName);
    });

    // Request to join (User)
    socket.on('request-join', ({ userName, roomName, password }) => {
        const room = rooms[roomName];
        if (!room) {
            socket.emit('join-rejected', 'Room does not exist');
            return;
        }
        if (room.password !== password) {
            socket.emit('join-rejected', 'Incorrect password');
            return;
        }
        const requestId = Math.random().toString(36).substring(2);
        pendingRequests[requestId] = { userName, roomName, socketId: socket.id };
        io.to(room.adminSocketId).emit('join-request', { userName, roomName, requestId });
    });

    // Approve join (Admin)
    socket.on('approve-join', (requestId) => {
        const request = pendingRequests[requestId];
        if (!request) return;
        const { userName, roomName, socketId } = request;
        const room = rooms[roomName];
        if (!room) return;

        room.users[socketId] = userName;
        io.to(socketId).emit('join-approved', { roomName, users: Object.values(room.users) });
        io.to(roomName).emit('user-joined', userName);
        io.to(roomName).emit('update-users', Object.values(room.users));
        delete pendingRequests[requestId];
    });

    // Reject join (Admin)
    socket.on('reject-join', (requestId) => {
        const request = pendingRequests[requestId];
        if (request) {
            io.to(request.socketId).emit('join-rejected');
            delete pendingRequests[requestId];
        }
    });

    // Send message
    socket.on('send-message', (message) => {
        const roomName = Object.keys(socket.rooms).find(room => room !== socket.id);
        if (roomName && rooms[roomName]) {
            const username = rooms[roomName].users[socket.id];
            io.to(roomName).emit('chat-message', { username, message });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        for (const roomName in rooms) {
            const room = rooms[roomName];
            if (room.users[socket.id]) {
                const username = room.users[socket.id];
                delete room.users[socket.id];
                io.to(roomName).emit('user-left', username);
                io.to(roomName).emit('update-users', Object.values(room.users));
                if (room.adminSocketId === socket.id) {
                    delete rooms[roomName];
                }
            }
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});