const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Historial del lienzo compartido (sin límites)
let drawingHistory = [];
// Lista de usuarios conectados
let users = {};

io.on('connection', (socket) => {
    console.log(`Un usuario se ha conectado: ${socket.id}`);

    // Cuando el usuario define su nombre al entrar
    socket.on('setName', (name) => {
        users[socket.id] = name;
        
        // Enviar historial actual al nuevo usuario
        socket.emit('initHistory', drawingHistory);
        
        // Actualizar lista de usuarios para todos
        io.emit('users', Object.values(users));
    });

    // Recibir lotes de trazos (optimizado para evitar lag a distancia)
    socket.on('drawBatch', (batch) => {
        batch.forEach(data => {
            drawingHistory.push(data);
        });
        socket.broadcast.emit('drawBatch', batch);
    });

    // Recibir trazos individuales por compatibilidad
    socket.on('draw', (data) => {
        drawingHistory.push(data);
        socket.broadcast.emit('draw', data);
        
        if (users[socket.id]) {
            socket.broadcast.emit('userDrawing', users[socket.id]);
        }
    });

    // Recibir uso del balde de relleno
    socket.on('fill', (data) => {
        drawingHistory.push(data);
        socket.broadcast.emit('fill', data);
        
        if (users[socket.id]) {
            socket.broadcast.emit('userDrawing', users[socket.id]);
        }
    });

    // Limpiar lienzo
    socket.on('clear', () => {
        drawingHistory = [];
        io.emit('clear');
    });

    // Desconexión del usuario
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
