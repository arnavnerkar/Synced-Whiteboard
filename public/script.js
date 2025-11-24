const socket = io();
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const lineWidthRange = document.getElementById('lineWidth');

let drawing = false;
let current = { x: 0, y: 0 };
let color = '#000000';
let lineWidth = 5;

// --- Configuration ---

// Update settings from UI
colorPicker.addEventListener('change', (e) => {
    color = e.target.value;
});

lineWidthRange.addEventListener('input', (e) => {
    lineWidth = e.target.value;
});

// --- Canvas Sizing ---

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Drawing Logic ---

function drawLine(x0, y0, x1, y1, color, width, emit) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();

    if (!emit) return;

    const w = canvas.width;
    const h = canvas.height;

    socket.emit('drawing', {
        x0: x0 / w,
        y0: y0 / h,
        x1: x1 / w,
        y1: y1 / h,
        color: color,
        thickness: width
    });
}

// --- Input Handling ---

function getPos(e) {
    if (e.touches && e.touches.length > 0) {
        return {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    }
    return {
        x: e.clientX,
        y: e.clientY
    };
}

function onMouseDown(e) {
    drawing = true;
    const pos = getPos(e);
    current.x = pos.x;
    current.y = pos.y;
}

function onMouseUp(e) {
    if (!drawing) return;
    drawing = false;
    const pos = getPos(e);
    drawLine(current.x, current.y, pos.x, pos.y, color, lineWidth, true);
}

function onMouseMove(e) {
    if (!drawing) return;
    const pos = getPos(e);
    drawLine(current.x, current.y, pos.x, pos.y, color, lineWidth, true);
    current.x = pos.x;
    current.y = pos.y;
}

// Throttle function to limit event rate
function throttle(callback, delay) {
    let previousCall = new Date().getTime();
    return function () {
        const time = new Date().getTime();

        if ((time - previousCall) >= delay) {
            previousCall = time;
            callback.apply(null, arguments);
        }
    };
}

// --- Event Listeners ---

canvas.addEventListener('mousedown', onMouseDown, false);
canvas.addEventListener('mouseup', onMouseUp, false);
canvas.addEventListener('mouseout', onMouseUp, false);
canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

// Touch support
canvas.addEventListener('touchstart', (e) => {
    // Prevent scrolling on touch devices
    if (e.target == canvas) {
        e.preventDefault();
    }
    onMouseDown(e);
}, { passive: false });

canvas.addEventListener('touchend', onMouseUp, false);
canvas.addEventListener('touchcancel', onMouseUp, false);
canvas.addEventListener('touchmove', (e) => {
    if (e.target == canvas) {
        e.preventDefault();
    }
    throttle(onMouseMove, 10)(e);
}, { passive: false });

// --- Socket Events ---

function onDrawingEvent(data) {
    const w = canvas.width;
    const h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.thickness, false);
}

socket.on('drawing', onDrawingEvent);
