/**
 * MediaPipe Hands Integration - Stark Edition
 * Enhanced with smoothing, debounce, and confidence tracking
 */

// Access global MediaPipe objects
const Hands = window.Hands;
const Camera = window.Camera;

// ============================================
// CONFIGURATION
// ============================================
export const CONFIG = {
    modelComplexity: 1,              // 1 is most stable (0=lite, 1=full, 2=heavy but less stable)
    minDetectionConfidence: 0.6,     // Lower = more sensitive detection
    minTrackingConfidence: 0.7,      // Higher = more stable tracking
    smoothingBeta: 0.4,              // One Euro Filter: lower = smoother
    smoothingMinCutoff: 1.0,         // One Euro Filter: frequency cutoff
    smoothingDCutoff: 1.0,           // One Euro Filter: derivative cutoff
    gestureDebounceFrames: 3,        // Frames required to confirm gesture change
    trailLength: 20                  // Index finger trail history length
};

// ============================================
// STATE
// ============================================
export let leftHandData = null;
export let rightHandData = null;
export let leftConfidence = 0;
export let rightConfidence = 0;

let onHandsUpdateCallback = null;

// Smoothing state per hand (21 landmarks x 3 coords each)
const smoothers = {
    left: null,
    right: null
};

// Gesture debounce state
const gestureState = {
    left: { current: -1, candidate: -1, frameCount: 0 },
    right: { current: -1, candidate: -1, frameCount: 0 }
};

// Index finger trail for holo effect
export const indexTrail = {
    left: [],
    right: []
};

// ============================================
// ONE EURO FILTER (velocity-adaptive smoothing)
// ============================================
class OneEuroFilter {
    constructor(freq, minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
        this.freq = freq;
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.xPrev = null;
        this.dxPrev = 0;
        this.lastTime = null;
    }

    alpha(cutoff) {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        const te = 1.0 / this.freq;
        return 1.0 / (1.0 + tau / te);
    }

    filter(x, timestamp = null) {
        if (this.xPrev === null) {
            this.xPrev = x;
            this.lastTime = timestamp || Date.now();
            return x;
        }

        // Update frequency based on timestamp
        if (timestamp !== null && this.lastTime !== null) {
            const dt = (timestamp - this.lastTime) / 1000;
            if (dt > 0) this.freq = 1.0 / dt;
        }
        this.lastTime = timestamp;

        // Compute derivative
        const dx = (x - this.xPrev) * this.freq;
        const edx = this.alpha(this.dCutoff) * dx + (1 - this.alpha(this.dCutoff)) * this.dxPrev;
        this.dxPrev = edx;

        // Compute cutoff (velocity-adaptive)
        const cutoff = this.minCutoff + this.beta * Math.abs(edx);
        
        // Filter
        const result = this.alpha(cutoff) * x + (1 - this.alpha(cutoff)) * this.xPrev;
        this.xPrev = result;
        
        return result;
    }

    reset() {
        this.xPrev = null;
        this.dxPrev = 0;
        this.lastTime = null;
    }
}

// Create smoother array for a hand (21 landmarks * 3 coords = 63 filters)
function createHandSmoothers() {
    const filters = [];
    for (let i = 0; i < 21 * 3; i++) {
        filters.push(new OneEuroFilter(
            60, // Assume 60fps
            CONFIG.smoothingMinCutoff,
            CONFIG.smoothingBeta,
            CONFIG.smoothingDCutoff
        ));
    }
    return filters;
}

// Apply smoothing to landmarks
function smoothLandmarks(landmarks, smootherArray, timestamp) {
    if (!smootherArray) return landmarks;
    
    return landmarks.map((lm, i) => {
        const baseIdx = i * 3;
        return {
            x: smootherArray[baseIdx].filter(lm.x, timestamp),
            y: smootherArray[baseIdx + 1].filter(lm.y, timestamp),
            z: smootherArray[baseIdx + 2].filter(lm.z || 0, timestamp)
        };
    });
}

// ============================================
// IMPROVED FINGER DETECTION
// ============================================

/**
 * Calculate angle between three points (in radians)
 */
