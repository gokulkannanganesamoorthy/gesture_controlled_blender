import { create } from 'zustand';

export type ScannerMode = 'standard' | 'wireframe' | 'xray';
export type Gesture = 'none' | 'swipe' | 'pinch' | 'palm' | 'fist' | 'two_fingers';
export type CameraPreset = 'free' | 'front' | 'side' | 'top' | 'iso';
export type RenderQuality = 'low' | 'medium' | 'high';
export type PrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | null;
export type TransformMode = 'translate' | 'rotate' | 'scale' | null;

interface AppState {
  // Model
  modelUrl: string | null;
  modelName: string | null;
  setModel: (url: string, name: string) => void;
  primitiveType: PrimitiveType;
  setPrimitiveType: (t: PrimitiveType) => void;
  showAddMenu: boolean;
  setShowAddMenu: (v: boolean) => void;

  // Viewport
  scannerMode: ScannerMode;
  setScannerMode: (mode: ScannerMode) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;

  // Gesture
  gestureEnabled: boolean;
  setGestureEnabled: (v: boolean) => void;
  activeGesture: Gesture;
  setActiveGesture: (gesture: Gesture) => void;
  gestureHistory: string[];
  pushGestureHistory: (g: string) => void;

  // Transform
  modelRotation: [number, number, number];
  setModelRotation: (r: [number, number, number]) => void;
  modelPosition: [number, number, number];
  setModelPosition: (p: [number, number, number]) => void;
  modelScale: number;
  setModelScale: (s: number) => void;
  explodedView: boolean;
  setExplodedView: (v: boolean) => void;

  // Gizmos
  transformMode: TransformMode;
  setTransformMode: (mode: TransformMode) => void;
  isDraggingGizmo: boolean;
  setIsDraggingGizmo: (v: boolean) => void;

  // Material
  materialColor: string;
  setMaterialColor: (c: string) => void;
  roughness: number;
  setRoughness: (v: number) => void;
  metalness: number;
  setMetalness: (v: number) => void;
  textureUrl: string | null;
  setTextureUrl: (url: string | null) => void;

  // Environment
  envPreset: 'none' | 'city' | 'sunset' | 'dawn' | 'studio';
  setEnvPreset: (p: 'none' | 'city' | 'sunset' | 'dawn' | 'studio') => void;
  bgColor: string;
  setBgColor: (c: string) => void;
  enableShadows: boolean;
  setEnableShadows: (v: boolean) => void;

  // Camera
  cameraPreset: CameraPreset;
  setCameraPreset: (p: CameraPreset) => void;

  // View / Rendering
  turntableMode: boolean;
  setTurntableMode: (v: boolean) => void;
  presentationMode: boolean;
  setPresentationMode: (v: boolean) => void;
  renderQuality: RenderQuality;
  setRenderQuality: (q: RenderQuality) => void;
  fps: number;
  setFps: (v: number) => void;

  // Screenshot
  screenshotTrigger: number;
  triggerScreenshot: () => void;
}

export const useStore = create<AppState>((set) => ({
  modelUrl: null,
  modelName: null,
  setModel: (url, name) => set({ modelUrl: url, modelName: name, primitiveType: null }),
  primitiveType: null,
  setPrimitiveType: (t) => set({ primitiveType: t, modelUrl: null, modelName: t }),
  showAddMenu: false,
  setShowAddMenu: (v) => set({ showAddMenu: v }),

  scannerMode: 'standard',
  setScannerMode: (mode) => set({ scannerMode: mode }),
  showGrid: true,
  setShowGrid: (v) => set({ showGrid: v }),

  gestureEnabled: true,
  setGestureEnabled: (v) => set({ gestureEnabled: v }),
  activeGesture: 'none',
  setActiveGesture: (gesture) => set({ activeGesture: gesture }),
  gestureHistory: [],
  pushGestureHistory: (g) =>
    set((s) => ({ gestureHistory: [g, ...s.gestureHistory].slice(0, 4) })),

  modelRotation: [0, 0, 0],
  setModelRotation: (r) => set({ modelRotation: r }),
  modelPosition: [0, 0, 0],
  setModelPosition: (p) => set({ modelPosition: p }),
  modelScale: 1,
  setModelScale: (s) => set({ modelScale: s }),
  explodedView: false,
  setExplodedView: (v) => set({ explodedView: v }),

  transformMode: null,
  setTransformMode: (mode) => set({ transformMode: mode }),
  isDraggingGizmo: false,
  setIsDraggingGizmo: (v) => set({ isDraggingGizmo: v }),

  materialColor: '#cccccc',
  setMaterialColor: (c) => set({ materialColor: c }),
  roughness: 0.4,
  setRoughness: (v) => set({ roughness: v }),
  metalness: 0.6,
  setMetalness: (v) => set({ metalness: v }),
  textureUrl: null,
  setTextureUrl: (url) => set({ textureUrl: url }),

  envPreset: 'city',
  setEnvPreset: (p) => set({ envPreset: p }),
  bgColor: '#0a0a0a',
  setBgColor: (c) => set({ bgColor: c }),
  enableShadows: true,
  setEnableShadows: (v) => set({ enableShadows: v }),

  cameraPreset: 'free',
  setCameraPreset: (p) => set({ cameraPreset: p }),

  turntableMode: false,
  setTurntableMode: (v) => set({ turntableMode: v }),
  presentationMode: false,
  setPresentationMode: (v) => set({ presentationMode: v }),
  renderQuality: 'medium',
  setRenderQuality: (q) => set({ renderQuality: q }),
  fps: 0,
  setFps: (v) => set({ fps: v }),

  screenshotTrigger: 0,
  triggerScreenshot: () => set((s) => ({ screenshotTrigger: s.screenshotTrigger + 1 })),
}));
