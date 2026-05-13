# Gestura

A gesture-controlled 3D modeling environment built with React, Three.js, and MediaPipe. Featuring Blender-like shortcuts, 3D transform gizmos, and intuitive hand tracking (e.g., corrected non-mirrored swipe rotation).

## Demo

Run locally with:

```bash
npm install
npm run dev
```

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript + Vite |
| 3D Rendering | Three.js, React Three Fiber, Drei |
| Post-processing | @react-three/postprocessing |
| Animation | @react-spring/three |
| Hand Tracking | MediaPipe Tasks Vision |
| State | Zustand |
| Icons | Lucide React |

## Gesture Controls

| Gesture | Action |
|---------|--------|
| 2 fingers (index + middle) | Rotate model |
| 3 fingers (index + middle + ring) | Pan / translate |
| Pinch (thumb + index) | Zoom in / out |
| Open palm | Toggle exploded view |
| Fist | Reset all transforms |

All gestures include exponential smoothing, a dead zone filter, and a 6-frame debounce to eliminate jitter.

## Features

- Import any GLB or GLTF 3D model via file picker
- Real-time hand tracking via webcam (single hand, GPU-accelerated)
- XYZ axis indicator with depth-sorted rendering
- Live transform inspector: Rotation X/Y/Z, Position X/Y/Z, Scale
- Viewport modes: Solid, Wireframe, X-Ray
- Material customization: color, roughness, metalness
- HDRI environment presets: City, Sunset, Dawn, Studio
- Background color picker
- Infinite grid floor for spatial reference
- Collapsible properties panel
- Gesture guide always accessible in the sidebar

## Project Structure

```
src/
  components/
    3d/
      Scene.tsx           # Three.js scene, loads GLB via useGLTF
    interaction/
      GestureTracker.tsx  # MediaPipe hand tracking and gesture logic
    ui/
      HUD.tsx             # Full Blender-style IDE layout
  store.ts                # Zustand global state
  App.tsx                 # Canvas setup, layout root
  index.css               # Design system (dark monochrome IDE theme)
```

## Getting Started

```bash
git clone https://github.com/gokulkannanganesamoorthy/gesture_controlled_blender.git
cd gesture_controlled_blender
npm install
npm run dev
```

Open `http://localhost:5173`, allow webcam access, and click **Import GLB** to load a model.

## Build

```bash
npm run build
```

Output goes to `dist/`. Serve with any static host (Vercel, Netlify, GitHub Pages).

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full list of planned production features.