function calculateAngle(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const cross = v1.x * v2.y - v1.y * v2.x;
    return Math.atan2(cross, dot);
}

/**
 * Check if thumb is extended using angle-based detection
 */
function isThumbExtended(landmarks) {
    // Thumb landmarks: 1 (CMC), 2 (MCP), 3 (IP), 4 (TIP)
    const cmc = landmarks[1];
    const mcp = landmarks[2];
    const ip = landmarks[3];
    const tip = landmarks[4];
    
    // Check angle at MCP joint - extended thumb has straighter angle
    const angle = Math.abs(calculateAngle(cmc, mcp, ip));
    
    // Also check distance from tip to palm center
    const palm = landmarks[0];
    const tipDist = Math.sqrt(
        Math.pow(tip.x - palm.x, 2) + 
        Math.pow(tip.y - palm.y, 2)
    );
    const mcpDist = Math.sqrt(
        Math.pow(mcp.x - palm.x, 2) + 
        Math.pow(mcp.y - palm.y, 2)
    );
    
    // Thumb is extended if angle is relatively straight AND tip is further from palm than MCP
    return angle > 2.0 && tipDist > mcpDist * 1.2;
}

/**
 * Check if a finger is extended using improved detection
 */
function isFingerExtended(landmarks, tipIdx, pipIdx, mcpIdx) {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const mcp = landmarks[mcpIdx];
    const palm = landmarks[0];
    
    // Primary check: tip Y vs PIP Y (for upright hand)
    const yExtended = tip.y < pip.y;
    
    // Secondary check: distance from palm
    const tipDist = Math.sqrt(
        Math.pow(tip.x - palm.x, 2) + 
        Math.pow(tip.y - palm.y, 2)
    );
    const pipDist = Math.sqrt(
        Math.pow(pip.x - palm.x, 2) + 
        Math.pow(pip.y - palm.y, 2)
    );
    
    // Finger extended if tip above PIP AND tip further from palm
    return yExtended && tipDist > pipDist * 0.95;
}

/**
 * Count extended fingers with improved accuracy
 */
export function countExtendedFingers(landmarks) {
    let count = 0;

    // Thumb (angle-based)
    if (isThumbExtended(landmarks)) {
        count++;
    }

    // Index finger (tip: 8, PIP: 6, MCP: 5)
    if (isFingerExtended(landmarks, 8, 6, 5)) {
        count++;
    }

    // Middle finger (tip: 12, PIP: 10, MCP: 9)
    if (isFingerExtended(landmarks, 12, 10, 9)) {
        count++;
    }

    // Ring finger (tip: 16, PIP: 14, MCP: 13)
    if (isFingerExtended(landmarks, 16, 14, 13)) {
        count++;
    }

    // Pinky finger (tip: 20, PIP: 18, MCP: 17)
    if (isFingerExtended(landmarks, 20, 18, 17)) {
        count++;
    }

    return count;
}

// ============================================
// GESTURE DEBOUNCING
// ============================================

/**
 * Apply debounce to gesture changes
 * Returns stable finger count (only changes after N consecutive frames)
 */
function debounceGesture(rawCount, state) {
    if (rawCount === state.candidate) {
        state.frameCount++;
        if (state.frameCount >= CONFIG.gestureDebounceFrames) {
            state.current = rawCount;
        }
    } else {
        state.candidate = rawCount;
        state.frameCount = 1;
    }
    return state.current;
}

// ============================================
// TRAIL MANAGEMENT
// ============================================

function updateTrail(trail, point, maxLength) {
    trail.push({
        x: point.x,
        y: point.y,
        z: point.z || 0,
        timestamp: Date.now()
    });
    
    // Keep trail at max length
    while (trail.length > maxLength) {
        trail.shift();
    }
}

// ============================================
// CALLBACK MANAGEMENT
// ============================================

export function setHandsUpdateCallback(callback) {
    onHandsUpdateCallback = callback;
}

// ============================================
// MAIN RESULTS HANDLER
// ============================================

