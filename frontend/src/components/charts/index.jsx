// Pure SVG charts — zero dependencies

// ── BAR CHART ────────────────────────────────────────────────
export function BarChart({ data = [], height = 160, color = '#000' }) {
  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>No data available</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', fontWeight: 500 }}>{d.label2 || ''}</div>
            <div style={{ width: '100%', height: `${pct}%`, background: d.color || color, borderRadius: '3px 3px 0 0', minHeight: 2, transition: 'height 0.5s ease' }} title={`${d.name}: ${d.value}`} />
            <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d.name}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── GROUPED BAR CHART ────────────────────────────────────────
export function GroupedBarChart({ data = [], height = 160, colors = ['#000', '#71717a'] }) {
  if (!data.length) return null;
  const max = Math.max(...data.flatMap(d => [d.a || 0, d.b || 0]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%' }}>
            <div style={{ flex: 1, height: `${(d.a / max) * (height - 20)}px`, background: colors[0], borderRadius: '2px 2px 0 0', minHeight: 1 }} />
            {d.b !== undefined && <div style={{ flex: 1, height: `${(d.b / max) * (height - 20)}px`, background: colors[1], borderRadius: '2px 2px 0 0', minHeight: 1 }} />}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--gray-500)', textAlign: 'center' }}>{d.name}</div>
        </div>
      ))}
    </div>
  );
}

// ── LINE CHART ───────────────────────────────────────────────
export function LineChart({ data = [], height = 160, color = '#000', fillOpacity = 0.06, showDots = true, showGrid = true }) {
  if (data.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>Insufficient data</div>;
  const W = 600, H = height - 24;
  const vals = data.map(d => d.value);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const px = i => (i / (data.length - 1)) * W;
  const py = v => H - ((v - minV) / range) * H;
  const points = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');
  const areaPath = `M${px(0)},${H} L${data.map((d, i) => `${px(i)},${py(d.value)}`).join(' L')} L${px(data.length - 1)},${H} Z`;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="line-chart-svg" style={{ height }}>
        {showGrid && [0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1="0" y1={H * (1 - t)} x2={W} y2={H * (1 - t)} stroke="var(--gray-100)" strokeWidth="1" />
        ))}
        <path d={areaPath} fill={color} fillOpacity={fillOpacity} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {showDots && data.map((d, i) => (
          <circle key={i} cx={px(i)} cy={py(d.value)} r="3.5" fill="var(--white)" stroke={color} strokeWidth="2">
            <title>{d.name}: {d.value?.toLocaleString()}</title>
          </circle>
        ))}
        {data.map((d, i) => (
          <text key={i} x={px(i)} y={H + 18} textAnchor="middle" fontSize="9" fill="var(--gray-400)">{d.name}</text>
        ))}
      </svg>
    </div>
  );
}

// ── DONUT CHART ──────────────────────────────────────────────
export function DonutChart({ data = [], size = 160 }) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const cx = size / 2, cy = size / 2, r = size * 0.38, ir = size * 0.24;
  let angle = -Math.PI / 2;
  const COLORS = ['#000', '#27272a', '#52525b', '#71717a', '#a1a1aa', '#d1d1d6'];

  const slices = data.map((d, i) => {
    const a = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    angle += a;
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
    const ix1 = cx + ir * Math.cos(angle - a), iy1 = cy + ir * Math.sin(angle - a);
    const ix2 = cx + ir * Math.cos(angle), iy2 = cy + ir * Math.sin(angle);
    const large = a > Math.PI ? 1 : 0;
    return { ...d, path: `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large},0 ${ix1},${iy1} Z`, color: d.color || COLORS[i % COLORS.length] };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color}><title>{s.name}: {s.value?.toLocaleString()}</title></path>)}
      </svg>
      <div style={{ flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.75rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
            <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HORIZONTAL BAR (breakdown) ───────────────────────────────
export function HBar({ items = [] }) {
  if (!items.length) return null;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="chart-bar">
      {items.map((item, i) => (
        <div key={i} className="chart-bar-row">
          <div className="chart-bar-label" title={item.name}>{item.name}</div>
          <div className="chart-bar-track">
            <div className="chart-bar-fill" style={{ width: `${(item.value / max) * 100}%`, background: item.color || 'var(--black)' }} />
          </div>
          <div className="chart-bar-value">{item.label || item.value?.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
