/**
 * Text and Mathematical Shape Generators
 */

/**
 * Generate particle coordinates from text using canvas rasterization
 */
export function generateTextCoordinates(text, fontSize = 75) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const coords = [];

    // Sample pixels
    for (let y = 0; y < canvas.height; y += 3) {
        for (let x = 0; x < canvas.width; x += 3) {
            const i = (y * canvas.width + x) * 4;
            if (imageData.data[i] > 128) {
                coords.push({
                    x: (x - canvas.width / 2) * 0.8,
                    y: -(y - canvas.height / 2) * 0.8,
                    z: 0
                });
            }
        }
    }

    return coords;
}

/**
 * Generate Lissajous curve coordinates with rainbow gradient
 */
export function generateLissajous(count = 12000) {
    const coords = [];
    const a = 3, b = 2, delta = Math.PI / 2;
    const amplitude = 300;

    for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2 * Math.max(a, b);
        const x = amplitude * Math.sin(a * t + delta);
        const y = amplitude * Math.sin(b * t);
        coords.push({ x, y, z: 0, hue: (i / count) * 360 });
    }

    return coords;
}

/**
 * Generate Koch Snowflake fractal coordinates
 */
export function generateKochSnowflake(iterations = 4, particleCount = 12000) {
    const coords = [];
    const size = 350;

    // Start with equilateral triangle
    const points = [
        { x: 0, y: -size },
        { x: size * Math.sqrt(3) / 2, y: size / 2 },
        { x: -size * Math.sqrt(3) / 2, y: size / 2 }
    ];

    function kochCurve(p1, p2, depth) {
        if (depth === 0) {
            return [p1, p2];
        }

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        const p3 = { x: p1.x + dx / 3, y: p1.y + dy / 3 };
        const p5 = { x: p1.x + 2 * dx / 3, y: p1.y + 2 * dy / 3 };

        const angle = Math.PI / 3;
        const p4 = {
            x: p3.x + (dx / 3) * Math.cos(angle) - (dy / 3) * Math.sin(angle),
            y: p3.y + (dx / 3) * Math.sin(angle) + (dy / 3) * Math.cos(angle)
        };

        return [
            ...kochCurve(p1, p3, depth - 1).slice(0, -1),
            ...kochCurve(p3, p4, depth - 1).slice(0, -1),
            ...kochCurve(p4, p5, depth - 1).slice(0, -1),
            ...kochCurve(p5, p2, depth - 1)
        ];
    }

    // Generate Koch curve for each edge
    const edge1 = kochCurve(points[0], points[1], iterations);
    const edge2 = kochCurve(points[1], points[2], iterations);
    const edge3 = kochCurve(points[2], points[0], iterations);

    const allPoints = [...edge1, ...edge2, ...edge3];

    // Sample points to match particle count
    for (let i = 0; i < particleCount; i++) {
        const idx = Math.floor((i / particleCount) * allPoints.length);
        const p = allPoints[idx];
        coords.push({ x: p.x, y: p.y, z: 0 });
    }

    return coords;
}

/**
 * Generate Fibonacci sphere coordinates (used for basketball)
 */
export function generateFibonacciSphere(count, radius = 150) {
    const coords = [];
    const phi = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = phi * i;
        const x = Math.cos(theta) * radiusAtY;
        const z = Math.sin(theta) * radiusAtY;

        coords.push({
            x: x * radius,
            y: y * radius,
            z: z * radius
        });
    }

    return coords;
}

/**
 * Convert HSL color to RGB
 */
export function hslToRgb(h, s, l) {
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
