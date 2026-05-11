import React, { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useStore } from '../../store';

export const GestureTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const { setActiveGesture, setModelRotation, modelRotation, setModelScale, modelScale, setExplodedView } = useStore();
  
  // Track previous coordinates for swipe detection
  const prevCoords = useRef<{x: number, y: number} | null>(null);
  const frameCount = useRef(0);
  
  // Use refs for current state to avoid re-running useEffect
  const rotationRef = useRef(modelRotation);
  const scaleRef = useRef(modelScale);

  // Sync refs with store values
  useEffect(() => { rotationRef.current = modelRotation; }, [modelRotation]);
  useEffect(() => { scaleRef.current = modelScale; }, [modelScale]);

  useEffect(() => {
    let animationFrameId: number;
    let runningMode: "IMAGE" | "VIDEO" = "VIDEO";

    const initializeMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: runningMode,
        numHands: 2
      });
      
      landmarkerRef.current = handLandmarker;
      startWebcam();
    };

    const startWebcam = async () => {
      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        } catch (err) {
          console.error("Error accessing webcam: ", err);
        }
      }
    };

    const predictWebcam = () => {
      if (!videoRef.current || !landmarkerRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      let startTimeMs = performance.now();
      const results = landmarkerRef.current.detectForVideo(video, startTimeMs);

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (results.landmarks && results.landmarks.length > 0) {
        for (const landmarks of results.landmarks) {
          // Draw landmarks
          ctx.fillStyle = '#00e5ff';
          for (const point of landmarks) {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI);
            ctx.fill();
          }

          analyzeGesture(landmarks);
        }
      } else {
        setActiveGesture('none');
        prevCoords.current = null;
      }
      
      ctx.restore();
      
      // Request next frame
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    const analyzeGesture = (landmarks: any[]) => {
      // Basic heuristics for gesture recognition
      // Thumb tip = 4, Index tip = 8, Middle tip = 12, Ring tip = 16, Pinky tip = 20
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      
      // Calculate distances
      const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
      const isPinch = pinchDist < 0.05;

      // Are fingers extended?
      const indexExtended = landmarks[8].y < landmarks[6].y;
      const middleExtended = landmarks[12].y < landmarks[10].y;
      const ringExtended = landmarks[16].y < landmarks[14].y;
      const pinkyExtended = landmarks[20].y < landmarks[18].y;

      const isFist = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
      const isOpenPalm = indexExtended && middleExtended && ringExtended && pinkyExtended;

      let detectedGesture: 'none' | 'swipe' | 'pinch' | 'palm' | 'fist' | 'two_fingers' = 'none';

      if (isPinch) {
        detectedGesture = 'pinch';
        // Handle Zoom
        if (prevCoords.current) {
          const dy = thumbTip.y - prevCoords.current.y;
          // Inverted: move hand up to zoom in
          const newScale = Math.max(0.5, Math.min(3, scaleRef.current - dy * 5));
          setModelScale(newScale);
        }
      } else if (isFist) {
        detectedGesture = 'fist';
        // Reset View
        setModelRotation([0, 0, 0]);
        setModelScale(1);
        setExplodedView(false);
      } else if (isOpenPalm) {
        detectedGesture = 'palm';
        // Explode
        setExplodedView(true);
      } else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        detectedGesture = 'swipe';
        // Rotate
        if (prevCoords.current) {
          const dx = indexTip.x - prevCoords.current.x;
          const dy = indexTip.y - prevCoords.current.y;
          setModelRotation([
            rotationRef.current[0] + dy * 2,
            rotationRef.current[1] + dx * 2,
            rotationRef.current[2]
          ]);
        }
      } else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        detectedGesture = 'two_fingers';
      }

      setActiveGesture(detectedGesture);

      // Save coords for next frame
      prevCoords.current = {
        x: indexTip.x,
        y: indexTip.y
      };
    };

    initializeMediaPipe();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []); // Run only on mount

  return (
    <div className="webcam-container">
      <video ref={videoRef} autoPlay playsInline className="webcam-video" style={{ transform: 'scaleX(-1)' }} />
      <canvas ref={canvasRef} className="webcam-canvas" style={{ transform: 'scaleX(-1)' }} />
    </div>
  );
};
