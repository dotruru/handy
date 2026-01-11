/**
 * Particle Physics and Interactions
 */

import { 
    PARTICLE_COUNT, 
    LERP_FACTOR,
    particlePositions, 
    particleTargets, 
    particleColors, 
    particleVelocities,
    particles,
    setParticleTargets 
} from './particles.js';
import { 
    generateTextCoordinates, 
    generateLissajous, 
    generateKochSnowflake,
    generateFibonacciSphere 
} from './shapes.js';
import { leftHandData, rightHandData } from './hands.js';

const REPULSION_STRENGTH = 80;
const REPULSION_RADIUS = 80;

export let currentMode = 'idle';
export let drawingPath = [];
export let lastDrawTime = 0;
export let basketballActive = false;

/**
 * Update particle mode based on hand gestures
 */
export function updateParticleMode() {
    basketballActive = false;

    // Check for basketball mode (both hands open)
    if (leftHandData && rightHandData && 
        leftHandData.fingerCount === 5 && rightHandData.fingerCount === 5) {
        basketballActive = true;
        currentMode = 'basketball';
        return;
    }

    // Left hand mode selection
    if (leftHandData) {
        switch (leftHandData.fingerCount) {
            case 0:
                currentMode = 'drawing';
                break;
            case 1:
                currentMode = 'hello';
                setParticleTargets(
                    generateTextCoordinates('Hello'),
                    { r: 0, g: 1, b: 1 }
                );
                break;
            case 2:
                currentMode = 'aruka';
                setParticleTargets(
                    generateTextCoordinates('aruka'),
                    { r: 1, g: 1, b: 0 }
                );
                break;
            case 3:
                currentMode = 'lissajous';
                setParticleTargets(generateLissajous());
                break;
            case 4:
                currentMode = 'koch';
                setParticleTargets(
                    generateKochSnowflake(),
                    { r: 0, g: 1, b: 0.53 }
                );
                break;
            case 5:
                currentMode = 'catch';
                break;
        }
    }

    // Right hand nebula mode
    if (rightHandData && rightHandData.fingerCount === 5 && currentMode !== 'basketball') {
        if (currentMode !== 'nebula') {
            currentMode = 'nebula';
            // Scatter particles to 3D space
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const i3 = i * 3;
                particleTargets[i3] = (Math.random() - 0.5) * 1200;
                particleTargets[i3 + 1] = (Math.random() - 0.5) * 800;
                particleTargets[i3 + 2] = (Math.random() - 0.5) * 600;
            }
        }
    }
}

/**
 * Update particle physics
 */
export function updateParticles() {
    const time = Date.now() * 0.001;

    // Basketball mode
    if (basketballActive && leftHandData) {
        const sphereCoords = generateFibonacciSphere(PARTICLE_COUNT, 150);
        const palmX = (leftHandData.palmCenter.x - 0.5) * window.innerWidth;
        const palmY = -(leftHandData.palmCenter.y - 0.5) * window.innerHeight;
        const palmZ = 0;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const sphere = sphereCoords[i];
            
            // Target position (sphere around palm)
            const targetX = palmX + sphere.x;
            const targetY = palmY + sphere.y;
            const targetZ = palmZ + sphere.z;

            // Current distance to target
            const dx = targetX - particlePositions[i3];
            const dy = targetY - particlePositions[i3 + 1];
            const dz = targetZ - particlePositions[i3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const progress = 1 - Math.min(dist / 500, 1);

            // Bouncing trajectory
            const bounce = Math.sin(progress * Math.PI * 8) * 30 * (1 - progress);

            particleTargets[i3] = targetX;
            particleTargets[i3 + 1] = targetY + bounce;
            particleTargets[i3 + 2] = targetZ;

            // Orange color with some black seams
            if (i % 20 === 0) {
                particleColors[i3] = 0;
                particleColors[i3 + 1] = 0;
                particleColors[i3 + 2] = 0;
            } else {
                particleColors[i3] = 1;
                particleColors[i3 + 1] = 0.53;
                particleColors[i3 + 2] = 0;
            }
        }
        particles.geometry.attributes.color.needsUpdate = true;
    }

    // Drawing mode
    if (currentMode === 'drawing' && rightHandData) {
        const fingerX = (rightHandData.indexTip.x - 0.5) * window.innerWidth;
        const fingerY = -(rightHandData.indexTip.y - 0.5) * window.innerHeight;

        drawingPath.push({ x: fingerX, y: fingerY, z: 0 });
        lastDrawTime = Date.now();

        if (drawingPath.length > 10) {
            // Distribute particles along path
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const i3 = i * 3;
                const idx = Math.floor((i / PARTICLE_COUNT) * drawingPath.length);
                const point = drawingPath[idx];
                
                particleTargets[i3] = point.x;
                particleTargets[i3 + 1] = point.y;
                particleTargets[i3 + 2] = 0;

                particleColors[i3] = 1;
                particleColors[i3 + 1] = 0;
                particleColors[i3 + 2] = 1;
            }
            particles.geometry.attributes.color.needsUpdate = true;
        }
    }

    // Auto-clear drawing after 10s
    if (drawingPath.length > 0 && Date.now() - lastDrawTime > 10000) {
        drawingPath = [];
    }

    // Right hand scatter/ripple effects
    if (rightHandData && rightHandData.fingerCount < 5 && !basketballActive) {
        const fingerX = (rightHandData.indexTip.x - 0.5) * window.innerWidth;
        const fingerY = -(rightHandData.indexTip.y - 0.5) * window.innerHeight;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const dx = particlePositions[i3] - fingerX;
            const dy = particlePositions[i3 + 1] - fingerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < REPULSION_RADIUS && dist > 0) {
                const force = (REPULSION_STRENGTH / (dist * dist)) * 100;
                particleVelocities[i3] += (dx / dist) * force;
                particleVelocities[i3 + 1] += (dy / dist) * force;
                // No Z-axis displacement
            }
        }
    }

    // Nebula water ripple
    if (currentMode === 'nebula' && rightHandData) {
        const fingerX = (rightHandData.indexTip.x - 0.5) * window.innerWidth;
        const fingerY = -(rightHandData.indexTip.y - 0.5) * window.innerHeight;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const dx = particlePositions[i3] - fingerX;
            const dy = particlePositions[i3 + 1] - fingerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const ripple = Math.sin(dist * 0.02 - time * 5) * 20;
            particleTargets[i3 + 2] += ripple;
        }
    }

    // Update positions with lerp and velocity
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        
        // Apply velocity
        particlePositions[i3] += particleVelocities[i3];
        particlePositions[i3 + 1] += particleVelocities[i3 + 1];
        particlePositions[i3 + 2] += particleVelocities[i3 + 2];

        // Lerp to target
        particlePositions[i3] += (particleTargets[i3] - particlePositions[i3]) * LERP_FACTOR;
        particlePositions[i3 + 1] += (particleTargets[i3 + 1] - particlePositions[i3 + 1]) * LERP_FACTOR;
        particlePositions[i3 + 2] += (particleTargets[i3 + 2] - particlePositions[i3 + 2]) * LERP_FACTOR;

        // Damping
        particleVelocities[i3] *= 0.9;
        particleVelocities[i3 + 1] *= 0.9;
        particleVelocities[i3 + 2] *= 0.9;
    }

    particles.geometry.attributes.position.needsUpdate = true;
}
