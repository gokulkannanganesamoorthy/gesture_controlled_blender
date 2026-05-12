import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { HUD } from './components/ui/HUD';
import { Scene, FPSCounter, CameraController } from './components/3d/Scene';
import { GestureTracker } from './components/interaction/GestureTracker';
import { useStore } from './store';

const DPR: Record<string, number> = {
  low: 0.75,
  medium: 1,
  high: Math.min(2, window.devicePixelRatio ?? 1),
};

function App() {
  const {
    bgColor, envPreset, showGrid,
    renderQuality, gestureEnabled,
    presentationMode, screenshotTrigger,
    setPresentationMode, setTurntableMode, turntableMode,
    setModelRotation, setModelPosition, setModelScale, setExplodedView,
    setCameraPreset, triggerScreenshot,
  } = useStore();

  // Screenshot handler
  useEffect(() => {
    if (screenshotTrigger === 0) return;
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `gestura-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }, 50);
  }, [screenshotTrigger]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Don't fire shortcuts when typing in an input
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case '1': setCameraPreset('front'); break;
        case '2': setCameraPreset('side'); break;
        case '3': setCameraPreset('top'); break;
        case '4': setCameraPreset('iso'); break;
        case '5': setCameraPreset('free'); break;
        case 'p': case 'P': setPresentationMode(!presentationMode); break;
        case 't': case 'T': setTurntableMode(!turntableMode); break;
        case 'Escape': setPresentationMode(false); break;
        case ' ':
          e.preventDefault();
          setModelRotation([0, 0, 0]);
          setModelPosition([0, 0, 0]);
          setModelScale(1);
          setExplodedView(false);
          break;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        triggerScreenshot();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [presentationMode, turntableMode, setCameraPreset, setPresentationMode,
      setTurntableMode, setModelRotation, setModelPosition, setModelScale,
      setExplodedView, triggerScreenshot]);

  const canvasStyle = presentationMode
    ? { position: 'fixed' as const, inset: 0, zIndex: 1 }
    : { position: 'fixed' as const, top: 40, left: 0, right: 300, bottom: 28, zIndex: 1 };

  return (
    <>
      <HUD />

      <div style={canvasStyle}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          shadows
          dpr={DPR[renderQuality]}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <FPSCounter />
          <CameraController />
          <color attach="background" args={[bgColor]} />

          <Suspense fallback={null}>
            <Scene />

            {envPreset !== 'none' && <Environment preset={envPreset as any} />}

            {showGrid && (
              <Grid
                position={[0, -1.6, 0]}
                args={[30, 30]}
                cellSize={0.5}
                cellThickness={0.4}
                cellColor="#1e1e1e"
                sectionSize={2}
                sectionThickness={0.8}
                sectionColor="#2a2a2a"
                fadeDistance={16}
                fadeStrength={1}
                infiniteGrid
              />
            )}

            {renderQuality !== 'low' && (
              <EffectComposer enableNormalPass={false}>
                <Bloom luminanceThreshold={0.7} mipmapBlur intensity={0.3} />
                {renderQuality === 'high' ? <Vignette eskil={false} offset={0.2} darkness={0.6} /> : <></>}
              </EffectComposer>
            )}
          </Suspense>
        </Canvas>
      </div>

      {gestureEnabled && <GestureTracker />}
    </>
  );
}

export default App;
