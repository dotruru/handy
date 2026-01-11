/**
 * MediaPipe Hands Integration
 */

// Access global MediaPipe objects
const Hands = window.Hands;
const Camera = window.Camera;

export let leftHandData = null;
export let rightHandData = null;

let onHandsUpdateCallback = null;

/**
 * Set callback for hand updates
 */
export function setHandsUpdateCallback(callback) {
    onHandsUpdateCallback = callback;
}

/**
 * Count extended fingers on a hand
 */
export function countExtendedFingers(landmarks) {
    let count = 0;

    // Thumb (compare X for left/right extension)
    if (Math.abs(landmarks[4].x - landmarks[3].x) > Math.abs(landmarks[3].x - landmarks[2].x)) {
        count++;
    }

    // Other fingers (compare Y positions - tip vs base)
    const fingers = [
        [8, 6],   // Index
        [12, 10], // Middle
        [16, 14], // Ring
        [20, 18]  // Pinky
    ];

    fingers.forEach(([tip, base]) => {
        if (landmarks[tip].y < landmarks[base].y) {
            count++;
        }
    });

    return count;
}

/**
 * Handle MediaPipe hands results
 */
export function onHandsResults(results) {
    leftHandData = null;
    rightHandData = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label;
            const fingerCount = countExtendedFingers(landmarks);

            const handData = {
                landmarks,
                fingerCount,
                indexTip: landmarks[8],
                palmCenter: landmarks[0]
            };

            // MediaPipe mirrors the camera
            if (handedness === 'Left') {
                rightHandData = handData;
            } else {
                leftHandData = handData;
            }
        }
    }

    // Trigger callback if set
    if (onHandsUpdateCallback) {
        onHandsUpdateCallback(leftHandData, rightHandData);
    }
}

/**
 * Initialize MediaPipe Hands
 */
export async function initMediaPipe(videoElement) {
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(onHandsResults);

    // Start webcam
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 1280, 
                height: 720 
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

/**
 * Update HUD display
 */
export function updateHUD() {
    const leftStatus = document.getElementById('left-status');
    const rightStatus = document.getElementById('right-status');

    if (leftHandData) {
        const modes = ['DRAW MODE', 'HELLO', 'ARUKA', 'LISSAJOUS', 'KOCH', 'CATCH'];
        leftStatus.textContent = modes[leftHandData.fingerCount] || 'ACTIVE';
    } else {
        leftStatus.textContent = 'NO SIGNAL';
    }

    if (rightHandData) {
        if (rightHandData.fingerCount === 5) {
            rightStatus.textContent = 'NEBULA';
        } else {
            rightStatus.textContent = 'SCATTER';
        }
    } else {
        rightStatus.textContent = 'NO SIGNAL';
    }
}
