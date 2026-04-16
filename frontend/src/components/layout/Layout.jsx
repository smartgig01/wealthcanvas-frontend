import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import Sidebar from './Sidebar';
import { useState, useEffect } from 'react';
import { finance as finAPI } from '../../utils/api';

export default function Layout({ children, title, subtitle }) {
  const { user } = useAuth();
  const { sidebarOpen, setSidebarOpen, toast } = useApp();
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(0);
  const [streak, setStreak] = useState(user?.streakDays || 0);

  useEffect(() => {
    finAPI.getNotifications().then(res => {
      setNotifCount(res.notifications?.filter(n => !n.read).length || 0);
    }).catch(() => {});
  }, []);

  const handleCheckIn = async () => {
    try {
      const res = await finAPI.checkIn();
      setStreak(res.streak);
      toast(res.message, 'success');
    } catch {
      toast('Already checked in today', 'info');
    }
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main" style={{ marginLeft: sidebarOpen ? 240 : 0 }}>
        {/* TOPBAR */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(v => !v)} style={{ padding: '0 8px', fontSize: 18, display: 'flex' }}>☰</button>
            <div className="topbar-left">
              {title && <h3>{title}</h3>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <div className="topbar-right">
            {user?.role !== 'admin' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={handleCheckIn} title="Daily check-in" style={{ gap: 4 }}>
                  <span style={{ fontSize: 13 }}>◎</span>
                  <span style={{ fontSize: '0.75rem' }}>{streak}d</span>
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
                  <span style={{ fontSize: 13 }}>◇</span>
                  {notifCount > 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, background: 'var(--danger)', borderRadius: '50%' }} />
                  )}
                </button>
                {(user?.plan === 'free' || !user?.plan) && (
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/pricing')}>Upgrade</button>
                )}
              </>
            )}
          </div>
        </div>

        {/* PAGE */}
        <div className="page-content fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
