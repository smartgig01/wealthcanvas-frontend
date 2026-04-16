import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { StatCard, ProgressBar, ScoreRing, Field, Modal, Spinner, EmptyState } from '../components/ui';
import { finance as finAPI, auth as authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const COUNTRIES = [
  { code:'IN', name:'India',          currency:'INR' },
  { code:'US', name:'United States',  currency:'USD' },
  { code:'GB', name:'United Kingdom', currency:'GBP' },
  { code:'AU', name:'Australia',      currency:'AUD' },
  { code:'CA', name:'Canada',         currency:'CAD' },
  { code:'SG', name:'Singapore',      currency:'SGD' },
  { code:'AE', name:'UAE',            currency:'AED' },
  { code:'DE', name:'Germany',        currency:'EUR' },
  { code:'FR', name:'France',         currency:'EUR' },
  { code:'JP', name:'Japan',          currency:'JPY' },
  { code:'BR', name:'Brazil',         currency:'BRL' },
  { code:'ZA', name:'South Africa',   currency:'ZAR' },
  { code:'NG', name:'Nigeria',        currency:'NGN' },
  { code:'PK', name:'Pakistan',       currency:'PKR' },
];

/* ══════════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════════ */
export function Settings() {
  const { user, updateUser } = useAuth();
  const { toast, setCurrency, format, currency, getSymbol, CURRENCY_MAP } = useApp();

  const [tab,    setTab]    = useState('profile');
  const [saving, setSaving] = useState(false);
  const [form,   setForm]   = useState({
    name:        user?.name        || '',
    country:     user?.country     || 'US',
    income:      user?.profile?.income || '',
    dependents:  user?.profile?.dependents  || 0,
    riskProfile: user?.profile?.riskProfile || 'moderate',
  });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'' });
  const [fbForm, setFbForm] = useState({ message:'', rating:5, type:'general' });

  // Derive currency from selected country in real-time (live preview)
  const previewCurrency = CURRENCY_MAP[form.country] || 'USD';
  const previewSymbol   = getSymbol(previewCurrency);

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setP = k => e => setPwForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const country  = form.country;
      const currency = CURRENCY_MAP[country] || 'USD';
      const res = await finAPI.updateProfile({
        name: form.name, country, currency,
        profile: {
          income:      parseFloat(form.income)  || 0,
          dependents:  parseInt(form.dependents)  || 0,
          riskProfile: form.riskProfile,
        },
      });
      updateUser(res.user);       // triggers AuthContext → AppContext syncUserCurrency
      setCurrency(currency);      // immediate update
      toast('Profile saved successfully', 'success');
    } catch (err) {
      toast(err?.error || 'Failed to save profile', 'error');
    } finally { setSaving(false); }
  };

  const handlePwChange = async () => {
    if (pwForm.newPassword.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    try {
      await authAPI.changePassword(pwForm);
      toast('Password updated successfully', 'success');
      setPwForm({ currentPassword:'', newPassword:'' });
    } catch (err) { toast(err?.error || 'Failed to update password', 'error'); }
  };

  const handleFeedback = async () => {
    if (!fbForm.message) return;
    try {
      await finAPI.submitFeedback(fbForm);
      toast('Feedback submitted. Thank you.', 'success');
      setFbForm({ message:'', rating:5, type:'general' });
    } catch { toast('Failed to submit feedback', 'error'); }
  };

  const TABS = [
    { id:'profile',  label:'Profile & Currency' },
    { id:'password', label:'Password'           },
    { id:'feedback', label:'Feedback'           },
  ];

  return (
    <Layout title="Settings" subtitle="Profile, currency, preferences, and account management">
      <div style={{ display:'flex', gap:4, marginBottom:32 }}>
        {TABS.map(t => (
          <button key={t.id} className={`btn btn-sm ${tab===t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── PROFILE ─────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="card" style={{ maxWidth:540 }}>
          <h4 style={{ marginBottom:24 }}>Profile &amp; Currency</h4>

          <Field label="Full Name">
            <input className="input" value={form.name} onChange={set('name')} placeholder="Your full name" />
          </Field>

          <Field label="Country — sets your currency automatically">
            <select className="select" value={form.country} onChange={set('country')}>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name} — {c.currency}</option>
              ))}
            </select>
          </Field>

          {/* Live currency preview */}
          <div style={{ padding:'12px 16px', background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:'var(--radius)', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--gray-500)', marginBottom:2 }}>
                Currency for {COUNTRIES.find(c => c.code === form.country)?.name}
              </div>
              <div style={{ fontWeight:700, fontSize:'1rem' }}>{previewCurrency}</div>
            </div>
            <div style={{ fontSize:'2rem', fontWeight:700, color:'var(--gray-700)' }}>{previewSymbol}</div>
          </div>

          <Field label="Monthly Income">
            <div className="input-group">
              <span className="input-prefix">{previewSymbol}</span>
              <input className="input" type="number" min="0" value={form.income}
                onChange={set('income')} placeholder="0" />
            </div>
          </Field>

          <div className="grid-2">
            <Field label="Dependents">
              <input className="input" type="number" min="0" value={form.dependents} onChange={set('dependents')} />
            </Field>
            <Field label="Investment Risk Profile">
              <select className="select" value={form.riskProfile} onChange={set('riskProfile')}>
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </Field>
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

          {/* Current active currency display */}
          <div style={{ marginTop:16, fontSize:'0.75rem', color:'var(--gray-500)' }}>
            Active currency: <strong>{currency}</strong> · Symbol: <strong>{getSymbol(currency)}</strong> · Detected via IP: auto-applied on first login
          </div>
        </div>
      )}

      {/* ── PASSWORD ────────────────────────────────────── */}
      {tab === 'password' && (
        <div className="card" style={{ maxWidth:480 }}>
          <h4 style={{ marginBottom:24 }}>Change Password</h4>
          <Field label="Current Password">
            <input className="input" type="password" value={pwForm.currentPassword} onChange={setP('currentPassword')} autoComplete="current-password" />
          </Field>
          <Field label="New Password (minimum 8 characters)">
            <input className="input" type="password" value={pwForm.newPassword} onChange={setP('newPassword')} autoComplete="new-password" />
          </Field>
          {pwForm.newPassword.length > 0 && pwForm.newPassword.length < 8 && (
            <p style={{ fontSize:'0.75rem', color:'var(--danger)', marginBottom:12 }}>Password must be at least 8 characters.</p>
          )}
          <button className="btn btn-primary" onClick={handlePwChange}
            disabled={!pwForm.currentPassword || pwForm.newPassword.length < 8}>
            Update Password
          </button>
        </div>
      )}

      {/* ── FEEDBACK ────────────────────────────────────── */}
      {tab === 'feedback' && (
        <div className="card" style={{ maxWidth:520 }}>
          <h4 style={{ marginBottom:8 }}>Submit Feedback</h4>
          <p style={{ fontSize:'0.875rem', color:'var(--gray-500)', marginBottom:24 }}>
            Help improve WealthCanvas with your thoughts, bug reports, or feature requests.
          </p>
          <Field label="Feedback Type">
            <select className="select" value={fbForm.type} onChange={e => setFbForm(p => ({ ...p, type:e.target.value }))}>
              <option value="general">General</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="praise">Praise</option>
            </select>
          </Field>
          <Field label="Rating">
            <div style={{ display:'flex', gap:8 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} className={`btn btn-sm ${fbForm.rating >= n ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFbForm(p => ({ ...p, rating:n }))}>{n}</button>
              ))}
            </div>
          </Field>
          <Field label="Message">
            <textarea className="textarea" value={fbForm.message}
              onChange={e => setFbForm(p => ({ ...p, message:e.target.value }))}
              placeholder="Share your thoughts, bugs, or suggestions..." />
          </Field>
          <button className="btn btn-primary" onClick={handleFeedback} disabled={!fbForm.message}>
            Submit Feedback
          </button>
        </div>
      )}
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   DISCIPLINE / GAMIFICATION
══════════════════════════════════════════════════════════ */
export function DisciplinePage() {
  const [data,     setData]     = useState(null);
  const [dashData, setDashData] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      finAPI.getGamification(),
      finAPI.getDashboard().catch(() => null),
    ]).then(([g, d]) => { setData(g); setDashData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Discipline Score">
      <div style={{ textAlign:'center', padding:80 }}><Spinner size={32} /></div>
    </Layout>
  );

  const score   = dashData?.disciplineScore;
  const levelInfo = data?.levelInfo;
  const LEVELS  = ['Beginner','Stable','Wealth Builder','Financial Freedom'];

  return (
    <Layout title="Financial Discipline" subtitle="Score, levels, achievements, and streak system">
      <div className="grid-2 mb-6">
        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40 }}>
          <ScoreRing score={score?.score || 0} size={160} />
          <div style={{ marginTop:20, textAlign:'center' }}>
            <div style={{ fontSize:'1.25rem', fontWeight:700, fontFamily:'var(--font-serif)', marginBottom:4 }}>
              {score?.level?.name || 'Beginner'}
            </div>
            <div style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>{score?.level?.description}</div>
            <div style={{ marginTop:8 }}>
              <span className="badge badge-black">{score?.grade || 'D'}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h4 style={{ marginBottom:20 }}>Score Breakdown</h4>
          {Object.entries(score?.breakdown || {}).map(([key, val]) => (
            <div key={key} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8125rem', marginBottom:4 }}>
                <span style={{ textTransform:'capitalize', color:'var(--gray-600)' }}>{key}</span>
                <span style={{ fontWeight:600 }}>{Math.round(val)} pts</span>
              </div>
              <ProgressBar value={val} max={25} />
            </div>
          ))}
        </div>
      </div>

      {/* Level progression */}
      <div className="card mb-6">
        <h4 style={{ marginBottom:16 }}>Level Progression</h4>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {LEVELS.map((l, i) => {
            const reached = levelInfo ? levelInfo.rank > i : false;
            const current = levelInfo ? levelInfo.rank === i + 1 : i === 0;
            return (
              <div key={l} style={{ flex:1, textAlign:'center' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', margin:'0 auto 8px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'0.75rem', fontWeight:700,
                  background: reached ? 'var(--black)' : current ? 'var(--gray-400)' : 'var(--gray-100)',
                  color: (reached || current) ? 'white' : 'var(--gray-500)' }}>
                  {i + 1}
                </div>
                <div style={{ fontSize:'0.7rem', lineHeight:1.3,
                  color: current ? 'var(--gray-900)' : 'var(--gray-400)',
                  fontWeight: current ? 600 : 400 }}>{l}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="card mb-6">
        <h4 style={{ marginBottom:20 }}>Achievements</h4>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
          {(data?.allAchievements || []).map(a => {
            const earned = (data?.achievements || []).some(ea => ea.id === a.id);
            return (
              <div key={a.id} style={{ padding:14, borderRadius:'var(--radius)',
                border:`1px solid ${earned ? 'var(--black)' : 'var(--gray-200)'}`,
                background: earned ? 'var(--black)' : 'var(--white)', opacity: earned ? 1 : 0.5 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', color: earned ? 'var(--white)' : 'var(--gray-700)', marginBottom:4 }}>
                  {a.name}
                </div>
                <div style={{ fontSize:'0.75rem', color: earned ? 'var(--gray-400)' : 'var(--gray-500)' }}>
                  {a.description}
                </div>
                {earned && <div style={{ marginTop:8, fontSize:'0.65rem', color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Earned</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:'2.5rem', fontWeight:700, fontFamily:'var(--font-serif)' }}>{data?.streakDays || 0}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:'1rem' }}>Day Streak</div>
            <div style={{ fontSize:'0.8125rem', color:'var(--gray-500)', marginTop:2 }}>
              Log in and check in daily to maintain your streak and unlock rewards.
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   GOALS
══════════════════════════════════════════════════════════ */
export function Goals() {
  const { format } = useApp();
  const [goals,   setGoals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ name:'', targetAmount:'', currentAmount:'', type:'savings', targetDate:'' });
  const setF = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try { const r = await finAPI.getGoals(); setGoals(r.goals || []); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.targetAmount) return;
    try {
      await finAPI.addGoal({ ...form, targetAmount: parseFloat(form.targetAmount), currentAmount: parseFloat(form.currentAmount) || 0 });
      setShowAdd(false);
      setForm({ name:'', targetAmount:'', currentAmount:'', type:'savings', targetDate:'' });
      load();
    } catch {}
  };

  const updateAmount = async (id, amount) => {
    try { await finAPI.updateGoal(id, { currentAmount: parseFloat(amount) }); load(); }
    catch {}
  };

  const removeGoal = async (id) => {
    try { await finAPI.deleteGoal(id); load(); }
    catch {}
  };

  const GOAL_TYPES = ['savings','emergency','investment','debt_payoff','purchase','education','retirement','other'];

  return (
    <Layout title="Goals" subtitle="Financial milestones and progress tracking">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:24 }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Goal</button>
      </div>

      {loading
        ? <div style={{ textAlign:'center', padding:80 }}><Spinner size={32} /></div>
        : goals.length === 0
          ? <div className="card">
              <EmptyState title="No goals set"
                description="Set financial milestones to track your progress toward financial freedom."
                action={<button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>Add First Goal</button>} />
            </div>
          : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {goals.map(g => {
                const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                return (
                  <div key={g.id} className="card">
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                      <div>
                        <div style={{ fontWeight:600, marginBottom:4 }}>{g.name}</div>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span className="badge badge-default">{(g.type||'').replace(/_/g,' ')}</span>
                          {g.targetDate && <span style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>by {new Date(g.targetDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.25rem', fontWeight:700 }}>{pct}%</div>
                        <div style={{ fontSize:'0.8125rem', color:'var(--gray-500)' }}>{format(g.currentAmount)} of {format(g.targetAmount)}</div>
                      </div>
                    </div>
                    <ProgressBar value={pct} max={100} variant={pct >= 100 ? 'success' : pct >= 60 ? 'warning' : 'danger'} />
                    <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      <input type="number" min="0" className="input" defaultValue={g.currentAmount}
                        style={{ width:160 }}
                        onBlur={e => updateAmount(g.id, e.target.value)}
                        placeholder="Update saved amount" />
                      <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => removeGoal(g.id)}>Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
      }

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Goal"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!form.name || !form.targetAmount}>Add Goal</button>
        </>}>
        <Field label="Goal Name">
          <input className="input" value={form.name} onChange={setF('name')} placeholder="Emergency fund, house deposit..." />
        </Field>
        <Field label="Goal Type">
          <select className="select" value={form.type} onChange={setF('type')}>
            {GOAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
        </Field>
        <div className="grid-2">
          <Field label="Target Amount">
            <input className="input" type="number" min="0" value={form.targetAmount} onChange={setF('targetAmount')} />
          </Field>
          <Field label="Already Saved">
            <input className="input" type="number" min="0" value={form.currentAmount} onChange={setF('currentAmount')} />
          </Field>
        </div>
        <Field label="Target Date (optional)">
          <input className="input" type="date" value={form.targetDate} onChange={setF('targetDate')} />
        </Field>
      </Modal>
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   REFERRAL
══════════════════════════════════════════════════════════ */
export function ReferPage() {
  const { user }  = useAuth();
  const { toast } = useApp();
  const [data, setData] = useState(null);

  useEffect(() => { finAPI.getReferral().then(setData).catch(() => {}); }, []);

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', 'success')).catch(() => toast('Copy failed', 'error'));
  };

  return (
    <Layout title="Refer and Earn" subtitle="Invite friends and earn rewards when they upgrade">
      <div style={{ maxWidth:560 }}>
        <div className="card mb-6" style={{ background:'var(--black)', color:'var(--white)' }}>
          <div style={{ fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--gray-400)', marginBottom:12 }}>
            Your Referral Code
          </div>
          <div style={{ fontSize:'2.5rem', fontFamily:'var(--font-serif)', fontWeight:700, marginBottom:20, letterSpacing:'0.12em' }}>
            {user?.referralCode || '—'}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn" style={{ background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)' }}
              onClick={() => copy(user?.referralCode || '')}>Copy Code</button>
            <button className="btn" style={{ background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)' }}
              onClick={() => copy(`${window.location.origin}/register?ref=${user?.referralCode}`)}>Copy Link</button>
          </div>
        </div>

        <div className="grid-3 mb-6">
          <StatCard label="Total Referred" value={data?.totalReferrals || 0} />
          <StatCard label="Rewarded"       value={data?.rewarded       || 0} />
          <StatCard label="Pending"        value={data?.pendingRewards  || 0} />
        </div>

        <div className="card">
          <h4 style={{ marginBottom:16 }}>How It Works</h4>
          {[
            ['Share your code',   'Give your referral code or link to friends.'],
            ['They register',     'When they sign up with your code, they are linked to your account.'],
            ['They upgrade',      'When your referral upgrades to a paid plan, you earn a reward.'],
            ['You earn',          'Reward is applied to your account automatically within 24 hours.'],
          ].map(([t, d], i) => (
            <div key={i} style={{ display:'flex', gap:16, padding:'12px 0', borderBottom:'1px solid var(--gray-100)' }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--black)', color:'white',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700, flexShrink:0 }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:2 }}>{t}</div>
                <div style={{ fontSize:'0.8125rem', color:'var(--gray-500)' }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
