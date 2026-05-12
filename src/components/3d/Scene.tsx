import { Suspense, useEffect, useRef } from 'react';
import { useGLTF, TransformControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import type { PrimitiveType } from '../../store';

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

// ── Mouse Controller ──────────────────────────────────────────────────────────
// LMB drag  → Rotate model   (like gesture: 2 fingers)
// MMB drag  → Pan model      (like gesture: 3 fingers)
// Shift+LMB → Pan model
// Scroll    → Zoom            (like gesture: pinch)
// RMB drag  → Pan model
export const MouseController = () => {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.cursor = 'crosshair';

    let dragging = false;
    let button = 0;
    let lastX = 0;
    let lastY = 0;

    const ROTATE_SPEED = 0.008;
    const PAN_SPEED    = 0.007;
    const ZOOM_SPEED   = 0.12;

    const onDown = (e: MouseEvent) => {
      if (e.target !== canvas) return;
      dragging = true;
      button = e.button;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = (button === 0 && !e.shiftKey) ? 'grabbing' : 'move';
      e.preventDefault();
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const { modelRotation, setModelRotation, modelPosition, setModelPosition } =
        useStore.getState();

      const isPan = button === 1 || button === 2 || e.shiftKey;

      if (isPan) {
        setModelPosition([
          modelPosition[0] + dx * PAN_SPEED,
          modelPosition[1] - dy * PAN_SPEED,
          modelPosition[2],
        ]);
      } else {
        // LMB → rotate
        setModelRotation([
          modelRotation[0] + dy * ROTATE_SPEED,
          modelRotation[1] + dx * ROTATE_SPEED,
          modelRotation[2],
        ]);
      }
    };

    const onUp = () => {
      dragging = false;
      canvas.style.cursor = 'crosshair';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { modelScale, setModelScale } = useStore.getState();
      const delta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
      setModelScale(Math.max(0.05, Math.min(6, modelScale + delta)));
    };

    const blockCtx = (e: Event) => e.preventDefault();

    canvas.addEventListener('mousedown',   onDown);
    window.addEventListener('mousemove',   onMove);
    window.addEventListener('mouseup',     onUp);
    canvas.addEventListener('wheel',       onWheel, { passive: false });
    canvas.addEventListener('contextmenu', blockCtx);

    return () => {
      canvas.removeEventListener('mousedown',   onDown);
      window.removeEventListener('mousemove',   onMove);
      window.removeEventListener('mouseup',     onUp);
      canvas.removeEventListener('wheel',       onWheel);
      canvas.removeEventListener('contextmenu', blockCtx);
    };
  }, [gl]);

  return null;
};

// ── Primitive Material ─────────────────────────────────────────────────────────
const PrimMat = () => {
  const { materialColor, roughness, metalness, scannerMode } = useStore();
  return (
    <meshStandardMaterial
      color={materialColor}
      roughness={roughness}
      metalness={metalness}
      wireframe={scannerMode === 'wireframe'}
      transparent={scannerMode === 'xray'}
      opacity={scannerMode === 'xray' ? 0.25 : 1}
    />
  );
};

// ── Primitive Model ───────────────────────────────────────────────────────────
const PrimitiveModel = ({ type }: { type: NonNullable<PrimitiveType> }) => {
  switch (type) {
    case 'cube':     return <mesh castShadow receiveShadow><boxGeometry args={[1.2, 1.2, 1.2]} /><PrimMat /></mesh>;
    case 'sphere':   return <mesh castShadow receiveShadow><sphereGeometry args={[0.8, 48, 48]} /><PrimMat /></mesh>;
    case 'cylinder': return <mesh castShadow receiveShadow><cylinderGeometry args={[0.6, 0.6, 1.6, 48]} /><PrimMat /></mesh>;
    case 'cone':     return <mesh castShadow receiveShadow><coneGeometry args={[0.7, 1.6, 48]} /><PrimMat /></mesh>;
    case 'torus':    return <mesh castShadow receiveShadow><torusGeometry args={[0.7, 0.25, 24, 100]} /><PrimMat /></mesh>;
    case 'plane':    return <mesh castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2, 2, 8, 8]} /><PrimMat /></mesh>;
    default: return null;
  }
};

// ── GLB Model ─────────────────────────────────────────────────────────────────
const GLBModel = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  const { textureUrl, materialColor, roughness, metalness, scannerMode } = useStore();

  useEffect(() => {
    const apply = (tex?: THREE.Texture) => {
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
        child.castShadow = true;
        child.receiveShadow = true;
      });
    };
    if (textureUrl) {
      new THREE.TextureLoader().load(textureUrl, apply);
    } else {
      apply();
    }
  }, [scene, textureUrl, materialColor, roughness, metalness, scannerMode]);

  return <primitive object={scene} />;
};

// ── Main Scene ─────────────────────────────────────────────────────────────────
export const Scene = () => {
  const {
    modelUrl, primitiveType, modelRotation, modelPosition, modelScale,
    setModelRotation, setModelPosition, setModelScale,
    explodedView, turntableMode, transformMode, isDraggingGizmo, setIsDraggingGizmo
  } = useStore();

  const masterGroupRef = useRef<THREE.Group>(null);
  const hasContent = modelUrl || primitiveType;

  useFrame((_state, delta) => {
    if (!masterGroupRef.current || isDraggingGizmo) return;

    // Position lerp
    masterGroupRef.current.position.lerp(new THREE.Vector3(...modelPosition), 10 * delta);

    // Scale lerp
    const targetScale = explodedView ? modelScale * 1.5 : modelScale;
    masterGroupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 10 * delta);

    // Rotation
    if (turntableMode) {
      masterGroupRef.current.rotation.y += 0.5 * delta;
    } else {
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...modelRotation));
      masterGroupRef.current.quaternion.slerp(targetQuat, 10 * delta);
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]}   intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-5, -4, -5]} intensity={0.3} color="#aaaaaa" />
      <pointLight       position={[0, 4, 0]}    intensity={0.4} />

      {hasContent && (
        <>
          <group ref={masterGroupRef}>
            {primitiveType ? (
              <PrimitiveModel type={primitiveType} />
            ) : modelUrl ? (
              <Suspense fallback={null}>
                <GLBModel url={modelUrl} />
              </Suspense>
            ) : null}
          </group>

          {transformMode && masterGroupRef.current && (
            <TransformControls
              object={masterGroupRef.current}
              mode={transformMode}
              onMouseDown={() => setIsDraggingGizmo(true)}
              onMouseUp={() => setIsDraggingGizmo(false)}
              onObjectChange={(e) => {
                const target = e?.target as any;
                if (target?.object) {
                  const obj = target.object;
                  setModelPosition(obj.position.toArray());
                  setModelRotation(obj.rotation.toArray());
                  setModelScale(obj.scale.x);
                }
              }}
            />
          )}
        </>
      )}
    </>
  );
};
