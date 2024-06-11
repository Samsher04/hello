const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const users = {};

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('join-room', (roomId, userId) => {
    if (!users[roomId]) users[roomId] = [];
    if (users[roomId].length >= 2) {
      socket.emit('room-full');
      return;
    }
    
    users[roomId].push(userId);
    socket.join(roomId);

    socket.to(roomId).emit('user-connected', userId);
    io.to(socket.id).emit('waiting-for-partner', users[roomId].length < 2);

    socket.on('disconnect', () => {
      users[roomId] = users[roomId].filter((id) => id !== userId);
      socket.to(roomId).emit('user-disconnected', userId);
      if (users[roomId].length === 0) {
        delete users[roomId];
      }
    });
  });

  socket.on('send-message', (roomId, message) => {
    socket.to(roomId).emit('receive-message', message);
  });

  socket.on('send-signal', (roomId, signal) => {
    socket.to(roomId).emit('receive-signal', signal);
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
