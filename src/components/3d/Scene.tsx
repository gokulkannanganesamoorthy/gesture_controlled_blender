import { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import { useStore } from '../../store';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

// Separate component so useGLTF is only called when a URL exists
const GLBModel = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
};

const PlaceholderMesh = () => {
  const ref = useRef<Mesh>(null);
  const { scannerMode, materialColor, roughness, metalness } = useStore();

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.004;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.15;
    }
  });

  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[1, 0.3, 64, 16]} />
      <meshStandardMaterial
        color={materialColor}
        wireframe={scannerMode === 'wireframe'}
        transparent={scannerMode === 'xray'}
        opacity={scannerMode === 'xray' ? 0.25 : 1}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
};

export const Scene = () => {
  const {
    modelUrl,
    modelRotation,
    modelPosition,
    modelScale,
    explodedView,
  } = useStore();

  const { scale, position } = useSpring({
    scale: explodedView
      ? [modelScale * 1.5, modelScale * 1.5, modelScale * 1.5]
      : [modelScale, modelScale, modelScale],
    position: modelPosition,
    config: { mass: 1, tension: 160, friction: 28 },
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, -4, -5]} intensity={0.3} color="#aaaaaa" />

      {/* @ts-ignore */}
      <a.group rotation={modelRotation} position={position as any} scale={scale as any}>
        <Suspense fallback={null}>
          {modelUrl ? <GLBModel url={modelUrl} /> : <PlaceholderMesh />}
        </Suspense>
      </a.group>
    </>
  );
};
