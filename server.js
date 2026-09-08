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

    // Enviar historial al usuario recién conectado
    socket.emit('initHistory', drawingHistory);

    socket.on('setName', (name) => {
        users[socket.id] = name;
        updateUserList();
    });

    // Manejo de trazos en lote (Batching para eliminar el lag y acelerar la red)
    socket.on('drawBatch', (batch) => {
        batch.forEach(data => {
            if (drawingHistory.length > 5000) {
                drawingHistory.shift();
            }
            drawingHistory.push(data);
        });
        socket.broadcast.emit('drawBatch', batch);
    });

    // Manejo de trazos individuales (por compatibilidad)
    socket.on('draw', (data) => {
        if (drawingHistory.length > 5000) {
            drawingHistory.shift();
        }
        drawingHistory.push(data);
        socket.broadcast.emit('draw', data);
    });

    // Manejo del bote de pintura (relleno)
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

    // Movimiento de cursor y lógica de Kuromi para el borrador
    socket.on('cursorMove', (data) => {
        socket.broadcast.emit('cursorMove', {
            id: socket.id,
            xPercent: data.xPercent,
            yPercent: data.yPercent,
            isEraser: data.isEraser,
            name: data.name
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
