/**
 * MediaPipe Hands Integration - Stark Edition
 * Simplified and reliable finger detection
 */

// Access global MediaPipe objects
const Hands = window.Hands;
const Camera = window.Camera;

// ============================================
// CONFIGURATION
// ============================================
export const CONFIG = {
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
    smoothingFactor: 0.5,           // Simple EMA smoothing (0-1, higher = less smooth)
    gestureDebounceFrames: 4,       // Frames required to confirm gesture change
    trailLength: 15
};

// ============================================
// STATE
// ============================================
export let leftHandData = null;
export let rightHandData = null;
export let leftConfidence = 0;
export let rightConfidence = 0;

let onHandsUpdateCallback = null;

// Simple smoothing state (EMA)
const smoothedLandmarks = {
    left: null,
    right: null
};

// Gesture debounce state (start at 0 = fist/no fingers)
const gestureState = {
    left: { current: 0, candidate: 0, frameCount: 0 },
    right: { current: 0, candidate: 0, frameCount: 0 }
};

// Index finger trail for holo effect
export const indexTrail = {
    left: [],
    right: []
};

// ============================================
// SIMPLE EMA SMOOTHING
// ============================================
function smoothLandmarksEMA(newLandmarks, prevSmoothed, factor) {
    if (!prevSmoothed) {
        return newLandmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z || 0 }));
    }
    
    return newLandmarks.map((lm, i) => ({
        x: prevSmoothed[i].x + (lm.x - prevSmoothed[i].x) * factor,
        y: prevSmoothed[i].y + (lm.y - prevSmoothed[i].y) * factor,
        z: (prevSmoothed[i].z || 0) + ((lm.z || 0) - (prevSmoothed[i].z || 0)) * factor
    }));
}

// ============================================
// SIMPLE FINGER DETECTION (more reliable)
// ============================================

/**
 * Count extended fingers - simple and reliable
 * Uses Y-position comparison for fingers, X-distance for thumb
 */
export function countExtendedFingers(landmarks, isRightHand = true) {
    let count = 0;
    
    // Thumb: Check if tip (4) is extended away from palm horizontally
    // For right hand: thumb extends left (tip.x < ip.x)
    // For left hand: thumb extends right (tip.x > ip.x)
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    
    if (isRightHand) {
        // Right hand (appears on LEFT of mirrored screen): thumb tip should be to the LEFT of IP
        if (thumbTip.x < thumbIP.x - 0.02) count++;
    } else {
        // Left hand (appears on RIGHT of mirrored screen): thumb tip should be to the RIGHT of IP
        if (thumbTip.x > thumbIP.x + 0.02) count++;
    }
    
    // Index finger (8): tip should be ABOVE pip (6) - lower Y value
    if (landmarks[8].y < landmarks[6].y - 0.02) count++;
    
    // Middle finger (12): tip should be ABOVE pip (10)
    if (landmarks[12].y < landmarks[10].y - 0.02) count++;
    
    // Ring finger (16): tip should be ABOVE pip (14)
    if (landmarks[16].y < landmarks[14].y - 0.02) count++;
    
    // Pinky (20): tip should be ABOVE pip (18)
    if (landmarks[20].y < landmarks[18].y - 0.02) count++;
    
    return count;
}

// ============================================
// GESTURE DEBOUNCING
// ============================================

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
    
    while (trail.length > maxLength) {
        trail.shift();
    }
}

// ============================================
// CALLBACK
// ============================================

export function setHandsUpdateCallback(callback) {
    onHandsUpdateCallback = callback;
}

// ============================================
// MAIN RESULTS HANDLER
// ============================================

export function onHandsResults(results) {
    leftHandData = null;
    rightHandData = null;
    leftConfidence = 0;
    rightConfidence = 0;

    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const rawLandmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label;
            const confidence = results.multiHandedness[i].score || 0.9;
            
            // MediaPipe labels: "Left" means YOUR left hand
            // But the video is mirrored, so your left hand appears on the RIGHT side of screen
            // We want: leftHandData = your left hand (appears on right of screen)
            const isYourLeftHand = handedness === 'Left';
            const handKey = isYourLeftHand ? 'left' : 'right';
            
            // Apply simple smoothing
            smoothedLandmarks[handKey] = smoothLandmarksEMA(
                rawLandmarks, 
                smoothedLandmarks[handKey], 
                CONFIG.smoothingFactor
            );
            const landmarks = smoothedLandmarks[handKey];
            
            // Count fingers with hand orientation
            const rawFingerCount = countExtendedFingers(landmarks, !isYourLeftHand);
            
            // Apply debouncing
            const stableFingerCount = debounceGesture(rawFingerCount, gestureState[handKey]);
            
            // Update trail
            updateTrail(indexTrail[handKey], landmarks[8], CONFIG.trailLength);
            
            // Build hand data
            const handData = {
                landmarks,
                rawLandmarks,
                fingerCount: stableFingerCount,
                rawFingerCount,
                indexTip: landmarks[8],
                palmCenter: landmarks[0],
                confidence,
                trail: [...indexTrail[handKey]]
            };

            if (isYourLeftHand) {
                leftHandData = handData;
                leftConfidence = confidence;
            } else {
                rightHandData = handData;
                rightConfidence = confidence;
            }
        }
    } else {
        // Reset when hands lost
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            smoothedLandmarks.left = null;
            smoothedLandmarks.right = null;
            indexTrail.left = [];
            indexTrail.right = [];
            gestureState.left = { current: 0, candidate: 0, frameCount: 0 };
            gestureState.right = { current: 0, candidate: 0, frameCount: 0 };
        }
    }

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

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
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
        const modes = ['DRAW', 'HELLO', 'ARUKA', 'LISSAJOUS', 'KOCH', 'CATCH'];
        leftStatus.textContent = modes[leftHandData.fingerCount] || `${leftHandData.fingerCount}F`;
        if (leftConf) {
            leftConf.textContent = `${Math.round(leftConfidence * 100)}%`;
        }
    } else {
        leftStatus.textContent = 'NO SIGNAL';
        if (leftConf) leftConf.textContent = '0%';
    }

    if (rightHandData) {
        if (rightHandData.fingerCount === 5) {
            rightStatus.textContent = 'NEBULA';
        } else {
            rightStatus.textContent = `SCATTER ${rightHandData.fingerCount}F`;
        }
        if (rightConf) {
            rightConf.textContent = `${Math.round(rightConfidence * 100)}%`;
        }
    } else {
        rightStatus.textContent = 'NO SIGNAL';
        if (rightConf) rightConf.textContent = '0%';
    }
}
