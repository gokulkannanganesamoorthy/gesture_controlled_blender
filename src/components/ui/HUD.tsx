import { useStore } from '../../store';
import type { Theme, ScannerMode } from '../../store';
import { Monitor, Layers, Eye, Activity, Mic, MicOff, Box, Hand, Maximize2, Sun, Moon, Zap } from 'lucide-react';

export const HUD = () => {
  const {
    theme, setTheme,
    scannerMode, setScannerMode,
    activeGesture,
    isListeningVoice, setIsListeningVoice,
    modelRotation, modelPosition, modelScale,
  } = useStore();

  const fmt = (n: number) => n.toFixed(2).padStart(6, ' ');

  const gestureLabel: Record<string, string> = {
    none: 'None',
    swipe: '2-Finger Rotate',
    two_fingers: '3-Finger Pan',
    pinch: 'Pinch Zoom',
    palm: 'Open Palm',
    fist: 'Fist Reset',
  };

  return (
    <div className="layout">
      {/* Top Bar */}
      <header className="topbar">
        <span className="topbar-logo">VISIONARY_3D</span>
        <div className="topbar-sep" />
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
          {scannerMode.toUpperCase()}
        </span>
        <div className="topbar-right">
          <button className={`btn icon-only ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark' as Theme)} title="Dark">
            <Moon size={13} />
          </button>
          <button className={`btn icon-only ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light' as Theme)} title="Light">
            <Sun size={13} />
          </button>
          <button className={`btn icon-only ${theme === 'cyberpunk' ? 'active' : ''}`} onClick={() => setTheme('cyberpunk' as Theme)} title="Cyberpunk">
            <Zap size={13} />
          </button>
        </div>
      </header>

      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-group">
          <div className="sidebar-group-label">Viewport</div>
          {(['standard', 'wireframe', 'xray', 'technical'] as ScannerMode[]).map(mode => (
            <button
              key={mode}
              className={`btn ${scannerMode === mode ? 'active' : ''}`}
              onClick={() => setScannerMode(mode)}
            >
              {mode === 'standard' && <Monitor size={13} />}
              {mode === 'wireframe' && <Layers size={13} />}
              {mode === 'xray' && <Eye size={13} />}
              {mode === 'technical' && <Activity size={13} />}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-label">Interaction</div>
          <button className={`btn ${isListeningVoice ? 'active' : ''}`} onClick={() => setIsListeningVoice(!isListeningVoice)}>
            {isListeningVoice ? <Mic size={13} /> : <MicOff size={13} />}
            Voice Control
          </button>
        </div>
      </aside>

      {/* 3D Canvas lives in App.tsx, this is just the grid slot */}
      <div className="canvas-area" />

      {/* Right Inspector */}
      <aside className="inspector">
        <div className="inspector-header">
          <Box size={11} /> Properties
        </div>

        <div className="inspector-section">
          <div className="inspector-section-label">Transform</div>
          <div className="data-row"><span className="data-key">rot.x</span><span className="data-val">{fmt(modelRotation[0])}</span></div>
          <div className="data-row"><span className="data-key">rot.y</span><span className="data-val">{fmt(modelRotation[1])}</span></div>
          <div className="data-row"><span className="data-key">pos.x</span><span className="data-val">{fmt(modelPosition[0])}</span></div>
          <div className="data-row"><span className="data-key">pos.y</span><span className="data-val">{fmt(modelPosition[1])}</span></div>
          <div className="data-row"><span className="data-key">scale</span><span className="data-val">{fmt(modelScale)}</span></div>
        </div>

        <div className="inspector-section">
          <div className="inspector-section-label">Gesture Guide</div>
          <div className="gesture-row">
            <span className="gesture-key">2 finger</span>
            <span className="gesture-val">Rotate</span>
          </div>
          <div className="gesture-row">
            <span className="gesture-key">3 finger</span>
            <span className="gesture-val">Pan</span>
          </div>
          <div className="gesture-row">
            <span className="gesture-key">Pinch</span>
            <span className="gesture-val">Zoom</span>
          </div>
          <div className="gesture-row">
            <span className="gesture-key">Palm</span>
            <span className="gesture-val">Explode</span>
          </div>
          <div className="gesture-row">
            <span className="gesture-key">Fist</span>
            <span className="gesture-val">Reset</span>
          </div>
        </div>

        <div className="inspector-section" style={{ marginTop: 'auto' }}>
          <div className="inspector-section-label">Active Gesture</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: activeGesture !== 'none' ? 'var(--text)' : 'var(--text-muted)', padding: '4px 0' }}>
            {gestureLabel[activeGesture] ?? activeGesture}
          </div>
        </div>
      </aside>

      {/* Status Bar */}
      <footer className="statusbar">
        <div className="status-item">
          <div className={`status-dot ${activeGesture !== 'none' ? 'active' : ''}`} />
          <span>HAND TRACK</span>
        </div>
        <div className="status-item">
          <div className={`status-dot ${isListeningVoice ? 'live' : ''}`} />
          <span>VOICE</span>
        </div>
        <span style={{ marginLeft: 'auto' }}>{scannerMode.toUpperCase()} MODE</span>
      </footer>
    </div>
  );
};
