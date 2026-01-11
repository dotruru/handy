/**
 * Three.js Particle System
 */

import { hslToRgb } from './shapes.js';

// Access global THREE
const THREE = window.THREE;

export const PARTICLE_COUNT = 12000;
export const PARTICLE_SIZE = 2.4;
export const LERP_FACTOR = 0.16;

export let scene, camera, renderer, particles;
export let particlePositions, particleTargets, particleColors, particleVelocities;

/**
 * Initialize Three.js scene and particle system
 */
export function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 600;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Initialize particle arrays
    particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    particleTargets = new Float32Array(PARTICLE_COUNT * 3);
    particleColors = new Float32Array(PARTICLE_COUNT * 3);
    particleVelocities = new Float32Array(PARTICLE_COUNT * 3);

    // Random initial positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        particlePositions[i3] = (Math.random() - 0.5) * 800;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * 600;
        particlePositions[i3 + 2] = (Math.random() - 0.5) * 200;
        
        particleTargets[i3] = particlePositions[i3];
        particleTargets[i3 + 1] = particlePositions[i3 + 1];
        particleTargets[i3 + 2] = particlePositions[i3 + 2];

        particleColors[i3] = 0;
        particleColors[i3 + 1] = 1;
        particleColors[i3 + 2] = 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const material = new THREE.PointsMaterial({
        size: PARTICLE_SIZE,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    window.addEventListener('resize', onResize);
}

/**
 * Handle window resize
 */
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Set particle target positions and colors
 */
export function setParticleTargets(coords, color = null) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const coord = coords[i % coords.length];
        
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

/**
 * Render the scene
 */
export function render() {
    renderer.render(scene, camera);
}
