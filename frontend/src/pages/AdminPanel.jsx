import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { StatCard, TabBar, Spinner, ConfirmModal, Field } from '../components/ui';
import { BarChart } from '../components/charts';
import { admin as adminAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

/* ── small helpers ─────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <div onClick={onChange}
      style={{ width:44, height:24, borderRadius:12, background: value ? 'var(--black)' : 'var(--gray-200)',
        cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:'50%', background:'white', position:'absolute',
        top:3, left: value ? 23 : 3, transition:'left 0.2s', boxShadow:'var(--shadow-sm)' }} />
    </div>
  );
}

function PlanTag({ plan }) {
  if (!plan) return <span className="badge badge-default">Admin</span>;
  const m = { free:'badge-default', lite:'badge-info', pro:'badge-warning', ultimate:'badge-black' };
  return <span className={`badge ${m[plan] || 'badge-default'}`}>{plan}</span>;
}

/* ── SUBSCRIPTION PRICING EDITOR ───────────────────────────── */
function PricingEditor({ toast }) {
  const PLAN_NAMES   = ['free', 'lite', 'pro', 'ultimate'];
  const PLAN_LABELS  = { free:'Free', lite:'Lite', pro:'Pro', ultimate:'Ultimate' };

  const [plans,   setPlans]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getSubscriptionPlans()
      .then(res => setPlans(res.plans || {}))
      .catch(() => toast('Failed to load pricing', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const updatePrice = (region, planId, value) => {
    setPlans(prev => ({
      ...prev,
      [region]: { ...prev[region], [planId]: { ...prev[region][planId], price: parseFloat(value) || 0 } },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSubscriptionPlans({ plans });
      toast('Subscription pricing updated successfully', 'success');
    } catch { toast('Failed to save pricing', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ textAlign:'center', padding:40 }}><Spinner /></div>;

  const regions = [
    { key:'global', label:'Global Pricing (USD)', symbol:'$', currency:'USD' },
    { key:'IN',     label:'India Pricing (INR)',   symbol:'₹', currency:'INR' },
  ];

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h4 style={{ marginBottom:4 }}>Subscription Pricing</h4>
        <p style={{ fontSize:'0.8125rem', color:'var(--gray-500)', lineHeight:1.6 }}>
          Update the prices for each plan and region. Changes take effect immediately for new signups.
          Existing subscribers are not affected until their next billing cycle.
        </p>
      </div>

      {regions.map(({ key, label, symbol, currency }) => (
        <div key={key} className="card" style={{ marginBottom:16 }}>
          <h4 style={{ marginBottom:16, fontSize:'0.9375rem' }}>{label}</h4>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {PLAN_NAMES.map(planId => {
              const planData = plans?.[key]?.[planId] || {};
              const isFree   = planId === 'free';
              return (
                <div key={planId} style={{ padding:'16px', background:'var(--gray-50)', borderRadius:'var(--radius)', border:'1px solid var(--gray-200)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <span style={{ fontWeight:600, fontSize:'0.875rem' }}>{PLAN_LABELS[planId]}</span>
                    {planId === 'pro'      && <span className="badge badge-black" style={{ fontSize:'0.55rem' }}>Popular</span>}
                    {planId === 'ultimate' && <span className="badge badge-info"  style={{ fontSize:'0.55rem' }}>Best</span>}
                  </div>
                  <Field label={`Price (${currency})`}>
                    <div className="input-group">
                      <span className="input-prefix">{symbol}</span>
                      <input className="input" type="number" min="0" step="0.01"
                        value={planData.price ?? 0}
                        onChange={e => !isFree && updatePrice(key, planId, e.target.value)}
                        disabled={isFree}
                        style={{ opacity: isFree ? 0.5 : 1 }} />
                    </div>
                  </Field>
                  {isFree && <p style={{ fontSize:'0.7rem', color:'var(--gray-400)', marginTop:-8 }}>Free plan is always 0</p>}
                  <div style={{ fontSize:'0.75rem', color:'var(--gray-500)', marginTop:4 }}>
                    Current: <strong>{symbol}{planData.price ?? 0}</strong>/mo
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ padding:'16px', background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:'var(--radius)', marginBottom:20, fontSize:'0.8125rem', color:'var(--gray-600)', lineHeight:1.6 }}>
        <strong>Note:</strong> India pricing is shown to users whose IP or profile country is set to India (IN).
        All other countries see Global pricing in USD.
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Pricing'}
      </button>
    </div>
  );
}

/* ── MAIN ADMIN PANEL ──────────────────────────────────────── */
export default function AdminPanel() {
  const { user }    = useAuth();
  const { toast }   = useApp();
  const navigate    = useNavigate();

  const [tab,       setTab]       = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [users,     setUsers]     = useState([]);
  const [flags,     setFlags]     = useState({});
  const [rates,     setRates]     = useState({});
  const [feedback,  setFeedback]  = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [payConfig, setPayConfig] = useState({ paypal:{}, payhip:{} });
  const [aiConfig,  setAiConfig]  = useState({});
  const [contact,   setContact]   = useState({ contactEmail:'', contactPhone:'', contactWhatsapp:'', supportMessage:'' });
  const [loading,   setLoading]   = useState(true);
  const [deleteId,  setDeleteId]  = useState(null);
  const [pwForm,    setPwForm]    = useState({ currentPassword:'', newPassword:'' });
  const [notifForm, setNotifForm] = useState({ message:'', type:'info', userIds:'all' });
  const [saving,    setSaving]    = useState({});

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/dashboard');
  }, [user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, u, f] = await Promise.all([adminAPI.getAnalytics(), adminAPI.getUsers(), adminAPI.getFlags()]);
      setAnalytics(a); setUsers(u.users || []); setFlags(f.flags || {});
      adminAPI.getFeedback().then(r => setFeedback(r.feedback || [])).catch(() => {});
      adminAPI.getLogs().then(r => setLogs(r.logs || [])).catch(() => {});
      adminAPI.getPaymentConfig().then(r => setPayConfig(r.config || { paypal:{}, payhip:{} })).catch(() => {});
      adminAPI.getAIConfig().then(r => setAiConfig(r || {})).catch(() => {});
      adminAPI.getContactInfo().then(r => setContact(r || {})).catch(() => {});
    } catch { toast('Failed to load admin data', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'rates') adminAPI.getExchangeRates().then(r => setRates(r.rates || {})).catch(() => {});
  }, [tab]);

  if (!user || user.role !== 'admin') return null;

  /* helpers */
  const setSav = (key, val) => setSaving(p => ({ ...p, [key]: val }));

  const toggleFlag = async (key) => {
    const nv = !flags[key];
    setFlags(p => ({ ...p, [key]: nv }));
    try { await adminAPI.updateFlags({ [key]: nv }); toast(`${key} ${nv ? 'enabled' : 'disabled'}`, 'success'); }
    catch { toast('Failed to update flag', 'error'); }
  };

  const updateUserPlan = async (id, plan) => {
    try { await adminAPI.updateUser(id, { plan }); setUsers(us => us.map(u => u.id === id ? { ...u, plan } : u)); toast('Plan updated', 'success'); }
    catch { toast('Failed', 'error'); }
  };

  const updateUserStatus = async (id, status) => {
    try { await adminAPI.updateUser(id, { status }); setUsers(us => us.map(u => u.id === id ? { ...u, status } : u)); toast(`User ${status}`, 'success'); }
    catch { toast('Failed', 'error'); }
  };

  const handleDeleteUser = async () => {
    try { await adminAPI.deleteUser(deleteId); setUsers(us => us.filter(u => u.id !== deleteId)); toast('User deleted', 'success'); }
    catch { toast('Failed to delete user', 'error'); }
    setDeleteId(null);
  };

  const saveRates = async () => {
    setSav('rates', true);
    try { await adminAPI.updateExchangeRates({ rates }); toast('Exchange rates updated', 'success'); }
    catch { toast('Failed', 'error'); }
    finally { setSav('rates', false); }
  };

  const saveContact = async () => {
    setSav('contact', true);
    try { await adminAPI.updateContactInfo(contact); toast('Contact information saved', 'success'); }
    catch { toast('Failed to save', 'error'); }
    finally { setSav('contact', false); }
  };

  const savePayPal = async () => {
    try { await adminAPI.updatePaymentConfig({ paypal: payConfig.paypal }); toast('PayPal config saved', 'success'); }
    catch { toast('Failed', 'error'); }
  };

  const savePayhip = async () => {
    try { await adminAPI.updatePaymentConfig({ payhip: payConfig.payhip }); toast('Payhip config saved', 'success'); }
    catch { toast('Failed', 'error'); }
  };

  const handlePwChange = async () => {
    if (!pwForm.currentPassword || pwForm.newPassword.length < 8) { toast('New password must be 8+ characters', 'error'); return; }
    try { await adminAPI.changePassword(pwForm); toast('Password updated', 'success'); setPwForm({ currentPassword:'', newPassword:'' }); }
    catch (err) { toast(err.error || 'Failed', 'error'); }
  };

  const handleNotifSend = async () => {
    if (!notifForm.message) return;
    try { await adminAPI.sendNotification(notifForm); toast('Notification sent', 'success'); setNotifForm({ message:'', type:'info', userIds:'all' }); }
    catch { toast('Failed', 'error'); }
  };

  const regularUsers = users.filter(u => u.role !== 'admin');

  const TABS = [
    { id:'overview',  label:'Overview'         },
    { id:'users',     label:'Users'            },
    { id:'pricing',   label:'Subscription Plans'},
    { id:'contact',   label:'Contact Info'     },
    { id:'payment',   label:'Payment Config'   },
    { id:'flags',     label:'Feature Flags'    },
    { id:'rates',     label:'Exchange Rates'   },
    { id:'ai',        label:'AI Engine'        },
    { id:'feedback',  label:'Feedback'         },
    { id:'logs',      label:'System Logs'      },
    { id:'security',  label:'Security'         },
    { id:'notify',    label:'Notifications'    },
  ];

  return (
    <Layout title="Administration" subtitle="Full system control and configuration">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {loading && <div style={{ textAlign:'center', padding:60 }}><Spinner size={32} /></div>}

      {/* ── OVERVIEW ──────────────────────────────────────── */}
      {!loading && tab === 'overview' && analytics && (
        <div>
          <div className="grid-4 mb-6">
            <StatCard label="Total Users"   value={analytics.totalUsers  || 0} inverse />
            <StatCard label="MRR (USD)"     value={`$${analytics.mrrUSD || 0}`} />
            <StatCard label="ARR (USD)"     value={`$${analytics.arrUSD || 0}`} />
            <StatCard label="New (30 days)" value={analytics.newUsersLast30Days || 0} />
          </div>
          <div className="grid-2 mb-6">
            <div className="card">
              <h4 style={{ marginBottom:20 }}>Plan Distribution</h4>
              <BarChart height={160} data={Object.entries(analytics.planCounts || {}).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }))} />
            </div>
            <div className="card">
              <h4 style={{ marginBottom:16 }}>System Stats</h4>
              {[
                ['Active Users (30d)',    analytics.activeUsersLast30Days || 0],
                ['Total Expense Records', analytics.totalExpenses || 0],
                ['Total Feedback',        analytics.totalFeedback || 0],
                ['System Logs',          logs.length],
              ].map(([l, v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'0.875rem' }}>
                  <span style={{ color:'var(--gray-600)' }}>{l}</span>
                  <span style={{ fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h4 style={{ marginBottom:16 }}>Recent Plan Changes</h4>
            {!(analytics.upgradeEvents?.length)
              ? <p style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>No plan changes yet.</p>
              : analytics.upgradeEvents.slice(0, 10).map((e, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'0.8125rem' }}>
                  <span style={{ color:'var(--gray-500)' }}>{e.user_id?.slice(0,8)}...</span>
                  <span><PlanTag plan={e.from_plan} /> → <PlanTag plan={e.to_plan} /></span>
                  <span style={{ color:'var(--gray-400)' }}>{new Date(e.created_at).toLocaleDateString()}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── USERS ─────────────────────────────────────────── */}
      {!loading && tab === 'users' && (
        <div className="card">
          <h4 style={{ marginBottom:20 }}>User Management ({regularUsers.length})</h4>
          {regularUsers.length === 0
            ? <p style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>No users registered yet.</p>
            : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Plan</th><th>Country</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {regularUsers.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight:500 }}>{u.name}</td>
                        <td style={{ color:'var(--gray-500)', fontSize:'0.8125rem' }}>{u.email}</td>
                        <td>
                          <select value={u.plan || 'free'} onChange={e => updateUserPlan(u.id, e.target.value)}
                            style={{ border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'3px 8px', fontSize:'0.75rem', fontFamily:'var(--font-sans)', background:'white', cursor:'pointer' }}>
                            {['free','lite','pro','ultimate'].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </td>
                        <td style={{ color:'var(--gray-500)' }}>{u.country || '—'}</td>
                        <td><span className={`badge badge-${u.status === 'active' ? 'success' : 'danger'}`}>{u.status}</span></td>
                        <td style={{ color:'var(--gray-500)', fontSize:'0.75rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => updateUserStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}>
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => setDeleteId(u.id)}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDeleteUser}
            title="Delete User" message="This user and all their financial data will be permanently deleted. This cannot be undone."
            confirmLabel="Delete User" danger />
        </div>
      )}

      {/* ── SUBSCRIPTION PRICING ──────────────────────────── */}
      {!loading && tab === 'pricing' && <PricingEditor toast={toast} />}

      {/* ── CONTACT INFO ──────────────────────────────────── */}
      {!loading && tab === 'contact' && (
        <div className="card" style={{ maxWidth:560 }}>
          <h4 style={{ marginBottom:8 }}>Contact Information</h4>
          <p style={{ fontSize:'0.875rem', color:'var(--gray-500)', marginBottom:24, lineHeight:1.6 }}>
            This information is shown to users so they can reach you for support. Fill in at least your email address.
          </p>
          <Field label="Support Email Address">
            <input className="input" type="email" value={contact.contactEmail || ''}
              onChange={e => setContact(p => ({ ...p, contactEmail: e.target.value }))}
              placeholder="support@yourdomain.com" />
          </Field>
          <Field label="Phone Number (optional)">
            <input className="input" type="tel" value={contact.contactPhone || ''}
              onChange={e => setContact(p => ({ ...p, contactPhone: e.target.value }))}
              placeholder="+91 98765 43210" />
          </Field>
          <Field label="WhatsApp Number (optional — with country code)">
            <input className="input" type="tel" value={contact.contactWhatsapp || ''}
              onChange={e => setContact(p => ({ ...p, contactWhatsapp: e.target.value }))}
              placeholder="+91 98765 43210" />
          </Field>
          <Field label="Support Message (shown to users)">
            <textarea className="textarea" value={contact.supportMessage || ''}
              onChange={e => setContact(p => ({ ...p, supportMessage: e.target.value }))}
              placeholder="For questions, billing, or support please reach out. We respond within 24 hours."
              style={{ minHeight:90 }} />
          </Field>
          <button className="btn btn-primary" onClick={saveContact} disabled={saving.contact}>
            {saving.contact ? 'Saving...' : 'Save Contact Info'}
          </button>
          {(contact.contactEmail || contact.contactPhone) && (
            <div style={{ marginTop:20, padding:'14px 16px', background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:'0.8125rem' }}>
              <div style={{ fontWeight:600, marginBottom:8, color:'var(--gray-700)' }}>Preview — what users will see:</div>
              {contact.supportMessage && <p style={{ color:'var(--gray-600)', marginBottom:8, lineHeight:1.5 }}>{contact.supportMessage}</p>}
              {contact.contactEmail    && <div style={{ marginBottom:4 }}>Email: <a href={`mailto:${contact.contactEmail}`} style={{ color:'var(--black)', fontWeight:600 }}>{contact.contactEmail}</a></div>}
              {contact.contactPhone    && <div style={{ marginBottom:4 }}>Phone: <strong>{contact.contactPhone}</strong></div>}
              {contact.contactWhatsapp && <div>WhatsApp: <strong>{contact.contactWhatsapp}</strong></div>}
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENT CONFIG ─────────────────────────────────── */}
      {!loading && tab === 'payment' && (
        <div className="grid-2">
          <div className="card">
            <h4 style={{ marginBottom:20 }}>PayPal</h4>
            <Field label="Client ID">
              <input className="input" value={payConfig.paypal?.clientId || ''}
                onChange={e => setPayConfig(p => ({ ...p, paypal:{ ...p.paypal, clientId:e.target.value } }))}
                placeholder="PayPal client ID from developer.paypal.com" />
            </Field>
            <Field label="Mode">
              <select className="select" value={payConfig.paypal?.mode || 'sandbox'}
                onChange={e => setPayConfig(p => ({ ...p, paypal:{ ...p.paypal, mode:e.target.value } }))}>
                <option value="sandbox">Sandbox (testing)</option>
                <option value="live">Live (real payments)</option>
              </select>
            </Field>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ fontSize:'0.875rem', fontWeight:500 }}>Enable PayPal payments</span>
              <Toggle value={!!payConfig.paypal?.enabled} onChange={() => setPayConfig(p => ({ ...p, paypal:{ ...p.paypal, enabled:!p.paypal?.enabled } }))} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={savePayPal}>Save PayPal</button>
          </div>
          <div className="card">
            <h4 style={{ marginBottom:20 }}>Payhip</h4>
            <Field label="Store URL">
              <input className="input" value={payConfig.payhip?.storeUrl || ''}
                onChange={e => setPayConfig(p => ({ ...p, payhip:{ ...p.payhip, storeUrl:e.target.value } }))}
                placeholder="https://payhip.com/yourstore" />
            </Field>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ fontSize:'0.875rem', fontWeight:500 }}>Enable Payhip payments</span>
              <Toggle value={!!payConfig.payhip?.enabled} onChange={() => setPayConfig(p => ({ ...p, payhip:{ ...p.payhip, enabled:!p.payhip?.enabled } }))} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={savePayhip}>Save Payhip</button>
            <div style={{ marginTop:16, fontSize:'0.75rem', color:'var(--gray-500)', lineHeight:1.5 }}>
              Get your Payhip API key: payhip.com → Account → Integrations → API
            </div>
          </div>
        </div>
      )}

      {/* ── FEATURE FLAGS ──────────────────────────────────── */}
      {!loading && tab === 'flags' && (
        <div className="card">
          <h4 style={{ marginBottom:20 }}>Feature Toggles</h4>
          {Object.keys(flags).length === 0
            ? <p style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>No flags available.</p>
            : Object.entries(flags).map(([key, val]) => (
              <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--gray-100)' }}>
                <div>
                  <div style={{ fontWeight:500, fontSize:'0.875rem', marginBottom:2 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--gray-500)' }}>Currently: {val ? 'Enabled' : 'Disabled'}</div>
                </div>
                <Toggle value={!!val} onChange={() => toggleFlag(key)} />
              </div>
            ))
          }
        </div>
      )}

      {/* ── EXCHANGE RATES ─────────────────────────────────── */}
      {!loading && tab === 'rates' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h4>Exchange Rates (Base: USD)</h4>
            <button className="btn btn-primary btn-sm" onClick={saveRates} disabled={saving.rates}>
              {saving.rates ? 'Saving...' : 'Save Rates'}
            </button>
          </div>
          {Object.keys(rates).length === 0
            ? <p style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>Loading rates...</p>
            : <div className="grid-3" style={{ gap:12 }}>
                {Object.entries(rates).map(([currency, rate]) => (
                  <div key={currency} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:40, fontWeight:600, fontSize:'0.875rem', fontFamily:'monospace', flexShrink:0 }}>{currency}</span>
                    <input className="input" type="number" step="0.0001" min="0" value={rate}
                      onChange={e => setRates(r => ({ ...r, [currency]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── AI ENGINE ──────────────────────────────────────── */}
      {!loading && tab === 'ai' && (
        <div className="card" style={{ maxWidth:520 }}>
          <h4 style={{ marginBottom:8 }}>Advanced Intelligence Engine</h4>
          <p style={{ fontSize:'0.8125rem', color:'var(--gray-500)', marginBottom:24, lineHeight:1.6 }}>
            Control the AI-powered analysis engine. The API key is stored as an environment variable on the server — it is never exposed to browsers.
          </p>
          <div style={{ padding:'12px 16px', background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:'var(--radius)', marginBottom:20, fontSize:'0.8125rem' }}>
            Status: <strong>{aiConfig.enabled ? 'Enabled' : 'Disabled'}</strong> —
            API Key: <strong>{aiConfig.keyConfigured ? 'Configured in server environment' : 'Not configured (add AI_ENGINE_KEY to Vercel environment)'}</strong>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--gray-200)', marginBottom:16 }}>
            <div>
              <div style={{ fontWeight:500 }}>Enable AI Engine</div>
              <div style={{ fontSize:'0.75rem', color:'var(--gray-500)' }}>Requires AI_ENGINE_KEY in Vercel environment variables</div>
            </div>
            <Toggle value={!!aiConfig.enabled} onChange={async () => {
              const enabled = !aiConfig.enabled;
              try { await adminAPI.updateAIConfig({ enabled }); setAiConfig(a => ({ ...a, enabled })); toast('AI Engine setting updated', 'success'); }
              catch { toast('Failed', 'error'); }
            }} />
          </div>
          {!aiConfig.enabled && (
            <div className="alert alert-info" style={{ fontSize:'0.8125rem' }}>
              When disabled, Ultimate plan users still get full Pro-level features powered by deterministic rules — no AI cost.
            </div>
          )}
        </div>
      )}

      {/* ── FEEDBACK ───────────────────────────────────────── */}
      {!loading && tab === 'feedback' && (
        <div className="card">
          <h4 style={{ marginBottom:20 }}>User Feedback ({feedback.length})</h4>
          {feedback.length === 0
            ? <p style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>No feedback submitted yet.</p>
            : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>User</th><th>Type</th><th>Rating</th><th>Message</th><th>Date</th></tr></thead>
                  <tbody>
                    {feedback.map(f => (
                      <tr key={f.id}>
                        <td style={{ fontWeight:500 }}>{f.user_name || '—'}</td>
                        <td><span className="badge badge-default">{f.type}</span></td>
                        <td>{f.rating}/5</td>
                        <td style={{ maxWidth:320, fontSize:'0.8125rem', color:'var(--gray-600)' }}>{f.message}</td>
                        <td style={{ color:'var(--gray-400)', fontSize:'0.75rem' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}

      {/* ── SYSTEM LOGS ────────────────────────────────────── */}
      {!loading && tab === 'logs' && (
        <div className="card">
          <h4 style={{ marginBottom:20 }}>System Logs ({logs.length})</h4>
          {logs.length === 0
            ? <div className="alert alert-success" style={{ fontSize:'0.8125rem' }}>No issues logged. System is running cleanly.</div>
            : logs.slice(0, 50).map(l => (
              <div key={l.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'0.8125rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontWeight:500, color:'var(--danger)' }}>{l.issue}</span>
                  <span style={{ color:'var(--gray-400)', fontSize:'0.75rem' }}>{new Date(l.created_at).toLocaleString()}</span>
                </div>
                {l.suggestion && <div style={{ color:'var(--gray-500)' }}>Fix: {l.suggestion}</div>}
              </div>
            ))
          }
        </div>
      )}

      {/* ── SECURITY ───────────────────────────────────────── */}
      {!loading && tab === 'security' && (
        <div className="card" style={{ maxWidth:460 }}>
          <h4 style={{ marginBottom:20 }}>Change Admin Password</h4>
          <Field label="Current Password">
            <input className="input" type="password" value={pwForm.currentPassword}
              onChange={e => setPwForm(p => ({ ...p, currentPassword:e.target.value }))} autoComplete="current-password" />
          </Field>
          <Field label="New Password (minimum 8 characters)">
            <input className="input" type="password" value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword:e.target.value }))} autoComplete="new-password" />
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

      {/* ── NOTIFICATIONS ──────────────────────────────────── */}
      {!loading && tab === 'notify' && (
        <div className="card" style={{ maxWidth:540 }}>
          <h4 style={{ marginBottom:20 }}>Send System Notification</h4>
          <Field label="Message">
            <textarea className="textarea" value={notifForm.message}
              onChange={e => setNotifForm(p => ({ ...p, message:e.target.value }))}
              placeholder="Enter message to send to users..." style={{ minHeight:80 }} />
          </Field>
          <div className="grid-2">
            <Field label="Type">
              <select className="select" value={notifForm.type} onChange={e => setNotifForm(p => ({ ...p, type:e.target.value }))}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
              </select>
            </Field>
            <Field label="Recipients">
              <select className="select" value={notifForm.userIds} onChange={e => setNotifForm(p => ({ ...p, userIds:e.target.value }))}>
                <option value="all">All Users</option>
              </select>
            </Field>
          </div>
          <button className="btn btn-primary" onClick={handleNotifSend} disabled={!notifForm.message}>
            Send Notification
          </button>
        </div>
      )}
    </Layout>
  );
}
