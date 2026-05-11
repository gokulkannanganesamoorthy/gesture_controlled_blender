import { create } from 'zustand';

export type ScannerMode = 'standard' | 'wireframe' | 'xray';
export type Gesture = 'none' | 'swipe' | 'pinch' | 'palm' | 'fist' | 'two_fingers';

interface AppState {
  // Model file
  modelUrl: string | null;
  modelName: string | null;
  setModel: (url: string, name: string) => void;

  // Viewport mode
  scannerMode: ScannerMode;
  setScannerMode: (mode: ScannerMode) => void;

  // Gesture
  activeGesture: Gesture;
  setActiveGesture: (gesture: Gesture) => void;

  // Transform
  modelRotation: [number, number, number];
  setModelRotation: (rotation: [number, number, number]) => void;

  modelPosition: [number, number, number];
  setModelPosition: (position: [number, number, number]) => void;

  modelScale: number;
  setModelScale: (scale: number) => void;

  explodedView: boolean;
  setExplodedView: (exploded: boolean) => void;

  // Material customization
  materialColor: string;
  setMaterialColor: (color: string) => void;

  roughness: number;
  setRoughness: (v: number) => void;

  metalness: number;
  setMetalness: (v: number) => void;

  // Environment
  envPreset: 'none' | 'city' | 'sunset' | 'dawn' | 'studio';
  setEnvPreset: (preset: 'none' | 'city' | 'sunset' | 'dawn' | 'studio') => void;

  bgColor: string;
  setBgColor: (color: string) => void;
}

export const useStore = create<AppState>((set) => ({
  modelUrl: null,
  modelName: null,
  setModel: (url, name) => set({ modelUrl: url, modelName: name }),

  scannerMode: 'standard',
  setScannerMode: (mode) => set({ scannerMode: mode }),

  activeGesture: 'none',
  setActiveGesture: (gesture) => set({ activeGesture: gesture }),

  modelRotation: [0, 0, 0],
  setModelRotation: (rotation) => set({ modelRotation: rotation }),

  modelPosition: [0, 0, 0],
  setModelPosition: (position) => set({ modelPosition: position }),

  modelScale: 1,
  setModelScale: (scale) => set({ modelScale: scale }),

  explodedView: false,
  setExplodedView: (exploded) => set({ explodedView: exploded }),

  materialColor: '#cccccc',
  setMaterialColor: (color) => set({ materialColor: color }),

  roughness: 0.4,
  setRoughness: (v) => set({ roughness: v }),

  metalness: 0.6,
  setMetalness: (v) => set({ metalness: v }),

  envPreset: 'city',
  setEnvPreset: (preset) => set({ envPreset: preset }),

  bgColor: '#0a0a0a',
  setBgColor: (color) => set({ bgColor: color }),
}));
