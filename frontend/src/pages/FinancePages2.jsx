import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { StatCard, ProgressBar, Field, Modal, Spinner, EmptyState, ConfirmModal } from '../components/ui';
import { LineChart, BarChart } from '../components/charts';
import { finance as finAPI } from '../utils/api';
import { useApp } from '../context/AppContext';

/* ══════════════════════════════════════════════════════════
   NET WORTH
══════════════════════════════════════════════════════════ */
export function NetWorth() {
  const { format } = useApp();
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showRec,  setShowRec]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  // Form state — safe initial structure
  const emptyForm = () => ({
    assets:      [{ name:'', value:'', type:'savings', liquid: true }],
    liabilities: [{ name:'', balance:'', type:'loan' }],
  });
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await finAPI.getNetWorthHistory();
      setHistory(res.history || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const latest = history.length ? history[history.length - 1] : null;
  const prev   = history.length > 1 ? history[history.length - 2] : null;
  const growth = latest && prev ? latest.netWorth - prev.netWorth : 0;

  const lineData = history.slice(-12).map(h => ({
    name:  new Date(h.date).toLocaleDateString('en', { month:'short', year:'2-digit' }),
    value: h.netWorth,
  }));

  // Asset helpers
  const setAsset = (i, k, v) => setForm(p => {
    const a = [...p.assets];
    a[i] = { ...a[i], [k]: v };
    return { ...p, assets: a };
  });
  const addAsset = () => setForm(p => ({
    ...p, assets: [...p.assets, { name:'', value:'', type:'savings', liquid: false }],
  }));

  // Liability helpers
  const setLiab = (i, k, v) => setForm(p => {
    const l = [...p.liabilities];
    l[i] = { ...l[i], [k]: v };
    return { ...p, liabilities: l };
  });
  const addLiab = () => setForm(p => ({
    ...p, liabilities: [...p.liabilities, { name:'', balance:'', type:'loan' }],
  }));

  const handleRecord = async () => {
    setSaving(true);
    try {
      const assets      = form.assets.filter(a => a.name && a.value)
        .map(a => ({ ...a, value: parseFloat(a.value) || 0 }));
      const liabilities = form.liabilities.filter(l => l.name && l.balance)
        .map(l => ({ ...l, balance: parseFloat(l.balance) || 0 }));
      await finAPI.saveNetWorth({ assets, liabilities });
      setShowRec(false);
      setForm(emptyForm());
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const ASSET_TYPES = ['savings','investments','property','vehicle','gold','crypto','other'];
  const LIAB_TYPES  = ['home_loan','car_loan','personal_loan','credit_card','student_loan','other'];

  return (
    <Layout title="Net Worth" subtitle="Assets minus liabilities — your true financial position">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:24 }}>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setShowRec(true); }}>
          Record Net Worth
        </button>
      </div>

      {loading
        ? <div style={{ textAlign:'center', padding:80 }}><Spinner size={32} /></div>
        : !latest
          ? <div className="card"><EmptyState title="No records yet"
              description="Record your assets and liabilities to start tracking your net worth over time."
              action={<button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm()); setShowRec(true); }}>Record Now</button>} /></div>
          : (
            <>
              <div className="grid-3 mb-6">
                <StatCard label="Net Worth"        value={format(latest.netWorth)}
                  change={growth} changeLabel={growth !== 0 ? `${growth > 0 ? '+' : ''}${format(growth)} vs previous` : 'First record'} />
                <StatCard label="Total Assets"      value={format(latest.assets?.reduce((s,a) => s+(a.value||0), 0) || 0)} />
                <StatCard label="Total Liabilities" value={format(latest.liabilities?.reduce((s,l) => s+(l.balance||0), 0) || 0)} />
              </div>

              <div className="card mb-6">
                <h4 style={{ marginBottom:20 }}>Net Worth Timeline</h4>
                {lineData.length >= 2
                  ? <LineChart data={lineData} height={220} />
                  : <EmptyState title="Record more months" description="Track net worth monthly to see your wealth growth timeline." />}
              </div>

              <div className="card">
                <h4 style={{ marginBottom:16 }}>History</h4>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Date</th><th>Net Worth</th><th>Assets</th><th>Liabilities</th></tr></thead>
                    <tbody>
                      {[...history].reverse().map(h => (
                        <tr key={h.id}>
                          <td>{new Date(h.date).toLocaleDateString('en', { day:'2-digit', month:'short', year:'numeric' })}</td>
                          <td style={{ fontWeight:600, color: h.netWorth >= 0 ? 'var(--success)' : 'var(--danger)' }}>{format(h.netWorth)}</td>
                          <td>{format(h.assets?.reduce((s,a)=>s+(a.value||0),0)||0)}</td>
                          <td>{format(h.liabilities?.reduce((s,l)=>s+(l.balance||0),0)||0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
      }

      <Modal open={showRec} onClose={() => setShowRec(false)} title="Record Net Worth" size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowRec(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRecord} disabled={saving}>{saving ? 'Saving...' : 'Save Record'}</button>
        </>}>

        {/* ASSETS */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h4 style={{ fontSize:'0.9rem' }}>Assets</h4>
            <button className="btn btn-ghost btn-sm" onClick={addAsset}>+ Add Asset</button>
          </div>
          {form.assets.map((a, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 120px', gap:8, marginBottom:8 }}>
              <input className="input" placeholder="Asset name (e.g. Savings Account)" value={a.name}
                onChange={e => setAsset(i, 'name', e.target.value)} />
              <input className="input" type="number" min="0" placeholder="Value" value={a.value}
                onChange={e => setAsset(i, 'value', e.target.value)} />
              <select className="select" value={a.type} onChange={e => setAsset(i, 'type', e.target.value)}>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* LIABILITIES */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h4 style={{ fontSize:'0.9rem' }}>Liabilities</h4>
            <button className="btn btn-ghost btn-sm" onClick={addLiab}>+ Add Liability</button>
          </div>
          {form.liabilities.map((l, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 120px', gap:8, marginBottom:8 }}>
              <input className="input" placeholder="Liability name (e.g. Home Loan)" value={l.name}
                onChange={e => setLiab(i, 'name', e.target.value)} />
              <input className="input" type="number" min="0" placeholder="Balance" value={l.balance}
                onChange={e => setLiab(i, 'balance', e.target.value)} />
              <select className="select" value={l.type} onChange={e => setLiab(i, 'type', e.target.value)}>
                {LIAB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Preview */}
        {(form.assets.some(a => a.value) || form.liabilities.some(l => l.balance)) && (
          <div style={{ marginTop:16, padding:'12px 16px', background:'var(--gray-50)', borderRadius:'var(--radius)', fontSize:'0.875rem' }}>
            Net Worth Preview: <strong>
              {format(
                form.assets.reduce((s,a) => s+(parseFloat(a.value)||0), 0) -
                form.liabilities.reduce((s,l) => s+(parseFloat(l.balance)||0), 0)
              )}
            </strong>
          </div>
        )}
      </Modal>
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   SCENARIOS
══════════════════════════════════════════════════════════ */
export function Scenarios() {
  const { format } = useApp();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    finAPI.getScenarios()
      .then(res => setData(res))
      .catch(err => setError(err.error || 'Failed to load scenarios'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Scenario Simulator"><div style={{ textAlign:'center', padding:80 }}><Spinner size={32} /></div></Layout>;

  const baseline = data?.baseline || {};
  const scenarios = data?.scenarios || [];

  return (
    <Layout title="Scenario Simulator" subtitle="Model financial changes and see 5-year wealth impact">
      {error && <div className="alert alert-warning mb-6">{error}. Set income in Settings first.</div>}

      {baseline.income > 0 && (
        <div className="card mb-6">
          <h4 style={{ marginBottom:16 }}>Current Baseline</h4>
          <div className="grid-4">
            {[
              ['Monthly Income',   format(baseline.income)],
              ['Monthly Expenses', format(baseline.expenses)],
              ['Monthly Savings',  format(baseline.savings)],
              ['Net Worth',        format(baseline.netWorth)],
            ].map(([l, v]) => (
              <div key={l} style={{ textAlign:'center', padding:14, background:'var(--gray-50)', borderRadius:'var(--radius)' }}>
                <div style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--gray-500)', marginBottom:4 }}>{l}</div>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.2rem', fontWeight:700 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scenarios.length === 0 && !error && (
        <div className="card">
          <EmptyState title="Set up your profile"
            description="Go to Settings and add your monthly income to enable scenario simulation." />
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {scenarios.map((s, i) => (
          <div key={i} className="card">
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'1rem', marginBottom:4 }}>{s.name}</div>
                <div style={{ fontSize:'0.8125rem', color:'var(--gray-500)' }}>{s.description}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.25rem', fontWeight:700,
                  color: s.wealthDelta > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {s.wealthDelta > 0 ? '+' : ''}{format(s.wealthDelta || 0)}
                </div>
                <div style={{ fontSize:'0.75rem', color:'var(--gray-500)' }}>5-year wealth difference</div>
              </div>
            </div>
            {(s.improvement || []).length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {s.improvement.map((imp, j) => (
                  <span key={j} className="badge badge-default">{imp}</span>
                ))}
              </div>
            )}
            <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:'0.8125rem' }}>
              <div style={{ padding:10, background:'var(--gray-50)', borderRadius:'var(--radius)' }}>
                <span style={{ color:'var(--gray-500)' }}>Projected savings/mo: </span>
                <strong>{format(s.projectedSavings || 0)}</strong>
              </div>
              <div style={{ padding:10, background:'var(--gray-50)', borderRadius:'var(--radius)' }}>
                <span style={{ color:'var(--gray-500)' }}>Wealth at 5yr: </span>
                <strong>{format(s.wealthAt5Years || 0)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   INVESTMENTS
══════════════════════════════════════════════════════════ */
export function Investments() {
  const { format } = useApp();
  const [investments, setInvestments] = useState([]);
  const [analysis,    setAnalysis]    = useState(null);
  const [projection,  setProjection]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [projLoading, setProjLoading] = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);
  const [monthly,     setMonthly]     = useState(5000);
  const [risk,        setRisk]        = useState('moderate');
  const [form, setForm] = useState({ name:'', amount:'', type:'mutual_fund', currentValue:'' });

  // Load investments first
  const loadInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await finAPI.getInvestments();
      setInvestments(res.investments || []);
      setAnalysis(res.analysis || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // Fetch projection separately (debounced by button click or slider change)
  const loadProjection = useCallback(async (mo, riskProfile) => {
    setProjLoading(true);
    try {
      const res = await finAPI.projectInvestments({ monthlyAmount: mo, riskProfile });
      setProjection(res);
    } catch (e) { console.error(e); }
    finally { setProjLoading(false); }
  }, []);

  useEffect(() => { loadInvestments(); }, [loadInvestments]);

  // Load initial projection after investments loaded
  useEffect(() => {
    if (!loading) loadProjection(monthly, risk);
  }, [loading]);  // eslint-disable-line

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleAdd = async () => {
    if (!form.name || !form.amount) return;
    try {
      await finAPI.addInvestment({
        name: form.name,
        amount: parseFloat(form.amount),
        type: form.type,
        currentValue: parseFloat(form.currentValue) || parseFloat(form.amount),
      });
      setShowAdd(false);
      setForm({ name:'', amount:'', type:'mutual_fund', currentValue:'' });
      loadInvestments();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    try { await finAPI.deleteInvestment(deleteId); loadInvestments(); }
    catch (e) { console.error(e); }
    setDeleteId(null);
  };

  const TYPES = ['mutual_fund','stocks','etf','fixed_deposit','ppf','nps','gold','real_estate','crypto','other'];

  const five = (projection?.fiveYear?.projections || []).map(p => ({ name:`Y${p.year}`, value: p.corpus }));
  const ten  = (projection?.tenYear?.projections  || []).map(p => ({ name:`Y${p.year}`, value: p.corpus }));

  return (
    <Layout title="Investments" subtitle="Portfolio tracking and projection modeling">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:24 }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Investment</button>
      </div>

      {analysis && (
        <div className="grid-4 mb-6">
          <StatCard label="Total Invested" value={format(analysis.invested || 0)} />
          <StatCard label="Current Value"  value={format(analysis.total || 0)} />
          <StatCard label="Returns"        value={format(analysis.returns || 0)}
            change={analysis.returns > 0 ? 1 : analysis.returns < 0 ? -1 : 0}
            changeLabel={`${(analysis.returnPct || 0).toFixed(1)}%`} />
          <StatCard label="Holdings"       value={investments.length} />
        </div>
      )}

      {/* PROJECTION TOOL */}
      <div className="card mb-6">
        <h4 style={{ marginBottom:20 }}>Investment Projection Modeler</h4>
        <div style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap', marginBottom:20 }}>
          <div style={{ flex:1, minWidth:200 }}>
            <label className="form-label">Monthly Investment Amount</label>
            <div className="input-group">
              <span className="input-prefix">Amt</span>
              <input className="input" type="number" min="0" step="500" value={monthly}
                onChange={e => setMonthly(parseFloat(e.target.value)||0)} />
            </div>
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <label className="form-label">Risk Profile</label>
            <select className="select" value={risk} onChange={e => setRisk(e.target.value)}>
              <option value="conservative">Conservative (FD-heavy, ~8%)</option>
              <option value="moderate">Moderate (Balanced, ~12%)</option>
              <option value="aggressive">Aggressive (Equity-heavy, ~14%)</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => loadProjection(monthly, risk)} disabled={projLoading}>
            {projLoading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>

        {projLoading
          ? <div style={{ textAlign:'center', padding:30 }}><Spinner /></div>
          : (
            <div className="grid-2">
              <div>
                <div style={{ fontSize:'0.8125rem', fontWeight:600, marginBottom:12 }}>5-Year Corpus</div>
                {five.length >= 2 ? <LineChart data={five} height={140} /> : <EmptyState title="No data" description="" />}
                {five.length > 0 && (
                  <div style={{ textAlign:'center', marginTop:8, fontSize:'0.875rem', color:'var(--gray-600)' }}>
                    Corpus: <strong>{format(five[five.length-1]?.value || 0)}</strong>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize:'0.8125rem', fontWeight:600, marginBottom:12 }}>10-Year Corpus</div>
                {ten.length >= 2 ? <LineChart data={ten} height={140} /> : <EmptyState title="No data" description="" />}
                {ten.length > 0 && (
                  <div style={{ textAlign:'center', marginTop:8, fontSize:'0.875rem', color:'var(--gray-600)' }}>
                    Corpus: <strong>{format(ten[ten.length-1]?.value || 0)}</strong>
                  </div>
                )}
              </div>
            </div>
          )
        }

        {projection?.suggestion && (
          <div style={{ marginTop:16, padding:'12px 16px', background:'var(--gray-50)', borderRadius:'var(--radius)' }}>
            <div style={{ fontSize:'0.8125rem', fontWeight:600, marginBottom:8 }}>Suggested Allocation — {risk}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {(projection.suggestion.breakdown || []).map((b, i) => (
                <div key={i} style={{ padding:'8px 12px', background:'var(--white)', borderRadius:'var(--radius)', border:'1px solid var(--gray-200)', fontSize:'0.8125rem' }}>
                  <span style={{ textTransform:'capitalize', color:'var(--gray-500)' }}>{b.type}: </span>
                  <strong>{format(b.amount)}/mo ({b.percentage}%)</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* HOLDINGS */}
      <div className="card">
        <h4 style={{ marginBottom:20 }}>Holdings</h4>
        {loading
          ? <div style={{ textAlign:'center', padding:40 }}><Spinner /></div>
          : investments.length === 0
            ? <EmptyState title="No investments" description="Add your investments to track performance and run projections."
                action={<button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>Add First Investment</button>} />
            : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Investment</th><th>Type</th><th>Invested</th><th>Current Value</th><th>Return</th><th></th></tr></thead>
                  <tbody>
                    {investments.map(inv => {
                      const cur = inv.currentValue || inv.amount;
                      const ret = cur - inv.amount;
                      const pct = inv.amount > 0 ? ((ret / inv.amount) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight:500 }}>{inv.name}</td>
                          <td><span className="badge badge-default">{(inv.type||'').replace(/_/g,' ')}</span></td>
                          <td>{format(inv.amount)}</td>
                          <td style={{ fontWeight:600 }}>{format(cur)}</td>
                          <td style={{ color: ret >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight:500 }}>
                            {ret >= 0 ? '+' : ''}{format(ret)} ({pct}%)
                          </td>
                          <td style={{ textAlign:'right' }}>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => setDeleteId(inv.id)}>Remove</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Investment"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add</button>
        </>}>
        <Field label="Investment Name"><input className="input" value={form.name} onChange={set('name')} placeholder="e.g. NIFTY 50 Index Fund" /></Field>
        <Field label="Type">
          <select className="select" value={form.type} onChange={set('type')}>
            {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
        </Field>
        <div className="grid-2">
          <Field label="Amount Invested">
            <div className="input-group"><span className="input-prefix">Amt</span><input className="input" type="number" min="0" value={form.amount} onChange={set('amount')} placeholder="0" /></div>
          </Field>
          <Field label="Current Value">
            <div className="input-group"><span className="input-prefix">Amt</span><input className="input" type="number" min="0" value={form.currentValue} onChange={set('currentValue')} placeholder="Leave blank if same" /></div>
          </Field>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Remove Investment" message="This investment record will be permanently deleted." confirmLabel="Remove" danger />
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   RISK ANALYSIS
══════════════════════════════════════════════════════════ */
export function RiskAnalysis() {
  const { format } = useApp();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    finAPI.getDashboard()
      .then(res => setData(res?.riskAssessment || null))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Risk Analysis"><div style={{ textAlign:'center', padding:80 }}><Spinner size={32} /></div></Layout>;

  return (
    <Layout title="Risk Analysis" subtitle="Insurance gaps, debt exposure, and financial protection alerts">
      {data && (
        <>
          <div className="grid-3 mb-6">
            <StatCard label="Risk Level"        value={data.riskLevel || 'Low'} />
            <StatCard label="Risk Score"        value={`${data.riskScore || 0}/100`}
              changeLabel={data.riskScore >= 60 ? 'High risk detected' : data.riskScore >= 30 ? 'Medium risk' : 'Low risk'} />
            <StatCard label="Debt-to-Income"    value={`${data.debtToIncome || 0}%`}
              changeLabel={data.debtToIncome > 40 ? 'Above 40% threshold' : 'Within safe range'} />
          </div>

          <div className="card mb-6">
            <h4 style={{ marginBottom:16 }}>Risk Alerts</h4>
            {(data.alerts || []).length
              ? data.alerts.map((a, i) => (
                <div key={i} className={`alert alert-${a.severity === 'high' ? 'danger' : 'warning'}`} style={{ marginBottom:8, fontSize:'0.8125rem' }}>
                  <strong>{a.severity === 'high' ? 'High Risk' : 'Medium Risk'}</strong> — {a.message}
                </div>
              ))
              : <div className="alert alert-success" style={{ fontSize:'0.8125rem' }}>No significant risk alerts. Financial position looks solid.</div>
            }
          </div>

          <div className="grid-2">
            <div className="card">
              <h4 style={{ marginBottom:16 }}>Insurance Status</h4>
              {[['Life Insurance', data.hasLifeInsurance], ['Health Insurance', data.hasHealthInsurance]].map(([name, has]) => (
                <div key={name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'0.875rem' }}>
                  <span>{name}</span>
                  <span className={`badge badge-${has ? 'success' : 'danger'}`}>{has ? 'Detected' : 'Not found'}</span>
                </div>
              ))}
              <p style={{ fontSize:'0.75rem', color:'var(--gray-500)', marginTop:12, lineHeight:1.5 }}>
                Add insurance details to your profile for accurate detection. Go to Settings.
              </p>
            </div>
            <div className="card">
              <h4 style={{ marginBottom:16 }}>Recommendations</h4>
              {(data.recommendations || []).length
                ? data.recommendations.map((r, i) => (
                  <div key={i} style={{ fontSize:'0.8125rem', color:'var(--gray-700)', padding:'8px 0', borderBottom:'1px solid var(--gray-100)', display:'flex', gap:8 }}>
                    <span style={{ color:'var(--black)', fontWeight:700, flexShrink:0 }}>—</span>{r}
                  </div>
                ))
                : <p style={{ fontSize:'0.875rem', color:'var(--gray-500)' }}>No recommendations at this time.</p>
              }
            </div>
          </div>
        </>
      )}
      {!data && !loading && (
        <div className="card">
          <EmptyState title="Risk data unavailable" description="Set your income and record expenses to enable risk analysis." />
        </div>
      )}
    </Layout>
  );
}
