let lastSendTime = 0;
const throttleInterval = 35; // Milisegundos entre cada envío para evitar saturación de red

canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasCoordinates(e);
    const rect = canvas.getBoundingClientRect();
    const now = Date.now();

    // Throttling: Solo envía datos a los demás a intervalos controlados
    if (now - lastSendTime > throttleInterval) {
        lastSendTime = now;

        // Enviar posición del cursor y si usa el borrador (Kuromi)
        socket.emit('cursorMove', {
            xPercent: (e.clientX - rect.left) / rect.width,
            yPercent: (e.clientY - rect.top) / rect.height,
            isEraser: (currentTool === 'eraser'),
            name: userName
        });
    }

    if (!isDrawing) return;

    const color = currentTool === 'eraser' ? '#FFFFFF' : colorPicker.value;
    const size = currentTool === 'eraser' ? Number(sizePicker.value) * 3 : Number(sizePicker.value);

    // Dibujar localmente al instante para cero retraso visual propio
    drawLine(lastX, lastY, pos.x, pos.y, color, size);

    // Enviar el trazo al servidor
    socket.emit('draw', {
        x0: lastX,
        y0: lastY,
        x1: pos.x,
        y1: pos.y,
        color: color,
        size: size
    });

    lastX = pos.x;
    lastY = pos.y;
});
