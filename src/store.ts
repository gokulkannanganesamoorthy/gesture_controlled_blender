import { create } from 'zustand';

export type Theme = 'dark' | 'light' | 'cyberpunk';
export type ScannerMode = 'standard' | 'wireframe' | 'xray' | 'technical';
export type Gesture = 'none' | 'swipe' | 'pinch' | 'palm' | 'fist' | 'two_fingers';

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  scannerMode: ScannerMode;
  setScannerMode: (mode: ScannerMode) => void;
  
  activeGesture: Gesture;
  setActiveGesture: (gesture: Gesture) => void;
  
  isListeningVoice: boolean;
  setIsListeningVoice: (isListening: boolean) => void;
  
  explodedView: boolean;
  setExplodedView: (exploded: boolean) => void;
  
  modelRotation: [number, number, number];
  setModelRotation: (rotation: [number, number, number]) => void;
  
  modelScale: number;
  setModelScale: (scale: number) => void;
}

export const useStore = create<AppState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
  },
  
  scannerMode: 'standard',
  setScannerMode: (mode) => set({ scannerMode: mode }),
  
  activeGesture: 'none',
  setActiveGesture: (gesture) => set({ activeGesture: gesture }),
  
  isListeningVoice: false,
  setIsListeningVoice: (isListening) => set({ isListeningVoice: isListening }),
  
  explodedView: false,
  setExplodedView: (exploded) => set({ explodedView: exploded }),
  
  modelRotation: [0, 0, 0],
  setModelRotation: (rotation) => set({ modelRotation: rotation }),
  
  modelScale: 1,
  setModelScale: (scale) => set({ modelScale: scale }),
}));
