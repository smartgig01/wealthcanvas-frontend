import { useState } from 'react';

/* ── MODAL ─────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  const maxWidths = { sm:400, md:520, lg:720, xl:920 };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="modal fade-in" style={{ maxWidth: maxWidths[size] || 520 }}>
        {title && (
          <div className="modal-header">
            <h4 style={{ margin:0 }}>{title}</h4>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding:'0 8px', fontSize:18, lineHeight:1 }}>×</button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ── CONFIRM MODAL ─────────────────────────────────────────── */
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </button>
      </>}>
      <p style={{ color:'var(--gray-600)', margin:0, fontSize:'0.875rem', lineHeight:1.6 }}>{message}</p>
    </Modal>
  );
}

/* ── PLAN BADGE — null-safe ────────────────────────────────── */
export function PlanBadge({ plan }) {
  if (!plan) return <span className="badge badge-default">Admin</span>;
  const config = {
    free:     { label:'Free',     cls:'badge-default' },
    lite:     { label:'Lite',     cls:'badge-info'    },
    pro:      { label:'Pro',      cls:'badge-warning' },
    ultimate: { label:'Ultimate', cls:'badge-black'   },
  };
  const c = config[plan] || { label: plan, cls:'badge-default' };
  return <span className={`badge ${c.cls}`}>{c.label}</span>;
}

/* ── LOCK OVERLAY ──────────────────────────────────────────── */
export function LockOverlay({ requiredPlan, onUpgrade }) {
  return (
    <div className="feature-lock-overlay">
      <div style={{ fontSize:'1.25rem', marginBottom:8 }}>—</div>
      <p className="feature-lock-text">
        Requires <strong>{requiredPlan}</strong> plan
      </p>
      <button className="btn btn-primary btn-sm" onClick={onUpgrade}>Unlock Feature</button>
    </div>
  );
}

/* ── STAT CARD ─────────────────────────────────────────────── */
export function StatCard({ label, value, change, changeLabel, inverse }) {
  return (
    <div className={`stat-card ${inverse ? 'stat-inverse' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {(change !== undefined || changeLabel) && (
        <div className={`stat-change ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>
          {change > 0 ? '↑' : change < 0 ? '↓' : ''} {changeLabel || ''}
        </div>
      )}
    </div>
  );
}

/* ── PROGRESS BAR ──────────────────────────────────────────── */
export function ProgressBar({ value, max = 100, variant }) {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const v   = variant || (pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger');
  return (
    <div className="progress-bar">
      <div className={`progress-fill ${v}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── EMPTY STATE ───────────────────────────────────────────── */
export function EmptyState({ title, description, action }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 20px' }}>
      <div style={{ width:48, height:48, border:'1px solid var(--gray-200)', borderRadius:'var(--radius-lg)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'var(--gray-400)', fontSize:'1.25rem' }}>—</div>
      <h4 style={{ marginBottom:6 }}>{title}</h4>
      <p style={{ fontSize:'0.8125rem', color:'var(--gray-500)', marginBottom: action ? 20 : 0, lineHeight:1.6 }}>{description}</p>
      {action}
    </div>
  );
}

/* ── SPINNER ───────────────────────────────────────────────── */
export function Spinner({ size = 20 }) {
  return (
    <>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width:size, height:size, border:`2px solid var(--gray-200)`, borderTopColor:'var(--black)', borderRadius:'50%', animation:'_spin 0.7s linear infinite', display:'inline-block' }} />
    </>
  );
}

/* ── SCORE RING ────────────────────────────────────────────── */
export function ScoreRing({ score, size = 120 }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const r    = (size / 2) - 8;
  const cxy  = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (safeScore / 100) * circ;
  const color = safeScore >= 70 ? 'var(--success)' : safeScore >= 50 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="score-ring" style={{ width:size, height:size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cxy} cy={cxy} r={r} fill="none" stroke="var(--gray-100)" strokeWidth="6" />
        <circle cx={cxy} cy={cxy} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cxy} ${cxy})`}
          style={{ transition:'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="score-ring-label">
        <div className="score-ring-value">{safeScore}</div>
        <div className="score-ring-text">Score</div>
      </div>
    </div>
  );
}

/* ── SELL TRIGGER BANNER ───────────────────────────────────── */
export function SellTriggerBanner({ trigger, onUpgrade }) {
  if (!trigger) return null;
  return (
    <div className="sell-trigger mb-6 fade-in">
      <h3>{trigger.headline}</h3>
      <p style={{ marginBottom:16 }}>{trigger.body}</p>
      <button className="btn" style={{ background:'var(--white)', color:'var(--black)' }} onClick={onUpgrade}>
        {trigger.cta}
      </button>
    </div>
  );
}

/* ── LOSS BANNER ───────────────────────────────────────────── */
export function LossBanner({ monthly, yearly, onUpgrade }) {
  if (!monthly) return null;
  return (
    <div className="loss-banner mb-6 fade-in">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--gray-400)', marginBottom:4 }}>
            Estimated Monthly Loss
          </div>
          <div className="loss-amount">{monthly}</div>
          <div style={{ color:'var(--gray-300)', fontSize:'0.875rem', marginTop:4 }}>
            {yearly} annually — preventable with full analysis
          </div>
        </div>
        <button className="btn btn-lg" style={{ background:'var(--white)', color:'var(--black)', marginTop:8 }}
          onClick={onUpgrade}>
          Stop the Leak
        </button>
      </div>
    </div>
  );
}

/* ── TAB BAR ───────────────────────────────────────────────── */
export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:2, borderBottom:'1px solid var(--gray-200)', marginBottom:24, overflowX:'auto' }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          style={{ padding:'10px 16px', fontSize:'0.8125rem', fontWeight:500, border:'none',
            background:'none', cursor:'pointer', fontFamily:'var(--font-sans)', whiteSpace:'nowrap',
            color: active === tab.id ? 'var(--gray-950)' : 'var(--gray-500)',
            borderBottom: active === tab.id ? '2px solid var(--black)' : '2px solid transparent',
            marginBottom:-1, transition:'all var(--transition)' }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ── FIELD ─────────────────────────────────────────────────── */
export function Field({ label, error, children }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      {children}
      {error && <p style={{ color:'var(--danger)', fontSize:'0.75rem', marginTop:4 }}>{error}</p>}
    </div>
  );
}
