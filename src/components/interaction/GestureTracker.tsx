import { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useStore } from '../../store';

const SMOOTH = 0.15;
const DEAD_ZONE = 0.003;
const GESTURE_DEBOUNCE = 6;

export const GestureTracker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);

  const {
    setActiveGesture, setModelRotation, setModelPosition, setModelScale,
    setExplodedView, pushGestureHistory, triggerScreenshot,
  } = useStore();

  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const positionRef = useRef<[number, number, number]>([0, 0, 0]);
  const scaleRef = useRef<[number, number, number]>([1, 1, 1]);
  const prevTwoHandDist = useRef<number | null>(null);
  const { modelRotation, modelPosition, modelScale } = useStore();
  useEffect(() => { rotationRef.current = modelRotation; }, [modelRotation]);
  useEffect(() => { positionRef.current = modelPosition; }, [modelPosition]);
  useEffect(() => { scaleRef.current = modelScale; }, [modelScale]);

  const smoothX = useRef(0);
  const smoothY = useRef(0);
  const prevPinchDist = useRef<number | null>(null);
  const gestureBuffer = useRef<string[]>([]);
  const stableGesture = useRef<string>('none');
  const prevStableGesture = useRef<string>('none');
  const fistCooldown = useRef(0);
  const thumbCooldown = useRef(0);

  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      );
      const lm = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      landmarkerRef.current = lm;

      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 30 },
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

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const now = performance.now();
      if (now === lastTs) { animFrameRef.current = requestAnimationFrame(loop); return; }
      lastTs = now;

      const results = landmarkerRef.current.detectForVideo(video, now);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks?.length > 0) {
        // Draw landmarks for all hands
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (const handLandmarks of results.landmarks) {
          const keyPts = [0, 4, 8, 12, 16, 20];
          for (const i of keyPts) {
            const p = handLandmarks[i];
            ctx.beginPath();
            ctx.arc(p.x * canvas.width, p.y * canvas.height, i === 0 ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        if (results.landmarks.length === 2) {
          processTwoHands(results.landmarks[0], results.landmarks[1]);
        } else {
          prevTwoHandDist.current = null;
          processGesture(results.landmarks[0]);
        }
      } else {
        gestureBuffer.current = [];
        stableGesture.current = 'none';
        setActiveGesture('none');
        smoothX.current = 0;
        smoothY.current = 0;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    const classify = (lm: any[]): string => {
      const thumbTip = lm[4], indexTip = lm[8], wrist = lm[0];
      const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
      const palmSize = Math.hypot(wrist.x - lm[9].x, wrist.y - lm[9].y);
      if (pinchDist / (palmSize + 0.001) < 0.35) return 'pinch';

      const ie = lm[8].y < lm[6].y;
      const me = lm[12].y < lm[10].y;
      const re = lm[16].y < lm[14].y;
      const pe = lm[20].y < lm[18].y;
      const ext = [ie, me, re, pe].filter(Boolean).length;

      if (ext === 0) return 'fist';
      if (ext === 4) return 'palm';

      // Thumb-up: thumb extended upward, other fingers curled
      const thumbUp = lm[4].y < lm[3].y && lm[4].y < lm[2].y && lm[4].y < lm[0].y;
      if (thumbUp && ext === 0) return 'thumb_up';

      if (ie && me && !re && !pe) return 'two_fingers';
      if (ie && me && re && !pe) return 'three_fingers';
      return 'none';
    };

    const processTwoHands = (lm1: any[], lm2: any[]) => {
      setActiveGesture('two_hands');
      
      const index1 = lm1[8];
      const index2 = lm2[8];
      
      const dx = index2.x - index1.x;
      const dy = index2.y - index1.y;
      const dist = Math.hypot(dx, dy);
      
      if (prevTwoHandDist.current !== null) {
        const delta = dist - prevTwoHandDist.current;
        if (Math.abs(delta) > 0.005) {
          const isHorizontal = Math.abs(dx) > Math.abs(dy);
          
          const currentScale = scaleRef.current;
          const newScaleAmt = delta * 10;
          
          const newScale: [number, number, number] = [
            Math.max(0.05, Math.min(10, currentScale[0] + (isHorizontal ? newScaleAmt : 0))),
            Math.max(0.05, Math.min(10, currentScale[1] + (!isHorizontal ? newScaleAmt : 0))),
            currentScale[2]
          ];
          
          scaleRef.current = newScale;
          setModelScale(newScale);
        }
      }
      prevTwoHandDist.current = dist;
      
      gestureBuffer.current = [];
      stableGesture.current = 'none';
      prevPinchDist.current = null;
    };

    const processGesture = (lm: any[]) => {
      const raw = classify(lm);
      gestureBuffer.current.push(raw);
      if (gestureBuffer.current.length > GESTURE_DEBOUNCE) gestureBuffer.current.shift();

      const allSame = gestureBuffer.current.every(g => g === gestureBuffer.current[0]);
      if (allSame && gestureBuffer.current.length === GESTURE_DEBOUNCE) {
        stableGesture.current = gestureBuffer.current[0];
      }

      const gesture = stableGesture.current;

      // Track gesture history
      if (gesture !== 'none' && gesture !== prevStableGesture.current) {
        pushGestureHistory(gesture);
        prevStableGesture.current = gesture;
      }

      if (gesture !== 'pinch') prevPinchDist.current = null;

      const indexTip = lm[8];
      const thumbTip = lm[4];
      smoothX.current += (indexTip.x - smoothX.current) * SMOOTH;
      smoothY.current += (indexTip.y - smoothY.current) * SMOOTH;

      switch (gesture) {
        case 'pinch': {
          setActiveGesture('pinch');
          const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
          if (prevPinchDist.current !== null) {
            const delta = dist - prevPinchDist.current;
            if (Math.abs(delta) > 0.002) {
              const currentX = scaleRef.current[0];
              const newScaleAmt = Math.max(0.3, Math.min(3.5, currentX + delta * 8));
              const newScale: [number, number, number] = [newScaleAmt, newScaleAmt, newScaleAmt];
              scaleRef.current = newScale;
              setModelScale(newScale);
            }
          }
          prevPinchDist.current = dist;
          break;
        }
        case 'fist': {
          setActiveGesture('fist');
          if (fistCooldown.current <= 0) {
            rotationRef.current = [0, 0, 0];
            positionRef.current = [0, 0, 0];
            scaleRef.current = [1, 1, 1];
            setModelRotation([0, 0, 0]);
            setModelPosition([0, 0, 0]);
            setModelScale([1, 1, 1]);
            setExplodedView(false);
            fistCooldown.current = 60;
          } else {
            fistCooldown.current--;
          }
          break;
        }
        case 'palm':
          setActiveGesture('palm');
          setExplodedView(true);
          break;
        case 'two_fingers': {
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
          setActiveGesture('two_fingers');
          const dx = smoothX.current - indexTip.x;
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
        case 'thumb_up': {
          setActiveGesture('none');
          if (thumbCooldown.current <= 0) {
            triggerScreenshot();
            thumbCooldown.current = 90;
          } else {
            thumbCooldown.current--;
          }
          break;
        }
        default:
          setActiveGesture('none');
      }
    };

    init();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject)
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      landmarkerRef.current?.close();
    };
  }, [setActiveGesture, setModelRotation, setModelPosition, setModelScale, setExplodedView, pushGestureHistory, triggerScreenshot]);

  return (
    <div className="webcam-container">
      <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
      <canvas ref={canvasRef} className="webcam-canvas" />
    </div>
  );
};
