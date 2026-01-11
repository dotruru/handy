/**
 * Particle Physics and Interactions - Stark Edition
 * Enhanced with confidence-weighted forces and visual pulses
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
import { leftHandData, rightHandData, leftConfidence, rightConfidence, indexTrail } from './hands.js';

// ============================================
// PHYSICS CONFIGURATION
// ============================================
const REPULSION_STRENGTH = 120;      // Increased for more impact
const REPULSION_RADIUS = 100;        // Slightly larger
const PULSE_DECAY = 0.92;            // How fast pulses fade
const TRANSITION_SPEED = 0.08;       // Shape morph speed

// ============================================
// STATE
// ============================================
export let currentMode = 'idle';
export let previousMode = 'idle';
export let drawingPath = [];
export let lastDrawTime = 0;
export let basketballActive = false;

// Visual pulse state
let pulseIntensity = 0;
let pulseColor = { r: 0, g: 1, b: 1 };

// Transition state for smooth shape morphing
let transitionProgress = 1;
let pendingTargets = null;
let pendingColor = null;

// Smoothed anchor positions for stability
let smoothedPalmX = 0;
let smoothedPalmY = 0;
let smoothedFingerX = 0;
let smoothedFingerY = 0;
const ANCHOR_SMOOTH = 0.3; // Higher = snappier, lower = smoother

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Trigger a visual pulse effect
 */
export function triggerPulse(color = { r: 0, g: 1, b: 1 }, intensity = 1.0) {
    pulseIntensity = Math.max(pulseIntensity, intensity);
    pulseColor = color;
}

/**
 * Get confidence-weighted force multiplier
 */
function getConfidenceMultiplier(confidence) {
    // Scale force by confidence (0.5 to 1.2 range)
    return 0.5 + confidence * 0.7;
}

/**
 * Smoothly transition to new targets
 */
function initiateTransition(coords, color) {
    // Use setParticleTargets directly for immediate visual feedback
    setParticleTargets(coords, color);
    pendingTargets = null;
    pendingColor = null;
    transitionProgress = 1;
}

/**
 * Apply transition interpolation
 */
function updateTransition() {
    if (transitionProgress < 1 && pendingTargets) {
        transitionProgress += TRANSITION_SPEED;
        
        const t = smoothstep(transitionProgress);
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const target = pendingTargets[i % pendingTargets.length];
            
            // Interpolate position
            particleTargets[i3] += (target.x - particleTargets[i3]) * t;
            particleTargets[i3 + 1] += (target.y - particleTargets[i3 + 1]) * t;
            particleTargets[i3 + 2] += ((target.z || 0) - particleTargets[i3 + 2]) * t;
            
            // Interpolate color
            if (pendingColor) {
                particleColors[i3] += (pendingColor.r - particleColors[i3]) * t;
                particleColors[i3 + 1] += (pendingColor.g - particleColors[i3 + 1]) * t;
                particleColors[i3 + 2] += (pendingColor.b - particleColors[i3 + 2]) * t;
            } else if (target.hue !== undefined) {
                // Rainbow for Lissajous
                const hue = target.hue / 360;
                const rgb = hslToRgb(hue, 1, 0.5);
                particleColors[i3] += (rgb.r - particleColors[i3]) * t;
                particleColors[i3 + 1] += (rgb.g - particleColors[i3 + 1]) * t;
                particleColors[i3 + 2] += (rgb.b - particleColors[i3 + 2]) * t;
            }
        }
        
        particles.geometry.attributes.color.needsUpdate = true;
        
        if (transitionProgress >= 1) {
            pendingTargets = null;
            pendingColor = null;
        }
    }
}

/**
 * Smoothstep for easing
 */
function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

/**
 * HSL to RGB conversion
 */
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r, g, b };
}

// ============================================
// MODE MANAGEMENT
// ============================================

