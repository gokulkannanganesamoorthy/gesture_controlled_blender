import { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { ScannerMode, CameraPreset, RenderQuality, PrimitiveType } from '../../store';
import {
  Upload, RotateCcw, Layers, Monitor, Box,
  ChevronDown, ChevronRight, Camera, Play,
  Maximize2, Minimize2, Image, Keyboard, X,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const toDeg = (r: number) => ((r * 180) / Math.PI).toFixed(1);
const fromDeg = (d: number) => (d * Math.PI) / 180;

// ── Axis Indicator ─────────────────────────────────────────────────────────
const AxisIndicator = () => {
  const { modelRotation } = useStore();
  const [rx, ry] = modelRotation;

  const project = ([vx, vy, vz]: [number, number, number]) => {
    const cosY = Math.cos(-ry), sinY = Math.sin(-ry);
    const cosX = Math.cos(-rx), sinX = Math.sin(-rx);
    const x1 = vx * cosY + vz * sinY;
    const z1 = -vx * sinY + vz * cosY;
    const y2 = vy * cosX - z1 * sinX;
    return { sx: x1, sy: -y2 };
  };

  const getDepth = ([vx, vy, vz]: [number, number, number]) => {
    const cosY = Math.cos(-ry), sinY = Math.sin(-ry);
    const cosX = Math.cos(-rx), sinX = Math.sin(-rx);
    const z1 = -vx * sinY + vz * cosY;
    const vz2 = vy * sinX + z1 * cosX;
    return vz2;
  };

  const axes = [
    { label: 'X', vec: [1, 0, 0] as [number,number,number], color: '#c05050' },
    { label: 'Y', vec: [0, 1, 0] as [number,number,number], color: '#50a050' },
    { label: 'Z', vec: [0, 0, 1] as [number,number,number], color: '#5070d0' },
  ];
  const sorted = [...axes].sort((a, b) => getDepth(a.vec) - getDepth(b.vec));
  const cx = 36, cy = 36, len = 26;

  return (
    <svg width={72} height={72} style={{ display: 'block' }}>
      {sorted.map(({ label, vec, color }) => {
        const { sx, sy } = project(vec);
        const behind = getDepth(vec) < -0.05;
        const mag = Math.max(Math.hypot(sx, sy), 0.15);
        const lx = cx + (sx / mag) * (len + 10);
        const ly = cy + (sy / mag) * (len + 10);
        const ex = cx + sx * len, ey = cy + sy * len;
        return (
          <g key={label} opacity={behind ? 0.3 : 1}>
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color}
              strokeWidth={behind ? 1 : 1.8} strokeDasharray={behind ? '3 2' : undefined} />
            <circle cx={ex} cy={ey} r={2} fill={color} />
            <text x={lx} y={ly} fill={color} fontSize={9} textAnchor="middle"
              dominantBaseline="middle" fontFamily="JetBrains Mono,monospace" fontWeight={500}>
              {label}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={3} fill="#555" />
    </svg>
  );
};

// ── Collapsible Section ────────────────────────────────────────────────────
const Section = ({ label, children, defaultOpen = true }: {
  label: string; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <button className="section-header" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />} {label}
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
};

// ── Editable Value ─────────────────────────────────────────────────────────
const EditableVal = ({ value, onCommit, unit = '' }: {
  value: number; onCommit: (v: number) => void; unit?: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  if (editing) {
    return (
      <input
        className="prop-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { const v = parseFloat(draft); if (!isNaN(v)) onCommit(v); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { const v = parseFloat(draft); if (!isNaN(v)) onCommit(v); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
        autoFocus
      />
    );
  }
  return (
    <span className="prop-val mono editable" onClick={() => { setDraft(String(value.toFixed(3))); setEditing(true); }} title="Click to edit">
      {value.toFixed(3)}{unit}
    </span>
  );
};

// ── Slider Row ─────────────────────────────────────────────────────────────
const SliderRow = ({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div className="prop-row">
    <span className="prop-label">{label}</span>
    <div className="prop-slider-wrap">
      <input type="range" className="prop-slider" min={min} max={max} step={step}
        value={value} onChange={e => onChange(parseFloat(e.target.value))} />
      <span className="prop-val">{value.toFixed(2)}</span>
    </div>
  </div>
);

// ── Add Mesh Dropdown ──────────────────────────────────────────────────────
const PRIMITIVES: { id: PrimitiveType; label: string; shortcut: string }[] = [
  { id: 'cube',     label: 'Cube',     shortcut: '' },
  { id: 'sphere',   label: 'UV Sphere', shortcut: '' },
  { id: 'cylinder', label: 'Cylinder',  shortcut: '' },
  { id: 'cone',     label: 'Cone',      shortcut: '' },
  { id: 'torus',    label: 'Torus',     shortcut: '' },
  { id: 'plane',    label: 'Plane',     shortcut: '' },
];

const AddMeshMenu = () => {
  const { showAddMenu, setShowAddMenu, setPrimitiveType } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowAddMenu(false);
    };
    if (showAddMenu) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showAddMenu, setShowAddMenu]);
  if (!showAddMenu) return null;
  return (
    <div ref={ref} className="add-menu">
      <div className="add-menu-group">Mesh</div>
      {PRIMITIVES.map(p => (
        <button key={p.id} className="add-menu-item" onClick={() => { setPrimitiveType(p.id); setShowAddMenu(false); }}>
          {p.label}
        </button>
      ))}
    </div>
  );
};

// ── Keyboard Shortcuts Modal ───────────────────────────────────────────────
const ShortcutsModal = ({ onClose }: { onClose: () => void }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <span>Keyboard Shortcuts</span>
        <button className="modal-close" onClick={onClose}><X size={13} /></button>
      </div>
      <div className="modal-body">
        <div className="shortcut-section-label">Viewport</div>
        {[
          ['LMB drag',   'Rotate model'],
          ['MMB drag',   'Pan model'],
          ['Shift+LMB',  'Pan model'],
          ['Scroll',     'Zoom'],
          ['RMB drag',   'Pan model'],
        ].map(([k, v]) => (
          <div key={k} className="shortcut-row"><kbd className="kbd">{k}</kbd><span>{v}</span></div>
        ))}
        <div className="shortcut-section-label" style={{ marginTop: 10 }}>Keyboard</div>
        {[
          ['1–5',        'Camera presets'],
          ['Shift+A',    'Add mesh'],
          ['T',          'Turntable toggle'],
          ['P',          'Presentation mode'],
          ['Space',      'Reset transforms'],
          ['Esc',        'Close / Exit'],
          ['⌘/Ctrl+S',   'Screenshot'],
        ].map(([k, v]) => (
          <div key={k} className="shortcut-row"><kbd className="kbd">{k}</kbd><span>{v}</span></div>
        ))}
        <div className="shortcut-section-label" style={{ marginTop: 10 }}>Gestures</div>
        {[
          ['2 fingers',  'Rotate'],
          ['3 fingers',  'Pan'],
          ['Pinch',      'Zoom'],
          ['Open palm',  'Explode'],
          ['Fist',       'Reset'],
          ['Thumb up',   'Screenshot'],
        ].map(([k, v]) => (
          <div key={k} className="shortcut-row"><kbd className="kbd" style={{ minWidth: 80 }}>{k}</kbd><span>{v}</span></div>
        ))}
      </div>
    </div>
  </div>
);

// ── Material Presets ───────────────────────────────────────────────────────
const PRESETS = {
  Matte:   { roughness: 1.0, metalness: 0.0, materialColor: '#b0b0b0' },
  Metal:   { roughness: 0.1, metalness: 1.0, materialColor: '#cccccc' },
  Glass:   { roughness: 0.0, metalness: 0.0, materialColor: '#aaccff' },
  Plastic: { roughness: 0.5, metalness: 0.0, materialColor: '#ffffff' },
};

// ── Main HUD ──────────────────────────────────────────────────────────────
export const HUD = () => {
  const {
    scannerMode, setScannerMode,
    activeGesture, gestureHistory,
    gestureEnabled, setGestureEnabled,
    modelRotation, setModelRotation,
    modelPosition, setModelPosition,
    modelScale, setModelScale,
    explodedView, setExplodedView,
    modelName, primitiveType, setModel,
    materialColor, setMaterialColor,
    roughness, setRoughness,
    metalness, setMetalness,
    textureUrl, setTextureUrl,
    envPreset, setEnvPreset,
    bgColor, setBgColor,
    enableShadows, setEnableShadows,
    showGrid, setShowGrid,
    cameraPreset, setCameraPreset,
    turntableMode, setTurntableMode,
    presentationMode, setPresentationMode,
    renderQuality, setRenderQuality,
    fps, triggerScreenshot,
    showAddMenu, setShowAddMenu,
    transformMode, setTransformMode,
  } = useStore();

  const hasContent = !!modelName || !!primitiveType;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setModel(URL.createObjectURL(f), f.name);
    e.target.value = '';
  };

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setTextureUrl(URL.createObjectURL(f));
    e.target.value = '';
  };

  const resetAll = () => {
    setModelRotation([0, 0, 0]); setModelPosition([0, 0, 0]);
    setModelScale(1); setExplodedView(false);
  };

  const applyPreset = (key: keyof typeof PRESETS) => {
    const { roughness: r, metalness: m, materialColor: c } = PRESETS[key];
    setRoughness(r); setMetalness(m); setMaterialColor(c);
  };

  const gestureLabel: Record<string, string> = {
    none: '—', swipe: 'Rotate', two_fingers: 'Pan',
    pinch: 'Zoom', palm: 'Explode', fist: 'Reset',
  };

  const camBtns: { key: CameraPreset; label: string }[] = [
    { key: 'front', label: '1' },
    { key: 'side',  label: '2' },
    { key: 'top',   label: '3' },
    { key: 'iso',   label: '4' },
    { key: 'free',  label: '5' },
  ];

  if (presentationMode) {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
        {/* Axis Indicator */}
        <div style={{ position: 'absolute', top: 20, left: 20, opacity: 0.6 }}>
          <AxisIndicator />
        </div>

        {/* Top Right Controls */}
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <button className="topbar-btn" style={{ background: 'var(--bg-panel)' }} onClick={() => setShowShortcuts(true)}>
            <Keyboard size={13} /> Shortcuts
          </button>
          <button className="topbar-btn accent" style={{ background: 'var(--bg-panel)' }} onClick={() => setPresentationMode(false)} title="Exit Presentation (Esc)">
            <Minimize2 size={13} /> Exit (Esc)
          </button>
        </div>

        {/* Bottom Right - Gesture Status */}
        <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, pointerEvents: 'auto' }}>
          {gestureEnabled && (
            <div style={{ 
              background: 'var(--bg-panel)', padding: '6px 12px', borderRadius: 'var(--r)', 
              border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--text-muted)'
            }}>
              <div className={`status-dot ${activeGesture !== 'none' ? 'active' : ''}`} />
              <span>{gestureLabel[activeGesture] ?? '—'}</span>
            </div>
          )}
        </div>
        {/* Shortcuts Modal */}
        {showShortcuts && (
          <div style={{ pointerEvents: 'auto' }}>
            <ShortcutsModal onClose={() => setShowShortcuts(false)} />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      <div className="layout">
        {/* ── Topbar ── */}
        <header className="topbar">
          <span className="topbar-logo">GESTURA</span>
          <div className="topbar-sep" />

          {/* Add Mesh */}
          <div style={{ position: 'relative' }}>
            <button
              className={`topbar-mode-btn ${showAddMenu ? 'active' : ''}`}
              onClick={() => setShowAddMenu(!showAddMenu)}
              title="Add mesh (Shift+A)">
              + Add
            </button>
            <AddMeshMenu />
          </div>

          <div className="topbar-sep" />

          {/* Viewport modes */}
          {([['standard','Solid'], ['wireframe','Wireframe'], ['xray','X-Ray']] as [ScannerMode, string][]).map(([k, l]) => (
            <button key={k} className={`topbar-mode-btn ${scannerMode === k ? 'active' : ''}`}
              onClick={() => setScannerMode(k)}>
              {k === 'standard' && <Monitor size={12} />}
              {k === 'wireframe' && <Layers size={12} />}
              {k === 'xray' && <Box size={12} />}
              {l}
            </button>
          ))}

          <div className="topbar-sep" />

          {/* Camera presets */}
          {camBtns.map(({ key, label }) => (
            <button key={key} className={`topbar-cam-btn ${cameraPreset === key ? 'active' : ''}`}
              onClick={() => setCameraPreset(key)} title={`Camera: ${key} view`}>
              {label}
            </button>
          ))}

          <div className="topbar-right">
            <button className={`topbar-btn ${turntableMode ? 'active' : ''}`}
              onClick={() => setTurntableMode(!turntableMode)} title="Turntable (T)">
              <Play size={12} />
            </button>
            <button className="topbar-btn" onClick={triggerScreenshot} title="Screenshot (⌘S)">
              <Camera size={12} />
            </button>
            <button className="topbar-btn accent" onClick={() => setPresentationMode(true)} title="Present (P)">
              <Maximize2 size={12} />
            </button>
            <div className="topbar-sep" />
            <button className="topbar-btn accent" onClick={() => fileInputRef.current?.click()}>
              <Upload size={12} /> Import
            </button>
            <button className="topbar-btn" onClick={resetAll} title="Reset (Space)">
              <RotateCcw size={12} />
            </button>
            <button className="topbar-btn" onClick={() => setShowShortcuts(true)} title="Shortcuts (?)">
              <Keyboard size={12} />
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={handleFileUpload} />
          <input ref={textureInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleTextureUpload} />
        </header>

        {/* ── Canvas Area ── */}
        <div className="canvas-area">
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 10, opacity: 0.8 }}>
            <AxisIndicator />
          </div>
          {/* Viewport hint bar */}
          <div className="viewport-hint">
            <span>LMB Rot</span>
            <span className="hint-sep">·</span>
            <span>MMB Pan</span>
            <span className="hint-sep">·</span>
            <span>Shift+A Add</span>
            <span className="hint-sep">·</span>
            <span>G Grab</span>
            <span className="hint-sep">·</span>
            <span>R Rot</span>
            <span className="hint-sep">·</span>
            <span>S Scale</span>
          </div>
          {!hasContent && (
            <div className="no-model-notice">
              <Box size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p>No model loaded</p>
              <p className="sub">Import a GLB / GLTF or add a primitive mesh</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="topbar-btn accent" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={13} /> Import GLB
                </button>
                <button className="topbar-btn" onClick={() => setShowAddMenu(true)}>
                  + Add Mesh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Inspector ── */}
        <aside className="inspector">
          {/* Object */}
          <Section label="Object">
            <div className="prop-row">
              <span className="prop-label">Source</span>
              <span className="prop-val mono" style={{ fontSize: '0.62rem' }}>
                {primitiveType ? 'Primitive' : modelName ? 'File' : '—'}
              </span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Name</span>
              <span className="prop-val mono" style={{ fontSize: '0.62rem', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {modelName ?? '—'}
              </span>
            </div>
          </Section>

          {/* Transform */}
          <Section label="Transform">
            {/* Rotation */}
            {(['x','y','z'] as const).map((axis, i) => (
              <div key={axis} className="prop-row">
                <span className={`prop-label ${axis}`}>Rot {axis.toUpperCase()}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <EditableVal
                    value={parseFloat(toDeg(modelRotation[i]))}
                    unit="°"
                    onCommit={v => {
                      const r = [...modelRotation] as [number,number,number];
                      r[i] = fromDeg(v);
                      setModelRotation(r);
                    }}
                  />
                  <button className="reset-btn" title="Reset" onClick={() => {
                    const r = [...modelRotation] as [number,number,number]; r[i] = 0; setModelRotation(r);
                  }}>×</button>
                </div>
              </div>
            ))}
            <div className="prop-sep" />
            {/* Position */}
            {(['x','y','z'] as const).map((axis, i) => (
              <div key={axis} className="prop-row">
                <span className={`prop-label ${axis}`}>Pos {axis.toUpperCase()}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <EditableVal
                    value={modelPosition[i]}
                    onCommit={v => {
                      const p = [...modelPosition] as [number,number,number]; p[i] = v; setModelPosition(p);
                    }}
                  />
                  <button className="reset-btn" title="Reset" onClick={() => {
                    const p = [...modelPosition] as [number,number,number]; p[i] = 0; setModelPosition(p);
                  }}>×</button>
                </div>
              </div>
            ))}
            <div className="prop-sep" />
            {/* Scale */}
            <div className="prop-row">
              <span className="prop-label">Scale</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <EditableVal value={modelScale} onCommit={v => setModelScale(Math.max(0.01, v))} />
                <button className="reset-btn" onClick={() => setModelScale(1)}>×</button>
              </div>
            </div>
            <div className="prop-row">
              <span className="prop-label">Exploded</span>
              <button className={`toggle-btn ${explodedView ? 'active' : ''}`}
                onClick={() => setExplodedView(!explodedView)}>
                {explodedView ? 'ON' : 'OFF'}
              </button>
            </div>
          </Section>

          {/* Material */}
          <Section label="Material">
            {/* Presets */}
            <div className="preset-grid">
              {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map(k => (
                <button key={k} className="preset-btn" onClick={() => applyPreset(k)}>{k}</button>
              ))}
            </div>
            <div className="prop-sep" />
            <div className="prop-row">
              <span className="prop-label">Color</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="color" className="color-swatch" value={materialColor}
                  onChange={e => setMaterialColor(e.target.value)} />
                <span className="prop-val mono" style={{ fontSize: '0.62rem' }}>{materialColor}</span>
              </div>
            </div>
            <SliderRow label="Roughness" value={roughness} min={0} max={1} step={0.01} onChange={setRoughness} />
            <SliderRow label="Metalness" value={metalness} min={0} max={1} step={0.01} onChange={setMetalness} />
            <div className="prop-row">
              <span className="prop-label">Texture</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="topbar-btn" style={{ padding: '3px 8px', fontSize: '0.68rem' }}
                  onClick={() => textureInputRef.current?.click()}>
                  <Image size={11} /> Upload
                </button>
                {textureUrl && (
                  <button className="reset-btn" onClick={() => setTextureUrl(null)} title="Remove texture">×</button>
                )}
              </div>
            </div>
          </Section>

          {/* Environment */}
          <Section label="Environment" defaultOpen={false}>
            <div className="prop-row">
              <span className="prop-label">HDRI</span>
              <select className="prop-select" value={envPreset} onChange={e => setEnvPreset(e.target.value as any)}>
                <option value="none">None</option>
                <option value="city">City</option>
                <option value="sunset">Sunset</option>
                <option value="dawn">Dawn</option>
                <option value="studio">Studio</option>
              </select>
            </div>
            <div className="prop-row">
              <span className="prop-label">Background</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="color" className="color-swatch" value={bgColor}
                  onChange={e => setBgColor(e.target.value)} />
                <span className="prop-val mono" style={{ fontSize: '0.62rem' }}>{bgColor}</span>
              </div>
            </div>
          </Section>

          {/* View */}
          <Section label="View" defaultOpen={false}>
            <div className="prop-row">
              <span className="prop-label">Shadows</span>
              <button className={`toggle-btn ${enableShadows ? 'active' : ''}`}
                onClick={() => setEnableShadows(!enableShadows)}>
                {enableShadows ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="prop-row">
              <span className="prop-label">Grid</span>
              <button className={`toggle-btn ${showGrid ? 'active' : ''}`}
                onClick={() => setShowGrid(!showGrid)}>
                {showGrid ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="prop-row">
              <span className="prop-label">Quality</span>
              <select className="prop-select" value={renderQuality}
                onChange={e => setRenderQuality(e.target.value as RenderQuality)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </Section>

          {/* Controls */}
          <Section label="Controls" defaultOpen={false}>
            {/* Gizmos */}
            <div className="prop-row" style={{ marginBottom: 4 }}>
              <span className="prop-label" style={{ fontWeight: 500, color: 'var(--text)' }}>Gizmos</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button className={`preset-btn ${transformMode === 'translate' ? 'active' : ''}`}
                onClick={() => setTransformMode(transformMode === 'translate' ? null : 'translate')}>Translate (G)</button>
              <button className={`preset-btn ${transformMode === 'rotate' ? 'active' : ''}`}
                onClick={() => setTransformMode(transformMode === 'rotate' ? null : 'rotate')}>Rotate (R)</button>
              <button className={`preset-btn ${transformMode === 'scale' ? 'active' : ''}`}
                onClick={() => setTransformMode(transformMode === 'scale' ? null : 'scale')}>Scale (S)</button>
            </div>
            <div className="prop-sep" />
            <div className="prop-row" style={{ marginBottom: 4 }}>
              <span className="prop-label" style={{ fontWeight: 500, color: 'var(--text)' }}>Mouse</span>
            </div>
            {[
              ['LMB drag',  'Rotate'],
              ['MMB drag',  'Pan'],
              ['Shift+LMB', 'Pan'],
              ['RMB drag',  'Pan'],
              ['Scroll',    'Zoom'],
            ].map(([k, v]) => (
              <div key={k} className="prop-row">
                <span className="prop-label">{k}</span>
                <span className="prop-val" style={{ fontSize: '0.68rem' }}>{v}</span>
              </div>
            ))}
            <div className="prop-sep" />
            <div className="prop-row" style={{ marginBottom: 4 }}>
              <span className="prop-label" style={{ fontWeight: 500, color: 'var(--text)' }}>Gesture (Hand)</span>
              <button
                className={`toggle-btn ${gestureEnabled ? 'active' : ''}`}
                onClick={() => setGestureEnabled(!gestureEnabled)}
              >
                {gestureEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {[
              ['2 fingers', 'Rotate'],
              ['3 fingers', 'Pan'],
              ['Pinch',     'Zoom'],
              ['Open palm', 'Explode'],
              ['Fist',      'Reset all'],
              ['Thumb up',  'Screenshot'],
            ].map(([k, v]) => (
              <div key={k} className="prop-row">
                <span className="prop-label">{k}</span>
                <span className="prop-val" style={{ fontSize: '0.68rem' }}>{v}</span>
              </div>
            ))}
          </Section>
        </aside>

        {/* ── Status Bar ── */}
        <footer className="statusbar">
          {gestureEnabled && (
            <>
              <div className="status-item">
                <div className={`status-dot ${activeGesture !== 'none' ? 'active' : ''}`} />
                <span>{gestureLabel[activeGesture] ?? '—'}</span>
              </div>
              <div className="statusbar-sep" />
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {gestureHistory.slice(0, 3).map((g, i) => (
                  <span key={i} className="gesture-chip" style={{ opacity: 1 - i * 0.25 }}>
                    {gestureLabel[g] ?? g}
                  </span>
                ))}
              </div>
              <div className="statusbar-sep" />
            </>
          )}
          <span className="status-hint">LMB Rot · MMB Pan · Shift+A Add · G Grab · R Rot · S Scale</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>{modelName ?? 'Empty'}</span>
            <div className="statusbar-sep" style={{ height: 10, margin: 0 }} />
            <span>{scannerMode}</span>
            <div className="statusbar-sep" style={{ height: 10, margin: 0 }} />
            <span>{fps} fps</span>
          </span>
        </footer>
      </div>
    </>
  );
};
