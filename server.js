const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    transports: ['websocket']
});

app.use(express.static(path.join(__dirname, 'public')));

// Historial
let drawingHistory = [];

// Usuarios
const users = {};

io.on('connection', (socket) => {

    console.log(`Usuario conectado: ${socket.id}`);

    // =========================
    // NOMBRE DEL USUARIO
    // =========================
    socket.on('setName', (name) => {

        users[socket.id] = name;

        // Enviar historial solamente al usuario nuevo
        socket.emit('initHistory', drawingHistory);

        // Actualizar usuarios
        io.emit('users', Object.values(users));
    });


    // =========================
    // DIBUJAR POR LOTES
    // =========================
    socket.on('drawBatch', (batch) => {

        if (!Array.isArray(batch) || batch.length === 0) {
            return;
        }

        // Guardar historial
        drawingHistory.push(...batch);

        // Enviar únicamente a los demás
        socket.broadcast.emit('drawBatch', batch);
    });


    // =========================
    // COMENZÓ A DIBUJAR
    // =========================
    socket.on('drawingStart', () => {

        if (users[socket.id]) {
            socket.broadcast.emit(
                'userDrawing',
                users[socket.id]
            );
        }
    });


    // =========================
    // TERMINÓ DE DIBUJAR
    // =========================
    socket.on('drawingEnd', () => {

        socket.broadcast.emit('userStoppedDrawing');
    });


    // =========================
    // RELLENO
    // =========================
    socket.on('fill', (data) => {

        drawingHistory.push(data);

        socket.broadcast.emit('fill', data);
    });


    // =========================
    // LIMPIAR
    // =========================
    socket.on('clear', () => {

        drawingHistory = [];

        io.emit('clear');
    });


    // =========================
    // DESCONECTAR
    // =========================
    socket.on('disconnect', () => {

        console.log(`Usuario desconectado: ${socket.id}`);

        delete users[socket.id];

        io.emit('users', Object.values(users));
    });

});


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT} ❤️`);
});