export function onHandsResults(results) {
    const timestamp = Date.now();
    
    leftHandData = null;
    rightHandData = null;
    leftConfidence = 0;
    rightConfidence = 0;

    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const rawLandmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label;
            const confidence = results.multiHandedness[i].score || 0.9;
            
            // Determine which hand (MediaPipe mirrors)
            const isLeft = handedness === 'Right';
            const handKey = isLeft ? 'left' : 'right';
            
            // Initialize smoothers if needed
            if (!smoothers[handKey]) {
                smoothers[handKey] = createHandSmoothers();
            }
            
            // Apply landmark smoothing
            const landmarks = smoothLandmarks(rawLandmarks, smoothers[handKey], timestamp);
            
            // Count fingers with improved detection
            const rawFingerCount = countExtendedFingers(landmarks);
            
            // Apply gesture debouncing
            const stableFingerCount = debounceGesture(rawFingerCount, gestureState[handKey]);
            
            // Update index finger trail
            const trail = indexTrail[handKey];
            updateTrail(trail, landmarks[8], CONFIG.trailLength);
            
            // Build hand data
            const handData = {
                landmarks,
                rawLandmarks,
                fingerCount: stableFingerCount,
                rawFingerCount,
                indexTip: landmarks[8],
                palmCenter: landmarks[0],
                confidence,
                trail: [...trail]
            };

            if (isLeft) {
                leftHandData = handData;
                leftConfidence = confidence;
            } else {
                rightHandData = handData;
                rightConfidence = confidence;
            }
        }
    } else {
        // Reset smoothers and trails when hands lost
        if (!leftHandData && smoothers.left) {
            smoothers.left.forEach(f => f.reset());
            indexTrail.left = [];
            gestureState.left = { current: -1, candidate: -1, frameCount: 0 };
        }
        if (!rightHandData && smoothers.right) {
            smoothers.right.forEach(f => f.reset());
            indexTrail.right = [];
            gestureState.right = { current: -1, candidate: -1, frameCount: 0 };
        }
    }

    // Trigger callback
    if (onHandsUpdateCallback) {
        onHandsUpdateCallback(leftHandData, rightHandData);
    }
}

// ============================================
// MEDIAPIPE INITIALIZATION
// ============================================

export async function initMediaPipe(videoElement) {
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: CONFIG.modelComplexity,
        minDetectionConfidence: CONFIG.minDetectionConfidence,
        minTrackingConfidence: CONFIG.minTrackingConfidence
    });

    hands.onResults(onHandsResults);

    // Start webcam with optimal settings
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 60, min: 30 }
            } 
        });
        videoElement.srcObject = stream;
        
        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 1280,
            height: 720
        });
        camera.start();

        return true;
    } catch (err) {
        console.error('Camera error:', err);
        return false;
    }
}

// ============================================
// HUD UPDATE
// ============================================

export function updateHUD() {
    const leftStatus = document.getElementById('left-status');
    const rightStatus = document.getElementById('right-status');
    const leftConf = document.getElementById('left-confidence');
    const rightConf = document.getElementById('right-confidence');

    if (leftHandData) {
        const modes = ['DRAW MODE', 'HELLO', 'ARUKA', 'LISSAJOUS', 'KOCH', 'CATCH'];
        leftStatus.textContent = modes[leftHandData.fingerCount] || 'ACTIVE';
        if (leftConf) {
            leftConf.textContent = `${Math.round(leftConfidence * 100)}%`;
            leftConf.style.opacity = leftConfidence;
        }
    } else {
        leftStatus.textContent = 'NO SIGNAL';
        if (leftConf) {
            leftConf.textContent = '0%';
            leftConf.style.opacity = 0.3;
        }
    }

    if (rightHandData) {
        if (rightHandData.fingerCount === 5) {
            rightStatus.textContent = 'NEBULA';
        } else {
            rightStatus.textContent = 'SCATTER';
        }
        if (rightConf) {
            rightConf.textContent = `${Math.round(rightConfidence * 100)}%`;
            rightConf.style.opacity = rightConfidence;
        }
    } else {
        rightStatus.textContent = 'NO SIGNAL';
        if (rightConf) {
            rightConf.textContent = '0%';
            rightConf.style.opacity = 0.3;
        }
    }
}
