import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import { HUD } from './components/ui/HUD';
import { Scene } from './components/3d/Scene';
import { VoiceController } from './components/interaction/VoiceController';
import { GestureTracker } from './components/interaction/GestureTracker';
import { useStore } from './store';

function App() {
  const { theme } = useStore();

  return (
    <>
      <HUD />
      <VoiceController />
      <GestureTracker />

      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <color attach="background" args={[theme === 'light' ? '#f8f8fa' : theme === 'cyberpunk' ? '#090212' : '#030305']} />
        
        <Suspense fallback={null}>
          <Scene />
          
          {theme !== 'light' ? (
            <Environment preset="city" />
          ) : null}
          
          <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
          
          <EffectComposer disableNormalPass>
            <Bloom 
              luminanceThreshold={0.5} 
              mipmapBlur 
              intensity={theme !== 'light' ? 0.5 : 0} 
            />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Suspense>
        
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </>
  );
}

export default App;
