/**
 * Three.js Particle System - Stark Edition
 * Enhanced with performance optimizations
 */

import { hslToRgb } from './shapes.js';

// Access global THREE
const THREE = window.THREE;

// ============================================
// CONFIGURATION
// ============================================
export const PARTICLE_COUNT = 12000;
export const PARTICLE_SIZE = 2.4;
export const LERP_FACTOR = 0.16;

// Performance settings
const MAX_PIXEL_RATIO = 2; // Cap pixel ratio for performance
const ANTIALIAS_THRESHOLD = 10000; // Disable antialias above this particle count

// ============================================
// STATE
// ============================================
export let scene, camera, renderer, particles;
export let particlePositions, particleTargets, particleColors, particleVelocities;

// ============================================
// INITIALIZATION
// ============================================

export function initThree() {
    scene = new THREE.Scene();
    
    // Camera with reasonable FOV for particles
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 600;

    // Renderer with performance optimizations
    const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    const useAntialias = PARTICLE_COUNT < ANTIALIAS_THRESHOLD;
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: useAntialias, 
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Initialize particle arrays
    particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    particleTargets = new Float32Array(PARTICLE_COUNT * 3);
    particleColors = new Float32Array(PARTICLE_COUNT * 3);
    particleVelocities = new Float32Array(PARTICLE_COUNT * 3);

    // Random initial positions - clustered in center
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        
        // Gaussian-like distribution for more interesting initial state
        const r = Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        particlePositions[i3] = r * Math.sin(phi) * Math.cos(theta);
        particlePositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        particlePositions[i3 + 2] = r * Math.cos(phi) * 0.3; // Flattened
        
        particleTargets[i3] = particlePositions[i3];
        particleTargets[i3 + 1] = particlePositions[i3 + 1];
        particleTargets[i3 + 2] = particlePositions[i3 + 2];

        // Initial cyan color
        particleColors[i3] = 0;
        particleColors[i3 + 1] = 1;
        particleColors[i3 + 2] = 1;
    }

    // Create geometry with dynamic draw usage for frequent updates
    const geometry = new THREE.BufferGeometry();
    
    const positionAttr = new THREE.BufferAttribute(particlePositions, 3);
    positionAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positionAttr);
    
    const colorAttr = new THREE.BufferAttribute(particleColors, 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('color', colorAttr);

    // Material with additive blending for glow
    const material = new THREE.PointsMaterial({
        size: PARTICLE_SIZE,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Handle resize
    window.addEventListener('resize', onResize);
}

// ============================================
// RESIZE HANDLER
// ============================================

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// PARTICLE TARGET SETTERS
// ============================================

export function setParticleTargets(coords, color = null) {
    const coordLen = coords.length;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const coord = coords[i % coordLen];
        
        particleTargets[i3] = coord.x;
        particleTargets[i3 + 1] = coord.y;
        particleTargets[i3 + 2] = coord.z || 0;

        if (color) {
            particleColors[i3] = color.r;
            particleColors[i3 + 1] = color.g;
            particleColors[i3 + 2] = color.b;
        } else if (coord.hue !== undefined) {
            // Rainbow gradient for Lissajous
            const rgb = hslToRgb(coord.hue / 360, 1, 0.5);
            particleColors[i3] = rgb.r;
            particleColors[i3 + 1] = rgb.g;
            particleColors[i3 + 2] = rgb.b;
        }
    }

    particles.geometry.attributes.color.needsUpdate = true;
}

// ============================================
// RENDER
// ============================================

export function render() {
    renderer.render(scene, camera);
}

// ============================================
// PERFORMANCE UTILITIES
// ============================================

/**
 * Get current rendering stats
 */
export function getStats() {
    const info = renderer.info;
    return {
        triangles: info.render.triangles,
        points: info.render.points,
        calls: info.render.calls,
        frame: info.render.frame
    };
}

/**
 * Reduce particle opacity for performance mode
 */
export function setPerformanceMode(enabled) {
    if (particles && particles.material) {
        particles.material.opacity = enabled ? 0.6 : 0.85;
        particles.material.size = enabled ? PARTICLE_SIZE * 0.8 : PARTICLE_SIZE;
        particles.material.needsUpdate = true;
    }
}
