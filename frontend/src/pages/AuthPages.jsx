import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { auth as authAPI } from '../utils/api';
import { Field } from '../components/ui';

const COUNTRIES = [
  { code: 'IN', name: 'India' }, { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' }, { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'UAE' }, { code: 'DE', name: 'Germany' },
];

const AuthLayout = ({ children, title, subtitle }) => (
  <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex' }}>
    {/* LEFT PANEL */}
    <div style={{ width: '45%', background: 'var(--black)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.03) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--white)', letterSpacing: '-0.02em' }}>WealthCanvas</div>
        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray-500)', marginTop: 4 }}>Financial Intelligence System</div>
      </div>
      <div>
        <p style={{ color: 'var(--gray-300)', fontSize: '1.25rem', fontFamily: 'var(--font-serif)', lineHeight: 1.5, marginBottom: 32 }}>
          The complete financial intelligence system for wealth building, debt elimination, and financial freedom.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['Loss detection across all categories', 'Multi-country tax estimation', 'Debt elimination strategies', 'Wealth projection to financial freedom'].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-400)', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--gray-500)' }}>—</span> {f}
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
        Secure. Private. Intelligence-driven.
      </div>
    </div>

    {/* RIGHT PANEL */}
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <h2 style={{ marginBottom: 6, fontFamily: 'var(--font-serif)' }}>{title}</h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: 32, fontSize: '0.875rem' }}>{subtitle}</p>
        {children}
      </div>
    </div>
  </div>
);

// ── LOGIN PAGE ────────────────────────────────────────────────
export function LoginPage() {
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { toast } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authAPI.login({ email, password });
      login(res);
      navigate(res.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    if (!email) { setError('Enter your email first'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.sendOTP(email);
      setOtpSent(true);
      toast('OTP sent to your email', 'success');
    } catch (err) {
      setError(err.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authAPI.verifyOTP(email, otp);
      login(res);
      navigate(res.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.error || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Access your financial intelligence dashboard">
      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--gray-100)', borderRadius: 'var(--radius)', padding: 3, marginBottom: 24 }}>
        {[['password', 'Password'], ['otp', 'Email OTP']].map(([m, l]) => (
          <button key={m} onClick={() => { setMode(m); setError(''); }} className="btn" style={{ flex: 1, height: 32, fontSize: '0.75rem', background: mode === m ? 'var(--white)' : 'transparent', color: mode === m ? 'var(--gray-900)' : 'var(--gray-500)', boxShadow: mode === m ? 'var(--shadow-sm)' : 'none' }}>{l}</button>
        ))}
      </div>

      {error && <div className="alert alert-danger mb-4" style={{ fontSize: '0.8125rem' }}>{error}</div>}

      {mode === 'password' ? (
        <form onSubmit={handleLogin}>
          <Field label="Email Address">
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </Field>
          <Field label="Password">
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </Field>
          <button className="btn btn-primary btn-full" style={{ height: 44, marginTop: 4 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={otpSent ? handleVerifyOTP : (e) => { e.preventDefault(); handleSendOTP(); }}>
          <Field label="Email Address">
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required disabled={otpSent} />
          </Field>
          {otpSent && (
            <Field label="Enter OTP">
              <input className="input" type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} required />
            </Field>
          )}
          <button className="btn btn-primary btn-full" style={{ height: 44, marginTop: 4 }} disabled={loading}>
            {loading ? '...' : otpSent ? 'Verify OTP' : 'Send OTP'}
          </button>
          {otpSent && (
            <button type="button" className="btn btn-ghost btn-full btn-sm mt-2" onClick={() => { setOtpSent(false); setOtp(''); }}>Resend OTP</button>
          )}
        </form>
      )}

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
        No account? <Link to="/register" style={{ color: 'var(--black)', fontWeight: 600 }}>Create one</Link>
      </div>
    </AuthLayout>
  );
}

// ── REGISTER PAGE ─────────────────────────────────────────────
export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', country: 'US', referralCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handle = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await authAPI.register(form);
      login(res);
      navigate('/dashboard');
    } catch (err) {
      setError(err.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Create account" subtitle="Start your financial intelligence journey">
      {error && <div className="alert alert-danger mb-4" style={{ fontSize: '0.8125rem' }}>{error}</div>}
      <form onSubmit={handle}>
        <Field label="Full Name">
          <input className="input" type="text" value={form.name} onChange={set('name')} placeholder="Your name" required />
        </Field>
        <Field label="Email Address">
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
        </Field>
        <Field label="Password">
          <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" required />
        </Field>
        <Field label="Country">
          <select className="select" value={form.country} onChange={set('country')}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Referral Code (optional)">
          <input className="input" type="text" value={form.referralCode} onChange={set('referralCode')} placeholder="Enter referral code" style={{ textTransform: 'uppercase' }} />
        </Field>
        <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, fontSize: '0.75rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>
          Free plan includes expense tracking, subscription management, and basic loss detection. Upgrade anytime for full financial intelligence.
        </div>
        <button className="btn btn-primary btn-full" style={{ height: 44 }} disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--black)', fontWeight: 600 }}>Sign in</Link>
      </div>
    </AuthLayout>
  );
}
