<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pizarra Colaborativa ❤️</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #fce4ec;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
        }
        h1 { color: #d81b60; margin-bottom: 12px; font-size: 1.6rem; }
        .toolbar {
            background: white;
            padding: 12px 20px;
            border-radius: 14px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            display: flex;
            gap: 15px;
            align-items: center;
            margin-bottom: 15px;
            z-index: 10;
        }
        .tool-group { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #ad1457; }
        .toolbar input[type="color"] { border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; background: none; }
        .toolbar input[type="range"] { cursor: pointer; accent-color: #d81b60; }
        .toolbar button {
            padding: 8px 14px;
            border: 2px solid #f8bbd0;
            border-radius: 8px;
            background: #fff;
            cursor: pointer;
            font-weight: bold;
            color: #ad1457;
            outline: none;
            transition: 0.2s;
        }
        .toolbar button:hover, .toolbar button.active { background: #f8bbd0; color: #880e4f; }
        .canvas-container {
            position: relative;
            background: white;
            border-radius: 14px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.12);
            overflow: hidden;
        }
        canvas { display: block; cursor: crosshair; }
        .remote-cursor { position: absolute; pointer-events: none; transform: translate(-50%, -50%); z-index: 100; }
        .user-tag {
            font-size: 10px;
            background: rgba(216, 27, 96, 0.9);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
        }
    </style>
</head>
<body>

    <h1>Pizarra Colaborativa ❤️</h1>

    <div class="toolbar">
        <div class="tool-group">
            <label for="colorPicker">Color:</label>
            <input type="color" id="colorPicker" value="#000000">
        </div>
        <div class="tool-group">
            <label for="brushSize">Grosor:</label>
            <input type="range" id="brushSize" min="1" max="50" value="5">
        </div>
        <button id="btnPen" class="active">Lápiz</button>
        <button id="btnEraser">Borrador (Kuromi)</button>
        <button id="btnClear">Limpiar Todo</button>
    </div>

    <div class="canvas-container">
        <canvas id="whiteboard" width="800" height="500"></canvas>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const canvas = document.getElementById('whiteboard');
        const ctx = canvas.getContext('2d');
        const colorPicker = document.getElementById('colorPicker');
        const sizePicker = document.getElementById('brushSize');
        const btnPen = document.getElementById('btnPen');
        const btnEraser = document.getElementById('btnEraser');
        const btnClear = document.getElementById('btnClear');

        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        let currentTool = 'pen';
        let lastSendTime = 0;
        const throttleInterval = 35; // Control de lag / optimización de red

        let userName = prompt("¿Cómo te llamas?") || "Anónimo";
        socket.emit('setName', userName);

        btnPen.addEventListener('click', () => {
            currentTool = 'pen';
            btnPen.classList.add('active');
            btnEraser.classList.remove('active');
        });

        btnEraser.addEventListener('click', () => {
            currentTool = 'eraser';
            btnEraser.classList.add('active');
            btnPen.classList.remove('active');
        });

        function getCanvasCoordinates(e) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (canvas.width / rect.width),
                y: (e.clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            const pos = getCanvasCoordinates(e);
            lastX = pos.x;
            lastY = pos.y;
        });

        canvas.addEventListener('mousemove', (e) => {
            const pos = getCanvasCoordinates(e);
            const rect = canvas.getBoundingClientRect();
            const now = Date.now();

            // Throttling para evitar lag y saturación
            if (now - lastSendTime > throttleInterval) {
                lastSendTime = now;
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

            drawLine(lastX, lastY, pos.x, pos.y, color, size);

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

        window.addEventListener('mouseup', () => {
            isDrawing = false;
        });

        function drawLine(x0, y0, x1, y1, color, size) {
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.closePath();
        }

        socket.on('initHistory', (history) => {
            history.forEach(data => {
                drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
            });
        });

        socket.on('draw', (data) => {
            drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
        });

        btnClear.addEventListener('click', () => {
            socket.emit('clear');
        });

        socket.on('clear', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        socket.on('cursorMove', (data) => {
            let cursorEl = document.getElementById(`cursor-${data.id}`);
            if (!cursorEl) {
                cursorEl = document.createElement('div');
                cursorEl.id = `cursor-${data.id}`;
                cursorEl.className = 'remote-cursor';
                document.body.appendChild(cursorEl);
            }

            const rect = canvas.getBoundingClientRect();
            cursorEl.style.left = `${rect.left + (data.xPercent * rect.width)}px`;
            cursorEl.style.top = `${rect.top + (data.yPercent * rect.height)}px`;

            if (data.isEraser) {
                cursorEl.innerHTML = `
                    <div class="user-tag">${data.name} (Borrador)</div>
                    <img src="kuromi.png" width="35" style="pointer-events: none;" />
                `;
            } else {
                cursorEl.innerHTML = `
                    <div class="user-tag">${data.name}</div>
                    <div style="width: 8px; height: 8px; background: #ff4081; border-radius: 50%; box-shadow: 0 0 4px white;"></div>
                `;
            }
        });

        socket.on('removeCursor', (id) => {
            const cursorEl = document.getElementById(`cursor-${id}`);
            if (cursorEl) cursorEl.remove();
        });
    </script>
</body>
</html>
