import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import type { Theme, ScannerMode } from '../../store';
import { 
  Monitor, 
  Layers, 
  Eye, 
  Activity,
  Moon,
  Sun,
  Zap,
  Mic,
  MicOff,
  Hand
} from 'lucide-react';

export const HUD: React.FC = () => {
  const { 
    theme, setTheme, 
    scannerMode, setScannerMode, 
    activeGesture, 
    isListeningVoice, setIsListeningVoice 
  } = useStore();

  const handleThemeChange = (newTheme: Theme) => setTheme(newTheme);
  const handleScannerChange = (mode: ScannerMode) => setScannerMode(mode);

  return (
    <div className="hud-layer">
      {/* Top Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="hud-header"
      >
        <div>
          <h1 className="hud-title">VISIONARY 3D</h1>
          <div className="hud-subtitle">Spatial Configuration Hub</div>
        </div>

        <div className="hud-controls">
          <button 
            className={`glass-button ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeChange('dark')}
          >
            <Moon size={16} /> Dark
          </button>
          <button 
            className={`glass-button ${theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeChange('light')}
          >
            <Sun size={16} /> Light
          </button>
          <button 
            className={`glass-button ${theme === 'cyberpunk' ? 'active' : ''}`}
            onClick={() => handleThemeChange('cyberpunk')}
          >
            <Zap size={16} /> Cyberpunk
          </button>
        </div>
      </motion.div>

      {/* Left Sidebar - Scanner Modes */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="hud-sidebar"
      >
        <button 
          className={`glass-button ${scannerMode === 'standard' ? 'active' : ''}`}
          onClick={() => handleScannerChange('standard')}
        >
          <Monitor size={16} /> Standard
        </button>
        <button 
          className={`glass-button ${scannerMode === 'wireframe' ? 'active' : ''}`}
          onClick={() => handleScannerChange('wireframe')}
        >
          <Layers size={16} /> Wireframe
        </button>
        <button 
          className={`glass-button ${scannerMode === 'xray' ? 'active' : ''}`}
          onClick={() => handleScannerChange('xray')}
        >
          <Eye size={16} /> X-Ray
        </button>
        <button 
          className={`glass-button ${scannerMode === 'technical' ? 'active' : ''}`}
          onClick={() => handleScannerChange('technical')}
        >
          <Activity size={16} /> Technical
        </button>
      </motion.div>

      {/* Bottom Status */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="hud-status glass-panel"
        style={{ padding: '16px' }}
      >
        <div className="status-indicator">
          <div className={`status-dot ${isListeningVoice ? 'recording' : ''}`}></div>
          Voice Command: {isListeningVoice ? 'Listening...' : 'Offline'}
          <button 
            className="glass-button" 
            style={{ padding: '4px 8px', marginLeft: 'auto' }}
            onClick={() => setIsListeningVoice(!isListeningVoice)}
          >
            {isListeningVoice ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
        </div>
        
        <div className="status-indicator" style={{ marginTop: '12px' }}>
          <Hand size={16} className="gesture-icon" />
          Active Gesture: <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{activeGesture.toUpperCase()}</span>
        </div>

        <div className="gestures-guide">
          <div className="gesture-item">
            <span>🖐️ Swipe</span> - Rotate Model
          </div>
          <div className="gesture-item">
            <span>🤏 Pinch</span> - Zoom In/Out
          </div>
          <div className="gesture-item">
            <span>✋ Open Palm</span> - Exploded View
          </div>
          <div className="gesture-item">
            <span>✊ Fist</span> - Reset View
          </div>
        </div>
      </motion.div>
    </div>
  );
};
