/**
 * Main Application Entry Point
 */

import { initThree, render } from './particles.js';
import { initMediaPipe, updateHUD, setHandsUpdateCallback } from './hands.js';
import { updateParticleMode, updateParticles } from './physics.js';

// FPS Counter
let frameCount = 0;
let lastFpsUpdate = Date.now();

/**
 * Initialize cyberpunk grid background
 */
function initGrid() {
    const canvas = document.getElementById('grid-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let offset = 0;
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 0.5;

        const gridSize = 50;
        offset = (offset + 0.5) % gridSize;

        // Vertical lines
        for (let x = -offset; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = -offset; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        requestAnimationFrame(drawGrid);
    }
    drawGrid();
}

/**
 * Animation loop
 */
function animate() {
    requestAnimationFrame(animate);

    updateParticles();
    render();

    // FPS counter
    frameCount++;
    const now = Date.now();
    if (now - lastFpsUpdate >= 1000) {
        document.getElementById('fps').textContent = frameCount;
        frameCount = 0;
        lastFpsUpdate = now;
    }
}

/**
 * Initialize application
 */
export default async function init() {
    initGrid();
    initThree();

    // Set up hand tracking callback
    setHandsUpdateCallback((leftHand, rightHand) => {
        updateHUD();
        updateParticleMode();
    });

    // Initialize MediaPipe
    const video = document.getElementById('video');
    const success = await initMediaPipe(video);

    if (success) {
        document.getElementById('loading').classList.add('hidden');
        animate();
    } else {
        document.getElementById('loading').textContent = 'CAMERA ACCESS DENIED';
    }
}

// Wait for global libraries to load, then start
function startWhenReady() {
    if (window.THREE && window.Hands && window.Camera) {
        init();
    } else {
        setTimeout(startWhenReady, 50);
    }
}

startWhenReady();
