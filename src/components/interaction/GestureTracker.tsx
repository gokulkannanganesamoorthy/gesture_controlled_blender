import React, { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useStore } from '../../store';

// Smooth factor: lower = smoother but slower, higher = faster but jittery
const SMOOTH = 0.15;
// Minimum movement threshold to filter noise
const DEAD_ZONE = 0.003;
// Number of frames a gesture must be stable before triggering
const GESTURE_DEBOUNCE = 6;

export const GestureTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);

  const {
    setActiveGesture,
    setModelRotation,
    setModelPosition,
    setModelScale,
    setExplodedView,
  } = useStore();

  // All live state lives in refs — never read from Zustand inside the rAF loop
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const positionRef = useRef<[number, number, number]>([0, 0, 0]);
  const scaleRef = useRef<number>(1);

  // Sync refs back when store changes externally (e.g. voice commands)
  const { modelRotation, modelPosition, modelScale } = useStore();
  useEffect(() => { rotationRef.current = modelRotation; }, [modelRotation]);
  useEffect(() => { positionRef.current = modelPosition; }, [modelPosition]);
  useEffect(() => { scaleRef.current = modelScale; }, [modelScale]);

  // Smoothed hand position
  const smoothX = useRef(0);
  const smoothY = useRef(0);

  // Gesture debounce
  const gestureBuffer = useRef<string[]>([]);
  const stableGesture = useRef<string>('none');

  // Fist cooldown to prevent repeated resets
  const fistCooldown = useRef(0);

  useEffect(() => {
    const initializeMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      );

      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1, // single hand = much faster
      });

      landmarkerRef.current = handLandmarker;
      startWebcam();
    };

    const startWebcam = async () => {
      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 30 }, // lower res = faster
        });
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', loop);
      } catch (err) {
        console.error('Webcam error:', err);
      }
    };

    let lastTs = -1;

    const loop = () => {
      if (!videoRef.current || !landmarkerRef.current || !canvasRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) return;

      // Set canvas size only once when video dimensions are known
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const now = performance.now();
      if (now === lastTs) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }
      lastTs = now;

      const results = landmarkerRef.current.detectForVideo(video, now);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];

        // Draw minimal skeleton — just fingertips and palm center
        const keyPoints = [0, 4, 8, 12, 16, 20];
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        
        for (const i of keyPoints) {
          const p = landmarks[i];
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, i === 0 ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        }

        processGesture(landmarks);
      } else {
        // No hand — reset gesture state
        gestureBuffer.current = [];
        stableGesture.current = 'none';
        setActiveGesture('none');
        smoothX.current = 0;
        smoothY.current = 0;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    const classifyGesture = (landmarks: any[]): string => {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const wrist = landmarks[0];

      // Finger extension: tip.y < pip.y (in image space, y increases downward)
      const indexExtended = landmarks[8].y < landmarks[6].y;
      const middleExtended = landmarks[12].y < landmarks[10].y;
      const ringExtended = landmarks[16].y < landmarks[14].y;
      const pinkyExtended = landmarks[20].y < landmarks[18].y;

      // Pinch — thumb and index close together
      const pinchDist = Math.hypot(
        thumbTip.x - indexTip.x,
        thumbTip.y - indexTip.y
      );
      // Normalize by palm size for distance-invariance
      const palmSize = Math.hypot(
        wrist.x - landmarks[9].x,
        wrist.y - landmarks[9].y
      );
      const normalizedPinch = pinchDist / (palmSize + 0.001);

      if (normalizedPinch < 0.35) return 'pinch';

      const extended = [indexExtended, middleExtended, ringExtended, pinkyExtended];
      const extCount = extended.filter(Boolean).length;

      if (extCount === 0) return 'fist';
      if (extCount === 4) return 'palm';
      if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) return 'two_fingers';
      if (indexExtended && middleExtended && ringExtended && !pinkyExtended) return 'three_fingers';

      return 'none';
    };

    const processGesture = (landmarks: any[]) => {
      const raw = classifyGesture(landmarks);

      // Debounce: only change gesture when it's stable for N frames
      gestureBuffer.current.push(raw);
      if (gestureBuffer.current.length > GESTURE_DEBOUNCE) {
        gestureBuffer.current.shift();
      }
      const allSame = gestureBuffer.current.every(g => g === gestureBuffer.current[0]);
      if (allSame && gestureBuffer.current.length === GESTURE_DEBOUNCE) {
        stableGesture.current = gestureBuffer.current[0];
      }

      const gesture = stableGesture.current;

      // Tracking point: use index finger tip as primary cursor
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];

      // Exponential smooth the tracking position
      smoothX.current += (indexTip.x - smoothX.current) * SMOOTH;
      smoothY.current += (indexTip.y - smoothY.current) * SMOOTH;

      // Map gesture to action
      switch (gesture) {
        case 'pinch': {
          setActiveGesture('pinch');
          // Pinch midpoint Y controls scale
          const midY = (thumbTip.y + indexTip.y) / 2;
          const prevMidY = smoothY.current;
          const dy = midY - prevMidY;
          if (Math.abs(dy) > DEAD_ZONE) {
            const newScale = Math.max(0.3, Math.min(3.5, scaleRef.current - dy * 4));
            scaleRef.current = newScale;
            setModelScale(newScale);
          }
          break;
        }
        case 'fist': {
          setActiveGesture('fist');
          if (fistCooldown.current <= 0) {
            rotationRef.current = [0, 0, 0];
            positionRef.current = [0, 0, 0];
            scaleRef.current = 1;
            setModelRotation([0, 0, 0]);
            setModelPosition([0, 0, 0]);
            setModelScale(1);
            setExplodedView(false);
            fistCooldown.current = 60; // 60 frame cooldown
          } else {
            fistCooldown.current--;
          }
          break;
        }
        case 'palm': {
          setActiveGesture('palm');
          setExplodedView(true);
          break;
        }
        case 'two_fingers': {
          // Two fingers = Rotate
          setActiveGesture('swipe');
          const dx = indexTip.x - smoothX.current;
          const dy = indexTip.y - smoothY.current;
          if (Math.abs(dx) > DEAD_ZONE || Math.abs(dy) > DEAD_ZONE) {
            const newRot: [number, number, number] = [
              rotationRef.current[0] + dy * 3,
              rotationRef.current[1] + dx * 3,
              rotationRef.current[2],
            ];
            rotationRef.current = newRot;
            setModelRotation(newRot);
          }
          break;
        }
        case 'three_fingers': {
          // Three fingers = Translate/Pan
          setActiveGesture('two_fingers');
          const dx = indexTip.x - smoothX.current;
          const dy = indexTip.y - smoothY.current;
          if (Math.abs(dx) > DEAD_ZONE || Math.abs(dy) > DEAD_ZONE) {
            const newPos: [number, number, number] = [
              positionRef.current[0] + dx * 8,
              positionRef.current[1] - dy * 8,
              positionRef.current[2],
            ];
            positionRef.current = newPos;
            setModelPosition(newPos);
          }
          break;
        }
        default:
          setActiveGesture('none');
      }
    };

    initializeMediaPipe();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      landmarkerRef.current?.close();
    };
  }, [setActiveGesture, setModelRotation, setModelPosition, setModelScale, setExplodedView]);

  return (
    <div className="webcam-container">
      <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
      <canvas ref={canvasRef} className="webcam-canvas" />
    </div>
  );
};
