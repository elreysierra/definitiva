const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

let drawingHistory = [];
let users = {};

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    socket.emit('initHistory', drawingHistory);

    socket.on('setName', (name) => {
        users[socket.id] = name;
        updateUserList();
    });

    socket.on('draw', (data) => {
        if (drawingHistory.length > 5000) {
            drawingHistory.shift();
        }
        drawingHistory.push(data);
        socket.broadcast.emit('draw', data);
    });

    socket.on('fill', (data) => {
        if (drawingHistory.length > 5000) {
            drawingHistory.shift();
        }
        drawingHistory.push(data);
        socket.broadcast.emit('fill', data);
    });

    socket.on('clear', () => {
        drawingHistory = [];
        io.emit('clear');
    });

    socket.on('cursorMove', (data) => {
        socket.broadcast.emit('cursorMove', {
            id: socket.id,
            xPercent: data.xPercent,
            yPercent: data.yPercent,
            size: data.size,
            visible: data.visible
        });
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        delete users[socket.id];
        updateUserList();
        io.emit('removeCursor', socket.id);
    });
});

function updateUserList() {
    const userNames = Object.values(users);
    io.emit('users', userNames);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT} ❤️`);
});
