/**
 * Main Application Entry Point - Stark Edition
 * Enhanced with holo trails and performance monitoring
 */

import { initThree, render } from './particles.js';
import { initMediaPipe, updateHUD, setHandsUpdateCallback, indexTrail, leftHandData, rightHandData } from './hands.js';
import { updateParticleMode, updateParticles, currentMode } from './physics.js';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    targetFPS: 60,
    trailGlowIntensity: 1.5,
    trailFadeSpeed: 0.15,
    enableTrails: true
};

// ============================================
// STATE
// ============================================
let frameCount = 0;
let lastFpsUpdate = Date.now();
let lastFrameTime = Date.now();
let avgFrameTime = 16.67; // ~60fps

// Trail canvas context
let trailCanvas, trailCtx;

// ============================================
// GRID BACKGROUND
// ============================================
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
        offset = (offset + 0.3) % gridSize;

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

// ============================================
// HOLO TRAIL RENDERING
// ============================================
function initTrailCanvas() {
    trailCanvas = document.getElementById('trail-canvas');
    trailCtx = trailCanvas.getContext('2d');
    resizeTrailCanvas();
    window.addEventListener('resize', resizeTrailCanvas);
}

function resizeTrailCanvas() {
    if (trailCanvas) {
        trailCanvas.width = window.innerWidth;
        trailCanvas.height = window.innerHeight;
    }
}

function renderTrails() {
    if (!CONFIG.enableTrails || !trailCtx) return;

    // Clear the trail canvas completely each frame (trails are drawn fresh)
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    // Render right hand trail (always visible, brighter in drawing mode)
    const rightTrail = indexTrail.right;
    if (rightTrail && rightTrail.length > 2) {
        const isDrawing = currentMode === 'drawing';
        const baseAlpha = isDrawing ? 1.0 : 0.6;
        const baseWidth = isDrawing ? 4 : 2;
        
        renderSingleTrail(rightTrail, {
            color: isDrawing ? [255, 0, 255] : [0, 255, 255], // Magenta in draw mode, cyan otherwise
            alpha: baseAlpha,
            width: baseWidth,
            glow: CONFIG.trailGlowIntensity
        });
    }

    // Render left hand trail (more subtle)
    const leftTrail = indexTrail.left;
    if (leftTrail && leftTrail.length > 2) {
        renderSingleTrail(leftTrail, {
            color: [0, 255, 136], // Green
            alpha: 0.4,
            width: 1.5,
            glow: 0.8
        });
    }
}

function renderSingleTrail(trail, options) {
    const { color, alpha, width, glow } = options;
    const len = trail.length;
    
    if (len < 2) return;

    // Glow layer
    trailCtx.shadowBlur = 15 * glow;
    trailCtx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    trailCtx.lineCap = 'round';
    trailCtx.lineJoin = 'round';

    // Draw trail with fading segments
    for (let i = 1; i < len; i++) {
        const prev = trail[i - 1];
        const curr = trail[i];
        
        // Convert normalized coords to screen coords
        const x1 = prev.x * trailCanvas.width + trailCanvas.width / 2;
        const y1 = -prev.y * trailCanvas.height + trailCanvas.height / 2;
        const x2 = curr.x * trailCanvas.width + trailCanvas.width / 2;
        const y2 = -curr.y * trailCanvas.height + trailCanvas.height / 2;

        // Fade based on position in trail
        const t = i / len;
        const segmentAlpha = alpha * t * t; // Quadratic fade for smoother look
        const segmentWidth = width * (0.3 + t * 0.7);

        trailCtx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${segmentAlpha})`;
        trailCtx.lineWidth = segmentWidth;

        trailCtx.beginPath();
        trailCtx.moveTo(x1, y1);
        trailCtx.lineTo(x2, y2);
        trailCtx.stroke();
    }

    // Draw bright tip
    if (len > 0) {
        const tip = trail[len - 1];
        const tipX = tip.x * trailCanvas.width + trailCanvas.width / 2;
        const tipY = -tip.y * trailCanvas.height + trailCanvas.height / 2;

        // Outer glow
        trailCtx.beginPath();
        trailCtx.arc(tipX, tipY, width * 3, 0, Math.PI * 2);
        trailCtx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.3})`;
        trailCtx.fill();

        // Inner bright core
        trailCtx.beginPath();
        trailCtx.arc(tipX, tipY, width * 1.5, 0, Math.PI * 2);
        trailCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        trailCtx.fill();
    }

    // Reset shadow
    trailCtx.shadowBlur = 0;
}

// ============================================
// PERFORMANCE MONITORING
// ============================================
function updatePerformanceMetrics() {
    const now = Date.now();
    const frameTime = now - lastFrameTime;
    lastFrameTime = now;
    
    // Exponential moving average
    avgFrameTime = avgFrameTime * 0.9 + frameTime * 0.1;
    
    // Adaptive quality (future use)
    if (avgFrameTime > 20) { // Below ~50fps
        // Could reduce particle count or disable effects here
    }
}

// ============================================
// ANIMATION LOOP
// ============================================
function animate() {
    requestAnimationFrame(animate);

    updatePerformanceMetrics();
    updateParticles();
    render();
    renderTrails();

    // FPS counter
    frameCount++;
    const now = Date.now();
    if (now - lastFpsUpdate >= 1000) {
        document.getElementById('fps').textContent = frameCount;
        frameCount = 0;
        lastFpsUpdate = now;
    }
}

// ============================================
// INITIALIZATION
// ============================================
export default async function init() {
    initGrid();
    initTrailCanvas();
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

// Wait for global libraries to load
function startWhenReady() {
    if (window.THREE && window.Hands && window.Camera) {
        init();
    } else {
        setTimeout(startWhenReady, 50);
    }
}

startWhenReady();