export function updateParticleMode() {
    previousMode = currentMode;
    basketballActive = false;

    // Check for basketball mode (both hands open)
    if (leftHandData && rightHandData && 
        leftHandData.fingerCount === 5 && rightHandData.fingerCount === 5) {
        basketballActive = true;
        if (currentMode !== 'basketball') {
            currentMode = 'basketball';
            triggerPulse({ r: 1, g: 0.5, b: 0 }, 1.5); // Orange pulse
        }
        return;
    }

    // Left hand mode selection
    if (leftHandData) {
        const newMode = ['drawing', 'hello', 'aruka', 'lissajous', 'koch', 'catch'][leftHandData.fingerCount];
        
        if (newMode && newMode !== currentMode) {
            currentMode = newMode;
            
            // Trigger appropriate shape with transition
            switch (leftHandData.fingerCount) {
                case 1:
                    initiateTransition(
                        generateTextCoordinates('Hello'),
                        { r: 0, g: 1, b: 1 }
                    );
                    triggerPulse({ r: 0, g: 1, b: 1 }, 1.0);
                    break;
                case 2:
                    initiateTransition(
                        generateTextCoordinates('aruka'),
                        { r: 1, g: 1, b: 0 }
                    );
                    triggerPulse({ r: 1, g: 1, b: 0 }, 1.0);
                    break;
                case 3:
                    initiateTransition(generateLissajous(), null);
                    triggerPulse({ r: 1, g: 0, b: 1 }, 1.0);
                    break;
                case 4:
                    initiateTransition(
                        generateKochSnowflake(),
                        { r: 0, g: 1, b: 0.53 }
                    );
                    triggerPulse({ r: 0, g: 1, b: 0.53 }, 1.0);
                    break;
                case 5:
                    // Catch mode - no shape change
                    triggerPulse({ r: 1, g: 1, b: 1 }, 0.8);
                    break;
            }
        }
    }

    // Right hand nebula mode
    if (rightHandData && rightHandData.fingerCount === 5 && !basketballActive) {
        if (currentMode !== 'nebula') {
            currentMode = 'nebula';
            triggerPulse({ r: 0.5, g: 0.8, b: 1 }, 1.2);
            
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

// ============================================
// MAIN PHYSICS UPDATE
// ============================================

export function updateParticles() {
    const time = Date.now() * 0.001;

    // Update shape transitions
    updateTransition();

    // Update smoothed anchor positions
    if (leftHandData) {
        const targetPalmX = (leftHandData.palmCenter.x - 0.5) * window.innerWidth;
        const targetPalmY = -(leftHandData.palmCenter.y - 0.5) * window.innerHeight;
        smoothedPalmX += (targetPalmX - smoothedPalmX) * ANCHOR_SMOOTH;
        smoothedPalmY += (targetPalmY - smoothedPalmY) * ANCHOR_SMOOTH;
    }
    
    if (rightHandData) {
        const targetFingerX = (rightHandData.indexTip.x - 0.5) * window.innerWidth;
        const targetFingerY = -(rightHandData.indexTip.y - 0.5) * window.innerHeight;
        smoothedFingerX += (targetFingerX - smoothedFingerX) * ANCHOR_SMOOTH;
        smoothedFingerY += (targetFingerY - smoothedFingerY) * ANCHOR_SMOOTH;
    }

    // Confidence multipliers
    const leftMult = leftHandData ? getConfidenceMultiplier(leftHandData.confidence) : 0;
    const rightMult = rightHandData ? getConfidenceMultiplier(rightHandData.confidence) : 0;

    // ----------------------------------------
    // BASKETBALL MODE
    // ----------------------------------------
    if (basketballActive && leftHandData) {
        const sphereCoords = generateFibonacciSphere(PARTICLE_COUNT, 150);
        const palmZ = 0;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const sphere = sphereCoords[i];
            
            // Use smoothed palm position for stability
            const targetX = smoothedPalmX + sphere.x;
            const targetY = smoothedPalmY + sphere.y;
            const targetZ = palmZ + sphere.z;

            // Current distance to target
            const dx = targetX - particlePositions[i3];
            const dy = targetY - particlePositions[i3 + 1];
            const dz = targetZ - particlePositions[i3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const progress = 1 - Math.min(dist / 500, 1);

            // Bouncing trajectory with rotation
            const bounce = Math.sin(progress * Math.PI * 8) * 30 * (1 - progress);
            const rotation = time * 0.5;
            const rotatedX = sphere.x * Math.cos(rotation) - sphere.z * Math.sin(rotation);
            const rotatedZ = sphere.x * Math.sin(rotation) + sphere.z * Math.cos(rotation);

            particleTargets[i3] = smoothedPalmX + rotatedX;
            particleTargets[i3 + 1] = smoothedPalmY + sphere.y + bounce;
            particleTargets[i3 + 2] = palmZ + rotatedZ;

            // Orange color with black seams (basketball pattern)
            const seamFactor = Math.sin(sphere.x * 0.1) * Math.cos(sphere.y * 0.1);
            if (Math.abs(seamFactor) < 0.15 || i % 25 === 0) {
                particleColors[i3] = 0.1;
                particleColors[i3 + 1] = 0.1;
                particleColors[i3 + 2] = 0.1;
            } else {
                particleColors[i3] = 1;
                particleColors[i3 + 1] = 0.5;
                particleColors[i3 + 2] = 0;
            }
        }
        particles.geometry.attributes.color.needsUpdate = true;
    }

    // ----------------------------------------
    // DRAWING MODE
    // ----------------------------------------
    if (currentMode === 'drawing' && rightHandData) {
        // Use smoothed finger position
        drawingPath.push({ x: smoothedFingerX, y: smoothedFingerY, z: 0 });
        lastDrawTime = Date.now();

        // Limit path length for performance
        if (drawingPath.length > 500) {
            drawingPath = drawingPath.slice(-500);
        }

        if (drawingPath.length > 10) {
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const i3 = i * 3;
                const idx = Math.floor((i / PARTICLE_COUNT) * drawingPath.length);
                const point = drawingPath[idx];
                
                particleTargets[i3] = point.x;
                particleTargets[i3 + 1] = point.y;
                particleTargets[i3 + 2] = 0;

                // Gradient along path (magenta to cyan)
                const t = i / PARTICLE_COUNT;
                particleColors[i3] = 1 - t * 0.5;
                particleColors[i3 + 1] = t;
                particleColors[i3 + 2] = 1;
            }
            particles.geometry.attributes.color.needsUpdate = true;
        }
    }

    // Auto-clear drawing after 10s with fade
    if (drawingPath.length > 0 && Date.now() - lastDrawTime > 10000) {
        drawingPath = [];
    }

    // ----------------------------------------
    // RIGHT HAND SCATTER (confidence-weighted)
    // ----------------------------------------
    if (rightHandData && rightHandData.fingerCount < 5 && !basketballActive && currentMode !== 'drawing') {
        const strength = REPULSION_STRENGTH * rightMult;
        const radius = REPULSION_RADIUS * (0.8 + rightMult * 0.4);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const dx = particlePositions[i3] - smoothedFingerX;
            const dy = particlePositions[i3 + 1] - smoothedFingerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius && dist > 0) {
                const force = (strength / (dist * dist)) * 100;
                particleVelocities[i3] += (dx / dist) * force;
                particleVelocities[i3 + 1] += (dy / dist) * force;
                // No Z-axis displacement (flat scatter)
                
                // Trigger small pulse on scatter
                if (dist < radius * 0.5) {
                    triggerPulse({ r: 0, g: 1, b: 1 }, 0.3);
                }
            }
        }
    }

    // ----------------------------------------
    // NEBULA WATER RIPPLE (confidence-weighted)
    // ----------------------------------------
    if (currentMode === 'nebula' && rightHandData) {
        const rippleStrength = 25 * rightMult;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const dx = particlePositions[i3] - smoothedFingerX;
            const dy = particlePositions[i3 + 1] - smoothedFingerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const ripple = Math.sin(dist * 0.02 - time * 5) * rippleStrength;
            particleTargets[i3 + 2] += ripple * 0.1; // Accumulate gently
        }
    }

    // ----------------------------------------
    // PULSE EFFECT (add glow during interactions)
    // ----------------------------------------
    if (pulseIntensity > 0.01) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            // Add pulse color overlay
            particleColors[i3] = Math.min(1, particleColors[i3] + pulseColor.r * pulseIntensity * 0.2);
            particleColors[i3 + 1] = Math.min(1, particleColors[i3 + 1] + pulseColor.g * pulseIntensity * 0.2);
            particleColors[i3 + 2] = Math.min(1, particleColors[i3 + 2] + pulseColor.b * pulseIntensity * 0.2);
        }
        particles.geometry.attributes.color.needsUpdate = true;
        pulseIntensity *= PULSE_DECAY;
    }

    // ----------------------------------------
    // UPDATE POSITIONS (lerp + velocity)
    // ----------------------------------------
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

// ============================================
// EXPORT TRAIL FOR RENDERING
// ============================================
export function getTrailData() {
    return {
        left: indexTrail.left,
        right: indexTrail.right
    };
}
