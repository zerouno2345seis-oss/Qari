import React, { useId } from 'react';

// Smooth path through points using midpoint cubic curves.
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}

/** Multi-series live area chart. series: [{ data:number[], color, label }] */
export function AreaChart({ series, max, height = 150, points = 60, format = v => v.toFixed(0), grid = 4 }) {
  const uid = useId().replace(/:/g, '');
  const W = 600, H = height, pad = 2;
  const peak = max ?? Math.max(1, ...series.flatMap(s => s.data)) * 1.15;
  const toPts = data => {
    const slice = data.slice(-points);
    const span = Math.max(1, slice.length - 1);
    return slice.map((v, i) => [(i / span) * W, H - pad - (Math.min(v, peak) / peak) * (H - pad * 2)]);
  };
  return (
    <div className="chart" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`${uid}g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {Array.from({ length: grid }, (_, i) => (
          <line key={i} x1="0" x2={W} y1={(H / grid) * i + 0.5} y2={(H / grid) * i + 0.5} className="grid" />
        ))}
        {series.map((s, i) => {
          const p = toPts(s.data);
          if (p.length < 2) return null;
          const line = smooth(p);
          return (
            <g key={i}>
              <path d={`${line} L${p[p.length - 1][0]},${H} L${p[0][0]},${H} Z`} fill={`url(#${uid}g${i})`} />
              <path d={line} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <circle cx={p[p.length - 1][0]} cy={p[p.length - 1][1]} r="3.5" fill={s.color} />
            </g>
          );
        })}
      </svg>
      <div className="chart-axis"><span>{format(peak)}</span><span>{format(0)}</span></div>
    </div>
  );
}

/** Circular gauge. */
export function Gauge({ value, max = 100, color, label, sub, size = 128 }) {
  const r = 52, c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, (value ?? 0) / max));
  return (
    <div className="gauge" style={{ width: size }}>
      <svg viewBox="0 0 128 128" width={size} height={size}>
        <circle cx="64" cy="64" r={r} className="gauge-bg" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 64 64)" style={{ transition: 'stroke-dasharray .6s ease, stroke .6s' }} />
        <text x="64" y="68" textAnchor="middle" className="gauge-val">{label}</text>
      </svg>
      {sub && <div className="gauge-sub">{sub}</div>}
    </div>
  );
}

/** Horizontal progress bar. */
export function Bar({ value, max = 100, color = 'var(--accent)', height = 8 }) {
  return (
    <div className="bar" style={{ height }}>
      <div style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  );
}

/** Stacked bar with legend. parts: [{ label, value, color }] */
export function StackBar({ parts, total, format }) {
  return (
    <div>
      <div className="bar stack" style={{ height: 14 }}>
        {parts.map((p, i) => <div key={i} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={p.label} />)}
      </div>
      <div className="legend">
        {parts.map((p, i) => (
          <span key={i}><i style={{ background: p.color }} />{p.label}: <b>{format(p.value)}</b></span>
        ))}
      </div>
    </div>
  );
}

export function Card({ title, right, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && <header><h3>{title}</h3><div>{right}</div></header>}
      {children}
    </section>
  );
}
