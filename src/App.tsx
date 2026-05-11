import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { HUD } from './components/ui/HUD';
import { Scene } from './components/3d/Scene';
import { GestureTracker } from './components/interaction/GestureTracker';
import { useStore } from './store';

function App() {
  const { bgColor, envPreset } = useStore();

  return (
    <>
      <HUD />

      <div style={{
        position: 'fixed',
        top: 48,
        left: 0,
        right: 300,
        bottom: 44,
        zIndex: 1,
      }}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={[bgColor]} />

          <Suspense fallback={null}>
            <Scene />

            {envPreset !== 'none' && (
              <Environment preset={envPreset as any} />
            )}

            <Grid
              position={[0, -1.6, 0]}
              args={[20, 20]}
              cellSize={0.5}
              cellThickness={0.4}
              cellColor="#2a2a2a"
              sectionSize={2}
              sectionThickness={0.8}
              sectionColor="#3a3a3a"
              fadeDistance={14}
              fadeStrength={1}
              infiniteGrid
            />

            <EffectComposer enableNormalPass={false}>
              <Bloom luminanceThreshold={0.7} mipmapBlur intensity={0.3} />
              <Vignette eskil={false} offset={0.2} darkness={0.6} />
            </EffectComposer>
          </Suspense>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
          />
        </Canvas>
      </div>

      <GestureTracker />
    </>
  );
}

export default App;
