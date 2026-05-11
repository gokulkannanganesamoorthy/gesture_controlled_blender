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
  Hand,
  Settings,
  Info,
  Box
} from 'lucide-react';

export const HUD: React.FC = () => {
  const { 
    theme, setTheme, 
    scannerMode, setScannerMode, 
    activeGesture, 
    isListeningVoice, setIsListeningVoice,
    modelRotation,
    modelPosition,
    modelScale
  } = useStore();

  const handleThemeChange = (newTheme: Theme) => setTheme(newTheme);
  const handleScannerChange = (mode: ScannerMode) => setScannerMode(mode);

  const formatCoord = (c: number) => c.toFixed(2);

  return (
    <div className="hud-layer">
      {/* Top Header */}
      <header className="hud-header">
        <div className="hud-title">VISIONARY_3D v1.0.4</div>
        <div className="hud-controls">
          <button 
            className={`glass-button ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeChange('dark')}
          >
            <Moon size={14} />
          </button>
          <button 
            className={`glass-button ${theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeChange('light')}
          >
            <Sun size={14} />
          </button>
          <button 
            className={`glass-button ${theme === 'cyberpunk' ? 'active' : ''}`}
            onClick={() => handleThemeChange('cyberpunk')}
          >
            <Zap size={14} />
          </button>
        </div>
      </header>

      {/* Left Sidebar */}
      <aside className="hud-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">Viewport Mode</div>
          <button 
            className={`glass-button ${scannerMode === 'standard' ? 'active' : ''}`}
            onClick={() => handleScannerChange('standard')}
          >
            <Monitor size={14} /> Standard
          </button>
          <button 
            className={`glass-button ${scannerMode === 'wireframe' ? 'active' : ''}`}
            onClick={() => handleScannerChange('wireframe')}
          >
            <Layers size={14} /> Wireframe
          </button>
          <button 
            className={`glass-button ${scannerMode === 'xray' ? 'active' : ''}`}
            onClick={() => handleScannerChange('xray')}
          >
            <Eye size={14} /> X-Ray
          </button>
          <button 
            className={`glass-button ${scannerMode === 'technical' ? 'active' : ''}`}
            onClick={() => handleScannerChange('technical')}
          >
            <Activity size={14} /> Technical
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Interaction</div>
          <button 
            className="glass-button"
            onClick={() => setIsListeningVoice(!isListeningVoice)}
          >
            {isListeningVoice ? <Mic size={14} color="var(--color-accent)" /> : <MicOff size={14} />} 
            Voice Control
          </button>
        </div>
        
        <div style={{ marginTop: 'auto' }} className="sidebar-section">
          <button className="glass-button"><Settings size={14} /></button>
          <button className="glass-button"><Info size={14} /></button>
        </div>
      </aside>

      {/* Right Inspector */}
      <div className="hud-inspector">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="inspector-panel"
        >
          <div className="sidebar-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={12} /> Transform
          </div>
          <div className="data-grid">
            <span className="data-label">Rotation X</span>
            <span className="data-value">{formatCoord(modelRotation[0])}</span>
            <span className="data-label">Rotation Y</span>
            <span className="data-value">{formatCoord(modelRotation[1])}</span>
            
            <div style={{ gridColumn: '1/-1', height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
            
            <span className="data-label">Position X</span>
            <span className="data-value">{formatCoord(modelPosition[0])}</span>
            <span className="data-label">Position Y</span>
            <span className="data-value">{formatCoord(modelPosition[1])}</span>
            
            <div style={{ gridColumn: '1/-1', height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
            
            <span className="data-label">Scale</span>
            <span className="data-value">{formatCoord(modelScale)}</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="inspector-panel"
        >
          <div className="sidebar-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hand size={12} /> Gesture Guide
          </div>
          <div className="data-grid" style={{ fontSize: '0.65rem' }}>
            <span className="data-label">2-Finger</span>
            <span className="data-value" style={{ color: 'var(--color-text)' }}>Rotate</span>
            <span className="data-label">3-Finger</span>
            <span className="data-value" style={{ color: 'var(--color-text)' }}>Translate</span>
            <span className="data-label">Pinch</span>
            <span className="data-value" style={{ color: 'var(--color-text)' }}>Zoom</span>
            <span className="data-label">Palm</span>
            <span className="data-value" style={{ color: 'var(--color-text)' }}>Explode</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Status Bar */}
      <footer className="hud-status">
        <div className="status-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={`status-dot ${isListeningVoice ? 'recording' : ''}`}></div>
            <span>{isListeningVoice ? 'LISTENING' : 'VOICE_IDLE'}</span>
          </div>
          <div style={{ borderLeft: '1px solid var(--color-border)', height: '12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
            <Hand size={12} />
            <span>{activeGesture === 'none' ? 'SCANNING...' : activeGesture.toUpperCase()}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', color: 'var(--color-text-muted)' }}>
            <span>FPS: 60</span>
            <span>GPU: ENABLED</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
