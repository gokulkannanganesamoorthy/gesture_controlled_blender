import { useStore } from '../../store';
import type { ScannerMode } from '../../store';
import {
  Layers,
  Monitor,
  Upload,
  Hand,
  RotateCcw,
  Box,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useRef, useState } from 'react';

const toDeg = (r: number) => ((r * 180) / Math.PI).toFixed(1) + '°';
const fmt = (n: number) => n.toFixed(3);

// ---- Axis Indicator (SVG) ----
const AxisIndicator = () => {
  const { modelRotation } = useStore();
  const [rx, ry] = modelRotation;

  // Project X/Y/Z unit vectors using simple rotation math
  const project = (vec: [number, number, number]) => {
    // Apply Y rotation then X rotation
    const cosRY = Math.cos(-ry),
      sinRY = Math.sin(-ry);
    const cosRX = Math.cos(-rx),
      sinRX = Math.sin(-rx);
    let [x, y, z] = vec;
    // rotate Y
    const x1 = x * cosRY + z * sinRY;
    const z1 = -x * sinRY + z * cosRY;
    // rotate X
    const y2 = y * cosRX - z1 * sinRX;
    return { sx: x1, sy: -y2 }; // flip y for screen
  };

  const axes = [
    {
      label: 'X',
      vec: [1, 0, 0] as [number, number, number],
      color: '#e06060',
    },
    {
      label: 'Y',
      vec: [0, 1, 0] as [number, number, number],
      color: '#60c060',
    },
    {
      label: 'Z',
      vec: [0, 0, 1] as [number, number, number],
      color: '#6080e0',
    },
  ];

  const cx = 36, cy = 36, len = 26;

  // Compute depth (z toward viewer) for each axis to sort and style
  const getDepth = (vec: [number, number, number]) => {
    const cosRY = Math.cos(-ry), sinRY = Math.sin(-ry);
    const cosRX = Math.cos(-rx), sinRX = Math.sin(-rx);
    let [vx, vy, vz] = vec;
    const vx1 = vx * cosRY + vz * sinRY;
    const vz1 = -vx * sinRY + vz * cosRY;
    const vy2 = vy * cosRX - vz1 * sinRX;
    const vz2 = vy * sinRX + vz1 * cosRX;
    return vz2;
  };

  const sorted = [...axes].sort((a, b) => getDepth(a.vec) - getDepth(b.vec));

  return (
    <svg width={72} height={72} style={{ display: 'block' }}>
      {sorted.map(({ label, vec, color }) => {
        const { sx, sy } = project(vec);
        const ex = cx + sx * len;
        const ey = cy + sy * len;
        const depth = getDepth(vec);
        const behind = depth < -0.05;
        // Always push label out at least 10px from center so Z is visible
        const mag = Math.max(Math.hypot(sx, sy), 0.15);
        const nx = sx / mag, ny = sy / mag;
        const lx = cx + nx * (len + 10);
        const ly = cy + ny * (len + 10);
        return (
          <g key={label} opacity={behind ? 0.3 : 1}>
            <line
              x1={cx} y1={cy} x2={ex} y2={ey}
              stroke={color}
              strokeWidth={behind ? 1 : 1.8}
              strokeDasharray={behind ? '3 2' : undefined}
            />
            <circle cx={ex} cy={ey} r={2} fill={color} />
            <text
              x={lx} y={ly}
              fill={color}
              fontSize={9}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="JetBrains Mono, monospace"
              fontWeight={500}
            >
              {label}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={3} fill="#555" />
    </svg>
  );
};

// ---- Collapsible Section ----
const Section = ({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <button className="section-header" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {label}
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
};

// ---- Slider Row ----
const SliderRow = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) => (
  <div className="prop-row">
    <span className="prop-label">{label}</span>
    <div className="prop-slider-wrap">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="prop-slider"
      />
      <span className="prop-val">{value.toFixed(2)}</span>
    </div>
  </div>
);

export const HUD = () => {
  const {
    scannerMode,
    setScannerMode,
    activeGesture,
    modelRotation,
    modelPosition,
    modelScale,
    modelUrl,
    modelName,
    setModel,
    explodedView,
    setExplodedView,
    materialColor,
    setMaterialColor,
    roughness,
    setRoughness,
    metalness,
    setMetalness,
    envPreset,
    setEnvPreset,
    bgColor,
    setBgColor,
    setModelRotation,
    setModelPosition,
    setModelScale,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setModel(url, file.name);
  };

  const handleReset = () => {
    setModelRotation([0, 0, 0]);
    setModelPosition([0, 0, 0]);
    setModelScale(1);
    setExplodedView(false);
  };

  const gestureLabel: Record<string, string> = {
    none: '—',
    swipe: '2-finger rotate',
    two_fingers: '3-finger pan',
    pinch: 'pinch zoom',
    palm: 'explode',
    fist: 'reset',
  };

  const modes: { key: ScannerMode; icon: React.ReactNode; label: string }[] = [
    { key: 'standard', icon: <Monitor size={13} />, label: 'Solid' },
    { key: 'wireframe', icon: <Layers size={13} />, label: 'Wireframe' },
  ];

  return (
    <div className="layout">
      {/* ── Topbar ── */}
      <header className="topbar">
        <span className="topbar-logo">VISIONARY 3D</span>
        <div className="topbar-sep" />
        <div className="topbar-modes">
          {modes.map((m) => (
            <button
              key={m.key}
              className={`topbar-mode-btn ${scannerMode === m.key ? 'active' : ''}`}
              onClick={() => setScannerMode(m.key)}
              title={m.label}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        <div className="topbar-right">
          <button
            className="topbar-btn accent"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={13} /> Import GLB
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            className="topbar-btn"
            onClick={handleReset}
            title="Reset Transform"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </header>

      {/* ── Canvas Slot (filled by App.tsx) ── */}
      <div className="canvas-area">
        {/* Axis indicator overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            zIndex: 10,
            opacity: 0.85,
          }}
        >
          <AxisIndicator />
        </div>

        {/* No model notice */}
        {!modelUrl && (
          <div className="no-model-notice">
            <Box size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p>No model loaded</p>
            <p className="sub">Showing placeholder — import a GLB to begin</p>
            <button
              className="topbar-btn accent"
              style={{ marginTop: 12 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={13} /> Import GLB / GLTF
            </button>
          </div>
        )}
      </div>

      {/* ── Right Properties Panel ── */}
      <aside className="inspector">
        {/* Model info */}
        <Section label="Object">
          <div className="prop-row">
            <span className="prop-label">File</span>
            <span
              className="prop-val mono"
              style={{
                fontSize: '0.6rem',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {modelName ?? 'placeholder.mesh'}
            </span>
          </div>
        </Section>

        {/* Transform */}
        <Section label="Transform">
          <div className="prop-row">
            <span className="prop-label x">Rotation X</span>
            <span className="prop-val mono">{toDeg(modelRotation[0])}</span>
          </div>
          <div className="prop-row">
            <span className="prop-label y">Rotation Y</span>
            <span className="prop-val mono">{toDeg(modelRotation[1])}</span>
          </div>
          <div className="prop-row">
            <span className="prop-label z">Rotation Z</span>
            <span className="prop-val mono">{toDeg(modelRotation[2])}</span>
          </div>
          <div className="prop-sep" />
          <div className="prop-row">
            <span className="prop-label x">Position X</span>
            <span className="prop-val mono">{fmt(modelPosition[0])}</span>
          </div>
          <div className="prop-row">
            <span className="prop-label y">Position Y</span>
            <span className="prop-val mono">{fmt(modelPosition[1])}</span>
          </div>
          <div className="prop-row">
            <span className="prop-label z">Position Z</span>
            <span className="prop-val mono">{fmt(modelPosition[2])}</span>
          </div>
          <div className="prop-sep" />
          <div className="prop-row">
            <span className="prop-label">Scale</span>
            <span className="prop-val mono">{fmt(modelScale)}</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Exploded</span>
            <button
              className={`toggle-btn ${explodedView ? 'active' : ''}`}
              onClick={() => setExplodedView(!explodedView)}
            >
              {explodedView ? 'ON' : 'OFF'}
            </button>
          </div>
        </Section>

        {/* Material */}
        <Section label="Material">
          <div className="prop-row">
            <span className="prop-label">Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="color"
                value={materialColor}
                onChange={(e) => setMaterialColor(e.target.value)}
                className="color-swatch"
              />
              <span className="prop-val mono" style={{ fontSize: '0.65rem' }}>
                {materialColor}
              </span>
            </div>
          </div>
          <SliderRow
            label="Roughness"
            value={roughness}
            min={0}
            max={1}
            step={0.01}
            onChange={setRoughness}
          />
          <SliderRow
            label="Metalness"
            value={metalness}
            min={0}
            max={1}
            step={0.01}
            onChange={setMetalness}
          />
        </Section>

        {/* Environment */}
        <Section label="Environment" defaultOpen={false}>
          <div className="prop-row">
            <span className="prop-label">HDRI</span>
            <select
              className="prop-select"
              value={envPreset}
              onChange={(e) => setEnvPreset(e.target.value as any)}
            >
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
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="color-swatch"
              />
              <span className="prop-val mono" style={{ fontSize: '0.65rem' }}>
                {bgColor}
              </span>
            </div>
          </div>
        </Section>

        {/* Gestures */}
        <Section label="Gesture Controls" defaultOpen={false}>
          {[
            ['2 fingers', 'Rotate model'],
            ['3 fingers', 'Pan / translate'],
            ['Pinch', 'Zoom in / out'],
            ['Open palm', 'Exploded view'],
            ['Fist', 'Reset all transforms'],
          ].map(([k, v]) => (
            <div className="prop-row" key={k}>
              <span className="prop-label">{k}</span>
              <span className="prop-val">{v}</span>
            </div>
          ))}
        </Section>
      </aside>

      {/* ── Status Bar ── */}
      <footer className="statusbar">
        <div className="status-item">
          <div
            className={`status-dot ${activeGesture !== 'none' ? 'active' : ''}`}
          />
          <span>GESTURE: {gestureLabel[activeGesture] ?? '—'}</span>
        </div>
        <div className="statusbar-sep" />
        <div className="status-item">
          <Hand size={10} />
          <span>HAND TRACKING</span>
        </div>
        <span style={{ marginLeft: 'auto' }}>
          {modelName ? modelName : 'No file'} · {scannerMode.toUpperCase()}
        </span>
      </footer>
    </div>
  );
};
