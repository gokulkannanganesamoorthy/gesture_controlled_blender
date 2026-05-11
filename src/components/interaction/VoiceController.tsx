import React, { useEffect, useRef } from 'react';
import { useStore } from '../../store';

export const VoiceController: React.FC = () => {
  const { isListeningVoice, setScannerMode, setTheme, setExplodedView } = useStore();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if SpeechRecognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition is not supported in this browser.');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.toLowerCase();
        console.log('Voice Command:', transcript);

        // Command matching
        if (transcript.includes('x-ray') || transcript.includes('xray')) {
          setScannerMode('xray');
        } else if (transcript.includes('wireframe')) {
          setScannerMode('wireframe');
        } else if (transcript.includes('standard')) {
          setScannerMode('standard');
        } else if (transcript.includes('technical')) {
          setScannerMode('technical');
        } else if (transcript.includes('dark mode')) {
          setTheme('dark');
        } else if (transcript.includes('light mode')) {
          setTheme('light');
        } else if (transcript.includes('cyberpunk')) {
          setTheme('cyberpunk');
        } else if (transcript.includes('explode')) {
          setExplodedView(true);
        } else if (transcript.includes('assemble') || transcript.includes('reset')) {
          setExplodedView(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
      };

      recognitionRef.current = recognition;
    }

    const recognition = recognitionRef.current;

    if (isListeningVoice) {
      try {
        recognition.start();
      } catch (e) {
        // Ignore if already started
      }
    } else {
      recognition.stop();
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isListeningVoice, setScannerMode, setTheme, setExplodedView]);

  return null; // Headless component
};
