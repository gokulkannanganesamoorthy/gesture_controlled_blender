# Roadmap

Features planned for a production-quality release of Visionary 3D, grouped by priority.

---

## P1 — Core Experience

These are gaps that exist today and directly affect usability.

### Model Handling
- **Auto-fit on import** — normalize the bounding box so any model loads centered and fills the viewport, regardless of original scale
- **GLTF animation playback** — play, pause, scrub through embedded animations with a timeline control
- **Multi-mesh support** — list individual meshes in the sidebar, toggle visibility per mesh, apply materials independently
- **Texture inspector** — display embedded textures (base color, normal, roughness maps) in the properties panel
- **Model statistics** — vertex count, triangle count, mesh count shown in Object section

### Gesture & Input
- **Calibration mode** — guided one-time setup to adjust sensitivity thresholds to the user's lighting and distance
- **Two-hand support** — left hand controls camera/menu, right hand controls model transforms
- **Gesture sensitivity sliders** — let users tune rotation speed, zoom speed, and dead zone from the UI
- **Fallback orbit controls** — enable mouse/trackpad drag when no hand is detected

### Camera
- **Camera presets** — front, back, top, side, isometric one-click buttons (like Numpad in Blender)
- **Perspective / Orthographic toggle**
- **Focus on model** — frame the loaded model perfectly with one click

---

## P2 — Production Features

These turn it from a demo into a real tool.

### Undo / Redo
- Track transform history in Zustand with a stack
- Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts
- Undo button in topbar

### Export
- **Screenshot** — export the current viewport as a PNG (no UI chrome)
- **Transform export** — download current rotation, position, scale as JSON
- **Share URL** — encode the transform state in the URL hash so a view can be shared as a link

### Performance
- **Web Worker for MediaPipe** — move the hand landmarker inference off the main thread to prevent frame drops
- **Dynamic import** — code-split MediaPipe and Three.js post-processing so initial load is faster
- **Model preloading indicator** — show a progress bar while a large GLB is loading

### Progressive Web App
- `manifest.json` and service worker for offline use
- Install to desktop from Chrome

---

## P3 — Advanced Features

Nice-to-haves for a showcase-quality product.

### Lighting
- **Point light placement** — drag lights around the scene with gesture or mouse
- **Shadow quality settings** — soft vs hard shadows, shadow map resolution
- **Emissive material support** — allow setting emissive color and intensity

### Annotation
- **3D notes** — pin a text label to a point on the model surface
- **Measurement tool** — click two points to show the distance in model units

### Collaboration
- **Session sharing** — real-time multiplayer view using WebRTC or a simple websocket relay so two users see the same model state
- **Comment threads** — attach comments to specific model coordinates

### Accessibility
- **Keyboard shortcuts panel** — display all shortcuts in a modal
- **High contrast mode**
- **Screen reader labels** on all interactive elements

---

## Technical Debt / Code Quality

| Item | Notes |
|------|-------|
| Unit tests for gesture logic | Pure functions in `analyzeGesture` are easy to test with Vitest |
| Error boundaries | Wrap Canvas and GestureTracker in React error boundaries with fallback UI |
| Type-safe store | Replace `any` casts in gesture code with proper Three.js types |
| CI pipeline | GitHub Actions: typecheck + build on every push |
| Linting | Enable `tseslint.configs.strictTypeChecked` |
