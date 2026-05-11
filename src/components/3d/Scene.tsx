import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store';
import { Mesh } from 'three';
import { useSpring, a } from '@react-spring/three';

export const Scene: React.FC = () => {
  const meshRef = useRef<Mesh>(null);
  const { scannerMode, theme, modelRotation, modelScale, explodedView } = useStore();

  // Simple animation for the placeholder
  useFrame((state) => {
    if (meshRef.current && !explodedView) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  // Material settings based on scanner mode
  const wireframe = scannerMode === 'wireframe';
  const transparent = scannerMode === 'xray';
  const opacity = transparent ? 0.3 : 1;

  // Color based on theme
  let color = '#ffffff';
  if (theme === 'dark') color = '#00e5ff';
  if (theme === 'cyberpunk') color = '#ff0055';
  if (theme === 'light') color = '#0066cc';

  // React Spring for smooth transitions
  const { scale } = useSpring({
    scale: explodedView ? [1.5, 1.5, 1.5] : [modelScale, modelScale, modelScale],
    config: { mass: 1, tension: 170, friction: 26 }
  });

  return (
    <>
      <ambientLight intensity={theme === 'light' ? 1.5 : 0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} color={color} />
      
      {/* @ts-ignore - a.mesh works fine but types might complain */}
      <a.mesh ref={meshRef} rotation={modelRotation} scale={scale as any}>
        <torusKnotGeometry args={[1, 0.3, 64, 16]} />
        <meshStandardMaterial 
          color={color} 
          wireframe={wireframe}
          transparent={transparent}
          opacity={opacity}
          roughness={0.4}
          metalness={0.6}
        />
      </a.mesh>
    </>
  );
};
