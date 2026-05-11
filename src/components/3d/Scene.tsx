import { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import { useStore } from '../../store';

const GLBModel = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
};

export const Scene = () => {
  const { modelUrl, modelRotation, modelPosition, modelScale, explodedView } = useStore();

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

      {modelUrl && (
        // @ts-ignore
        <a.group rotation={modelRotation} position={position as any} scale={scale as any}>
          <Suspense fallback={null}>
            <GLBModel url={modelUrl} />
          </Suspense>
        </a.group>
      )}
    </>
  );
};
