import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { HUD } from './components/ui/HUD';
import { Scene } from './components/3d/Scene';
import { VoiceController } from './components/interaction/VoiceController';
import { GestureTracker } from './components/interaction/GestureTracker';
import { useStore } from './store';

function App() {
  const { theme } = useStore();

  const bgColor = theme === 'light' ? '#f5f5f5' : '#0a0a0a';

  return (
    <>
      {/* The HUD component renders the full grid layout (topbar, sidebar, inspector, statusbar) */}
      <HUD />

      {/* The 3D Canvas is absolutely positioned to fill the canvas-area slot in the grid */}
      <div style={{
        position: 'fixed',
        top: 48,
        left: 220,
        right: 260,
        bottom: 44,
        zIndex: 1,
      }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <color attach="background" args={[bgColor]} />

          <Suspense fallback={null}>
            <Scene />

            {theme !== 'light' ? <Environment preset="city" /> : null}

            <ContactShadows
              position={[0, -1.5, 0]}
              opacity={0.2}
              scale={10}
              blur={2}
              far={4}
            />

            <EffectComposer disableNormalPass>
              <Bloom
                luminanceThreshold={0.6}
                mipmapBlur
                intensity={theme !== 'light' ? 0.4 : 0}
              />
              <Vignette eskil={false} offset={0.15} darkness={0.8} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Interaction layer */}
      <VoiceController />
      <GestureTracker />
    </>
  );
}

export default App;
