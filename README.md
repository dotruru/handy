# Cyberpunk Particle System

An interactive 12,000-particle system controlled by hand gestures using MediaPipe and Three.js.

## 🎮 Hand Gestures

### Left Hand (Shape Controller)
- **Fist (0 fingers)**: Drawing Mode - draw with your right index finger
- **1 finger**: "Hello" text in Neon Cyan
- **2 fingers**: "aruka" text in Neon Yellow  
- **3 fingers**: Lissajous Curve with Rainbow Gradient
- **4 fingers**: Koch Snowflake in Neon Green
- **5 fingers (Open)**: Catch Mode (for basketball)

### Right Hand (Physics Controller)
- **Closed/Pointing**: Strong scatter repulsion (XY plane only)
- **5 fingers (Open)**: Nebula Mode with water ripple effect

### Special Combo
- **Both Hands Open (5 fingers each)**: 3D Basketball with bouncing particle trajectories

## 📁 Project Structure

```
project/
├── index.html              # Main HTML structure
├── css/
│   └── cyberpunk.css      # All styling & effects
├── js/
│   ├── shapes.js          # Text & mathematical shape generators
│   ├── particles.js       # Three.js particle system
│   ├── hands.js           # MediaPipe hand tracking
│   ├── physics.js         # Particle physics & interactions
│   └── main.js            # Application initialization
└── README.md              # This file
```

## 🛠️ Technology Stack

- **Three.js** (r152): 3D rendering and particle system
- **MediaPipe Hands**: Real-time hand tracking
- **ES6 Modules**: Clean, modular code architecture
- **Canvas API**: Text rasterization for particle targets

## 🚀 Getting Started

1. Clone or download this repository
2. Serve the files using a local web server (required for ES6 modules):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in a modern browser (Chrome/Edge recommended)
4. Grant camera permissions when prompted
5. Start making gestures!

## 📊 Performance

- **Particle Count**: 12,000
- **Target FPS**: 60
- **Lerp Factor**: 0.16 (fast, snappy responses)
- **Hand Detection**: Up to 2 hands simultaneously

## 🎨 Visual Effects

- Animated cyberpunk grid background
- Moving scanlines
- Radial vignette
- Additive particle blending for neon glow
- Real-time HUD with FPS counter

## 🧮 Mathematical Shapes

### Lissajous Curves
- Parametric equations: `x = A*sin(at + δ)`, `y = B*sin(bt)`
- Parameters: a=3, b=2, δ=π/2
- Rainbow gradient using HSL color space

### Koch Snowflake
- Recursive fractal generation (4 iterations)
- Classic equilateral triangle base
- ~12,000 points distributed along fractal edges

### Fibonacci Sphere
- Used for 3D basketball formation
- Golden ratio-based distribution for even spacing

## 🎯 Features

- ✅ Real-time hand gesture recognition
- ✅ 12,000 interactive particles
- ✅ Multiple shape formations (text & mathematical)
- ✅ Drawing mode with finger tracking
- ✅ Physics-based scatter effects
- ✅ 3D basketball with bouncing trajectories
- ✅ Modular, maintainable code structure

## 🐛 Troubleshooting

**Camera not working?**
- Ensure you're using HTTPS or localhost
- Grant camera permissions in browser settings
- Check that no other app is using the camera

**Low FPS?**
- Close other browser tabs
- Use Chrome/Edge for best performance
- Reduce browser window size

**Modules not loading?**
- Must use a web server (can't open file directly)
- Check browser console for CORS errors

## 📝 License

Free to use and modify as you wish!
