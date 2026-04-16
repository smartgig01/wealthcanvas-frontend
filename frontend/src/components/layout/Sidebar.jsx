import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { PlanBadge } from '../ui';

const NAV = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: '◈' },
    { path: '/loss-report', label: 'Loss Report', icon: '↓', minPlan: 'lite' },
    { path: '/projections', label: 'Projections', icon: '↗', minPlan: 'pro' },
  ]},
  { section: 'Tracking', items: [
    { path: '/expenses', label: 'Expenses', icon: '◇' },
    { path: '/subscriptions', label: 'Subscriptions', icon: '◎' },
    { path: '/net-worth', label: 'Net Worth', icon: '◆', minPlan: 'lite' },
  ]},
  { section: 'Planning', items: [
    { path: '/debt', label: 'Debt Planner', icon: '◻', minPlan: 'pro' },
    { path: '/investments', label: 'Investments', icon: '▲', minPlan: 'ultimate' },
    { path: '/goals', label: 'Goals', icon: '◉' },
    { path: '/tax', label: 'Tax Estimate', icon: '≡', minPlan: 'pro' },
  ]},
  { section: 'Intelligence', items: [
    { path: '/scenarios', label: 'Scenarios', icon: '⊞', minPlan: 'ultimate' },
    { path: '/risk', label: 'Risk Analysis', icon: '⊘', minPlan: 'pro' },
    { path: '/discipline', label: 'Discipline Score', icon: '◎', minPlan: 'lite' },
  ]},
  { section: 'Account', items: [
    { path: '/pricing', label: 'Upgrade Plan', icon: '◈' },
    { path: '/settings', label: 'Settings', icon: '⊙' },
    { path: '/refer', label: 'Refer & Earn', icon: '⊕' },
  ]},
];

const ADMIN_NAV = [
  { section: 'Admin', items: [
    { path: '/admin', label: 'Overview', icon: '◈' },
    { path: '/admin/users', label: 'Users', icon: '◇' },
    { path: '/admin/analytics', label: 'Analytics', icon: '▲' },
    { path: '/admin/settings', label: 'Settings', icon: '⊙' },
    { path: '/admin/feedback', label: 'Feedback', icon: '◻' },
    { path: '/admin/logs', label: 'System Logs', icon: '≡' },
  ]},
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, canAccess } = useAuth();
  const { sidebarOpen } = useApp();

  const nav = user?.role === 'admin' ? ADMIN_NAV : NAV;

  return (
    <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
      <div className="sidebar-logo">
        <div className="brand">WealthCanvas</div>
        <div className="tagline">Financial Intelligence</div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(section => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-title">{section.section}</div>
            {section.items.map(item => {
              const locked = item.minPlan && !canAccess(item.minPlan);
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  className={`nav-item ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
                  onClick={() => !locked && navigate(item.path)}
                  title={locked ? `Requires ${item.minPlan} plan` : item.label}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', width: 18, textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                  {locked && <span className="lock-badge">Lock</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" onClick={() => navigate('/settings')}>
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div className="user-plan">
              {user?.role === 'admin' ? (
                <span style={{ color: 'var(--gray-300)', fontSize: '0.65rem' }}>Administrator</span>
              ) : (
                <PlanBadge plan={user?.trialActive ? user?.trialPlan : user?.plan} />
              )}
            </div>
          </div>
        </div>
        <button className="nav-item" style={{ marginTop: 4 }} onClick={logout}>
          <span style={{ fontFamily: 'monospace', width: 18, textAlign: 'center' }}>→</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
