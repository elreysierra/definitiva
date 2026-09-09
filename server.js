const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// ===============================
// SOCKET.IO
// ===============================
const io = new Server(server, {
    transports: ['polling', 'websocket'],

    // Evita problemas si el cliente está en otro origen
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },

    // Permite enviar lotes relativamente grandes
    maxHttpBufferSize: 1e6,

    // Tiempo de espera de conexión
    pingTimeout: 20000,
    pingInterval: 25000
});

// ===============================
// ARCHIVOS DE LA PÁGINA
// ===============================
app.use(express.static(path.join(__dirname, 'public')));


// ===============================
// HISTORIAL DEL DIBUJO
// ===============================

// Evita que la memoria crezca para siempre
const MAX_HISTORY = 50000;
let drawingHistory = [];


// ===============================
// USUARIOS
// ===============================
const users = {};


// ===============================
// CONEXIONES
// ===============================
io.on('connection', (socket) => {

    console.log(`🟢 Usuario conectado: ${socket.id}`);

    // =====================================
    // EL USUARIO PONE SU NOMBRE
    // =====================================
    socket.on('setName', (name) => {
        if (!name || typeof name !== 'string') {
            return;
        }

        const cleanName = name.trim().substring(0, 30);
        users[socket.id] = cleanName;

        // Mandar historial al usuario que acaba de entrar
        socket.emit('initHistory', drawingHistory);

        // Actualizar lista de usuarios a TODOS inmediatamente
        io.emit('users', Object.values(users));

        console.log(`👤 ${cleanName} se ha unido`);
    });


    // =====================================
    // DIBUJO POR LOTES / TRAZOS
    // =====================================
    socket.on('drawBatch', (batch) => {
        if (!Array.isArray(batch)) {
            return;
        }

        if (batch.length === 0 || batch.length > 1000) {
            return;
        }

        // Guardar en historial
        drawingHistory.push(...batch);

        // Limitar historial
        if (drawingHistory.length > MAX_HISTORY) {
            drawingHistory.splice(
                0,
                drawingHistory.length - MAX_HISTORY
            );
        }

        // Mandar el lote a todos MENOS al que lo envió (el cliente ya lo pinta localmente al instante)
        socket.broadcast.emit('drawBatch', batch);
    });


    // =====================================
    // RELLENO / BALDE
    // =====================================
    socket.on('fill', (data) => {
        if (!data || typeof data !== 'object') {
            return;
        }

        drawingHistory.push(data);

        // Limitar historial
        if (drawingHistory.length > MAX_HISTORY) {
            drawingHistory.splice(
                0,
                drawingHistory.length - MAX_HISTORY
            );
        }

        socket.broadcast.emit('fill', data);
    });


    // =====================================
    // LIMPIAR LIENZO
    // =====================================
    socket.on('clear', () => {
        drawingHistory = [];
        io.emit('clear');
        console.log('🧹 Lienzo limpiado');
    });


    // =====================================
    // DESCONECTAR
    // =====================================
    socket.on('disconnect', (reason) => {
        const name = users[socket.id];

        console.log(`🔴 Usuario desconectado: ${socket.id} (${reason})`);

        delete users[socket.id];

        // Actualizar usuarios a TODOS los que sigan en la sala
        io.emit('users', Object.values(users));

        if (name) {
            console.log(`👋 ${name} salió de la sala`);
        }
    });

});


// ===============================
// SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log('');
    console.log('================================');
    console.log('❤️ SERVIDOR DE DIBUJO ACTIVO');
    console.log(`🌐 Puerto: ${PORT}`);
    console.log('================================');
    console.log('');
});
