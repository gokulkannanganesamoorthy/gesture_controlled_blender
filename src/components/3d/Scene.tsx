import { Suspense, useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';

// ── FPS Counter ──────────────────────────────────────────────────────────────
export const FPSCounter = () => {
  const { setFps } = useStore();
  const frames = useRef(0);
  const lastTime = useRef(performance.now());
  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - lastTime.current >= 1000) {
      setFps(frames.current);
      frames.current = 0;
      lastTime.current = now;
    }
  });
  return null;
};

// ── Camera Preset Controller ──────────────────────────────────────────────────
const PRESET_POSITIONS: Record<string, THREE.Vector3> = {
  front: new THREE.Vector3(0, 0, 5),
  side:  new THREE.Vector3(5, 0, 0),
  top:   new THREE.Vector3(0, 5, 0.001),
  iso:   new THREE.Vector3(3.5, 3.5, 3.5),
};

export const CameraController = () => {
  const { camera } = useThree();
  const { cameraPreset } = useStore();
  useFrame(() => {
    const target = PRESET_POSITIONS[cameraPreset];
    if (!target) return;
    camera.position.lerp(target, 0.07);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};

// ── GLB Model ─────────────────────────────────────────────────────────────────
const GLBModel = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  const { textureUrl, materialColor, roughness, metalness, scannerMode } = useStore();

  // Apply material overrides whenever settings change
  useEffect(() => {
    const loader = textureUrl ? new THREE.TextureLoader() : null;
    const applyMaterials = (tex?: THREE.Texture) => {
      scene.traverse((child: any) => {
        if (!child.isMesh) return;
        const mat = child.material as THREE.MeshStandardMaterial;
        if (tex) mat.map = tex;
        mat.color.set(materialColor);
        mat.roughness = roughness;
        mat.metalness = metalness;
        mat.wireframe = scannerMode === 'wireframe';
        mat.transparent = scannerMode === 'xray';
        mat.opacity = scannerMode === 'xray' ? 0.25 : 1;
        mat.needsUpdate = true;
      });
    };
    if (loader && textureUrl) {
      loader.load(textureUrl, applyMaterials);
    } else {
      applyMaterials();
    }
  }, [scene, textureUrl, materialColor, roughness, metalness, scannerMode]);

  return <primitive object={scene} />;
};

// ── Main Scene ─────────────────────────────────────────────────────────────────
export const Scene = () => {
  const {
    modelUrl, modelRotation, modelPosition, modelScale,
    explodedView, turntableMode,
  } = useStore();

  const groupRef = useRef<THREE.Group>(null);
  const rotRef = useRef(modelRotation);
  useEffect(() => { rotRef.current = modelRotation; }, [modelRotation]);

  const { scale, position } = useSpring({
    scale: explodedView
      ? [modelScale * 1.5, modelScale * 1.5, modelScale * 1.5]
      : [modelScale, modelScale, modelScale],
    position: modelPosition,
    config: { mass: 1, tension: 160, friction: 28 },
  });

  useFrame(() => {
    if (!groupRef.current) return;
    if (turntableMode) {
      groupRef.current.rotation.x = rotRef.current[0];
      groupRef.current.rotation.y += 0.005;
      groupRef.current.rotation.z = rotRef.current[2];
    } else {
      groupRef.current.rotation.set(...rotRef.current);
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, -4, -5]} intensity={0.3} color="#aaaaaa" />

      {modelUrl && (
        // @ts-ignore
        <a.group position={position as any} scale={scale as any}>
          <group ref={groupRef}>
            <Suspense fallback={null}>
              <GLBModel url={modelUrl} />
            </Suspense>
          </group>
        </a.group>
      )}
    </>
  );
};
