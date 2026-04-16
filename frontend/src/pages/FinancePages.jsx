import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Modal, ConfirmModal, EmptyState, Spinner, Field, StatCard, ProgressBar } from '../components/ui';
import { LineChart } from '../components/charts';
import { finance as finAPI } from '../utils/api';
import { useApp } from '../context/AppContext';

/* ══════════════════════════════════════════════════════════
   SUBSCRIPTIONS
══════════════════════════════════════════════════════════ */
export function Subscriptions() {
  const { format } = useApp();
  const [subs,     setSubs]     = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', amount: '', billing: 'monthly', category: 'Entertainment', usageScore: 100 });
  const [saving, setSaving] = useState(false);

  const CATS = ['Entertainment','Software','Music','News','Fitness','Food','Cloud','Learning','Gaming','Other'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await finAPI.getSubscriptions();
      setSubs(res.subscriptions || []);
      setAnalysis(res.analysis  || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openEdit = item => {
    setEditItem(item);
    setForm({ name: item.name, amount: String(item.amount), billing: item.billing,
              category: item.category || 'Other', usageScore: item.usageScore ?? 100 });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) return;
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount), usageScore: parseInt(form.usageScore) };
      if (editItem) await finAPI.updateSubscription(editItem.id, payload);
      else          await finAPI.addSubscription(payload);
      setShowAdd(false); setEditItem(null); load();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await finAPI.deleteSubscription(deleteId); load(); }
    catch (e) { console.error(e); }
    setDeleteId(null);
  };

  return (
    <Layout title="Subscriptions" subtitle="Manage recurring charges and detect waste">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:24 }}>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setForm({ name:'', amount:'', billing:'monthly', category:'Entertainment', usageScore:100 }); setShowAdd(true); }}>
          + Add Subscription
        </button>
      </div>

      {analysis && (
        <div className="grid-4 mb-6">
          <StatCard label="Monthly Cost"  value={format(analysis.monthlyTotal || 0)} />
          <StatCard label="Annual Cost"   value={format(analysis.annualTotal  || 0)} />
          <StatCard label="Active"        value={analysis.activeCount || 0} />
          <StatCard label="Unused"        value={analysis.unusedCount || 0}
            changeLabel={analysis.unusedCount > 0 ? `Save ${format(analysis.potentialSavings || 0)}/mo` : 'All in use'} />
        </div>
      )}

      {(analysis?.unusedCount || 0) > 0 && (
        <div className="alert alert-warning mb-6" style={{ fontSize:'0.8125rem' }}>
          {analysis.unusedCount} subscription{analysis.unusedCount > 1 ? 's' : ''} with low usage.
          Cancelling could save {format(analysis.potentialSavings || 0)} per month — {format((analysis.potentialSavings || 0) * 12)} per year.
        </div>
      )}

      <div className="card">
        {loading
          ? <div style={{ textAlign:'center', padding:40 }}><Spinner /></div>
          : subs.length === 0
            ? <EmptyState title="No subscriptions" description="Add your recurring subscriptions to track costs and find waste."
                action={<button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>Add First Subscription</button>} />
            : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Service</th><th>Category</th><th>Billing</th>
                      <th>Usage</th><th style={{ textAlign:'right' }}>Monthly</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map(s => {
                      const mo = s.billing === 'yearly' ? s.amount / 12 : s.amount;
                      const unused = (s.usageScore || 0) < 30;
                      return (
                        <tr key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
                          <td style={{ fontWeight:500 }}>{s.name}</td>
                          <td><span className="badge badge-default">{s.category}</span></td>
                          <td style={{ color:'var(--gray-500)', textTransform:'capitalize' }}>{s.billing}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:60 }}>
                                <ProgressBar value={s.usageScore || 0} max={100}
                                  variant={s.usageScore >= 70 ? 'success' : s.usageScore >= 30 ? 'warning' : 'danger'} />
                              </div>
                              {unused && <span className="badge badge-warning">Unused</span>}
                            </div>
                          </td>
                          <td style={{ textAlign:'right', fontWeight:500 }}>{format(Math.round(mo))}</td>
                          <td style={{ textAlign:'right' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => setDeleteId(s.id)}>Del</button>
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

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditItem(null); }}
        title={editItem ? 'Edit Subscription' : 'Add Subscription'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setEditItem(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <Field label="Service Name"><input className="input" value={form.name} onChange={set('name')} placeholder="Netflix, Spotify..." /></Field>
        <Field label="Amount">
          <div className="input-group">
            <span className="input-prefix">Amount</span>
            <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" />
          </div>
        </Field>
        <div className="grid-2">
          <Field label="Billing">
            <select className="select" value={form.billing} onChange={set('billing')}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
          <Field label="Category">
            <select className="select" value={form.category} onChange={set('category')}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`Usage Score: ${form.usageScore}%`}>
          <input type="range" min="0" max="100" step="5" value={form.usageScore}
            onChange={e => setForm(p => ({ ...p, usageScore: e.target.value }))}
            style={{ width:'100%', marginTop:4 }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'var(--gray-400)', marginTop:4 }}>
            <span>Never use it</span><span>Sometimes</span><span>Use it daily</span>
          </div>
        </Field>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Remove Subscription" message="This subscription will be removed from tracking." confirmLabel="Remove" danger />
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   DEBT PLANNER
══════════════════════════════════════════════════════════ */
export function DebtPlanner() {
  const { format } = useApp();
  const [debts,    setDebts]   = useState([]);
  const [strategy, setStrategy]= useState(null);
  const [loading,  setLoading] = useState(true);
  const [stratLoading, setStratLoading] = useState(false);
  const [showAdd,  setShowAdd] = useState(false);
  const [deleteId, setDeleteId]= useState(null);
  const [extra,    setExtra]   = useState(0);
  const [method,   setMethod]  = useState('avalanche');
  const [form, setForm] = useState({ name:'', balance:'', interestRate:'', minimumPayment:'', type:'personal_loan' });

  // Load debts first, then fetch strategy separately
  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await finAPI.getDebts();
      setDebts(res.debts || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadStrategy = useCallback(async (extraAmt) => {
    setStratLoading(true);
    try {
      const res = await finAPI.getDebtStrategy(extraAmt);
      setStrategy(res);
    } catch (e) {
      // strategy may not be available (no debts) — not a fatal error
      setStrategy(null);
    } finally { setStratLoading(false); }
  }, []);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  // Fetch strategy whenever debts or extra payment changes
  useEffect(() => {
    if (!loading) loadStrategy(extra);
  }, [loading, extra, loadStrategy]);

  const TYPES = ['Personal Loan','Home Loan','Car Loan','Credit Card','Student Loan','Medical Debt','Other'];
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleAdd = async () => {
    if (!form.name || !form.balance) return;
    try {
      await finAPI.addDebt({
        name: form.name,
        balance: parseFloat(form.balance) || 0,
        interestRate: parseFloat(form.interestRate) || 0,
        minimumPayment: parseFloat(form.minimumPayment) || 0,
        type: form.type,
      });
      setShowAdd(false);
      setForm({ name:'', balance:'', interestRate:'', minimumPayment:'', type:'personal_loan' });
      loadDebts();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    try { await finAPI.deleteDebt(deleteId); loadDebts(); }
    catch (e) { console.error(e); }
    setDeleteId(null);
  };

  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const active    = strategy ? strategy[method] : null;

  return (
    <Layout title="Debt Planner" subtitle="Snowball and Avalanche payoff strategies">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:24 }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Debt</button>
      </div>

      {loading
        ? <div style={{ textAlign:'center', padding:80 }}><Spinner size={32} /></div>
        : debts.length === 0
          ? <div className="card"><EmptyState title="No debts recorded"
              description="Add your debts to get a personalized elimination strategy."
              action={<button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>Add First Debt</button>} /></div>
          : <>
              <div className="grid-3 mb-6">
                <StatCard label="Total Debt"   value={format(totalDebt)} />
                <StatCard label="Active Debts" value={debts.length} />
                <StatCard label="Payoff Date"  value={active?.payoffDate || '—'}
                  changeLabel={active ? `${active.totalMonths} months` : ''} />
              </div>

              {(strategy?.interestSaved || 0) > 500 && (
                <div className="alert alert-info mb-6" style={{ fontSize:'0.8125rem' }}>
                  Avalanche saves {format(strategy.interestSaved)} more in interest than Snowball. Recommended.
                </div>
              )}

              <div className="card mb-6">
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
                  <h4>Payoff Strategy</h4>
                  <div style={{ display:'flex', gap:4 }}>
                    {['avalanche','snowball'].map(m => (
                      <button key={m} className={`btn btn-sm ${method===m ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMethod(m)}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, padding:'12px 16px', background:'var(--gray-50)', borderRadius:'var(--radius)' }}>
                  <label style={{ fontSize:'0.8125rem', fontWeight:500, whiteSpace:'nowrap' }}>Extra payment/month:</label>
                  <div className="input-group" style={{ width:160 }}>
                    <span className="input-prefix">Amt</span>
                    <input className="input" type="number" min="0" step="100"
                      value={extra || ''} onChange={e => setExtra(parseFloat(e.target.value) || 0)} placeholder="0" />
                  </div>
                  <span style={{ fontSize:'0.75rem', color:'var(--gray-500)' }}>Applied to top-priority debt</span>
                </div>

                {stratLoading
                  ? <div style={{ textAlign:'center', padding:20 }}><Spinner /></div>
                  : active && (
                    <>
                      <div className="grid-3 mb-6">
                        {[
                          ['Months to Debt-Free', active.totalMonths],
                          ['Total Interest Cost',  format(active.totalInterest)],
                          ['Debt-Free Date',       active.payoffDate],
                        ].map(([l, v]) => (
                          <div key={l} style={{ textAlign:'center', padding:16, background:'var(--gray-50)', borderRadius:'var(--radius)' }}>
                            <div style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--gray-500)', marginBottom:6 }}>{l}</div>
                            <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.4rem', fontWeight:700 }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr><th>Priority</th><th>Debt</th><th>Balance</th><th>Rate</th><th>Min Payment</th><th>Paid Off</th></tr>
                          </thead>
                          <tbody>
                            {(active.debtDetails || []).map((d, i) => (
                              <tr key={i}>
                                <td><span className="badge badge-black">#{i+1}</span></td>
                                <td style={{ fontWeight:500 }}>{d.name}</td>
                                <td>{format(d.originalBalance || 0)}</td>
                                <td>{debts.find(x => x.name === d.name)?.interestRate || '—'}%</td>
                                <td>{format(debts.find(x => x.name === d.name)?.minimumPayment || 0)}</td>
                                <td style={{ color:'var(--gray-500)' }}>{d.paidOffMonth ? `Month ${d.paidOffMonth}` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )
                }
              </div>

              {/* Debt list */}
              <div className="card">
                <h4 style={{ marginBottom:16 }}>Your Debts</h4>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Name</th><th>Type</th><th>Balance</th><th>Rate</th><th>Min Payment</th><th></th></tr></thead>
                    <tbody>
                      {debts.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontWeight:500 }}>{d.name}</td>
                          <td><span className="badge badge-default">{(d.type || '').replace(/_/g,' ')}</span></td>
                          <td style={{ fontWeight:600, color:'var(--danger)' }}>{format(d.balance || 0)}</td>
                          <td>{d.interestRate}%</td>
                          <td>{format(d.minimumPayment || 0)}</td>
                          <td style={{ textAlign:'right' }}>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => setDeleteId(d.id)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
      }

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Debt"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add Debt</button>
        </>}>
        <Field label="Debt Name"><input className="input" value={form.name} onChange={set('name')} placeholder="e.g. HDFC Car Loan" /></Field>
        <Field label="Type">
          <select className="select" value={form.type} onChange={set('type')}>
            {TYPES.map(t => <option key={t} value={t.toLowerCase().replace(/ /g,'_')}>{t}</option>)}
          </select>
        </Field>
        <div className="grid-2">
          <Field label="Current Balance">
            <div className="input-group"><span className="input-prefix">Amt</span><input className="input" type="number" min="0" value={form.balance} onChange={set('balance')} placeholder="0" /></div>
          </Field>
          <Field label="Interest Rate (% p.a.)">
            <input className="input" type="number" min="0" step="0.1" value={form.interestRate} onChange={set('interestRate')} placeholder="12.5" />
          </Field>
        </div>
        <Field label="Minimum Monthly Payment">
          <div className="input-group"><span className="input-prefix">Amt</span><input className="input" type="number" min="0" value={form.minimumPayment} onChange={set('minimumPayment')} placeholder="0" /></div>
        </Field>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Remove Debt" message="This debt record will be deleted. This cannot be undone." confirmLabel="Remove" danger />
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   PROJECTIONS
══════════════════════════════════════════════════════════ */
export function Projections() {
  const { format } = useApp();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    finAPI.getProjections()
      .then(res => setData(res))
      .catch(err => setError(err.error || 'Failed to load projections'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Wealth Projection"><div style={{ textAlign:'center', padding:80 }}><Spinner size={32} /></div></Layout>;

  const five = (data?.fiveYear  || []).map(p => ({ name: `Y${p.year}`, value: p.wealth }));
  const ten  = (data?.tenYear   || []).map(p => ({ name: `Y${p.year}`, value: p.wealth }));

  return (
    <Layout title="Wealth Projection" subtitle="5 and 10-year financial freedom modeling">
      {error && <div className="alert alert-warning mb-6">{error}. Set your monthly income in Settings.</div>}

      <div className="grid-3 mb-6">
        <StatCard label="Monthly Savings"     value={format(data?.monthlySavings || 0)} />
        <StatCard label="Financial Freedom Number" value={format(data?.freedomNumber || 0)} changeLabel="25× annual expenses (4% rule)" />
        <StatCard label="Years to Freedom"    value={data?.yearsToFreedom != null ? `${data.yearsToFreedom} yrs` : 'Set income first'} />
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <h4 style={{ marginBottom:20 }}>5-Year Projection</h4>
          {five.length >= 2
            ? <LineChart data={five} height={200} />
            : <EmptyState title="Insufficient data" description="Set your income in Settings to generate projections." />}
          {five.length > 0 && (
            <div style={{ textAlign:'center', marginTop:12, fontSize:'0.875rem', color:'var(--gray-600)' }}>
              Projected wealth at year 5: <strong>{format(five[five.length-1]?.value || 0)}</strong>
            </div>
          )}
        </div>
        <div className="card">
          <h4 style={{ marginBottom:20 }}>10-Year Projection</h4>
          {ten.length >= 2
            ? <LineChart data={ten} height={200} />
            : <EmptyState title="Insufficient data" description="Set your income in Settings to generate projections." />}
          {ten.length > 0 && (
            <div style={{ textAlign:'center', marginTop:12, fontSize:'0.875rem', color:'var(--gray-600)' }}>
              Projected wealth at year 10: <strong>{format(ten[ten.length-1]?.value || 0)}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginBottom:16 }}>Projection Assumptions</h4>
        <div className="grid-3">
          {[
            ['Annual Return',   '12% (blended equity average)'],
            ['Current NW',      format(data?.currentNetWorth || 0)],
            ['Monthly Savings', format(data?.monthlySavings || 0)],
          ].map(([k, v]) => (
            <div key={k} style={{ padding:14, background:'var(--gray-50)', borderRadius:'var(--radius)' }}>
              <div style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--gray-500)', marginBottom:4 }}>{k}</div>
              <div style={{ fontSize:'0.875rem', fontWeight:500 }}>{v}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize:'0.75rem', color:'var(--gray-400)', marginTop:12 }}>
          Record your net worth monthly for more accurate projections. Projections assume constant savings and 12% nominal annual return.
        </p>
      </div>
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   TAX ESTIMATE
══════════════════════════════════════════════════════════ */
export function TaxEstimate() {
  const { format } = useApp();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    finAPI.getTax()
      .then(res => setData(res))
      .catch(err => setError(err.error || 'Failed to load tax estimate'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Tax Estimate"><div style={{ textAlign:'center', padding:80 }}><Spinner size={32} /></div></Layout>;

  return (
    <Layout title="Tax Estimate" subtitle="Country-based tax bracket estimation">
      <div className="alert alert-warning mb-6" style={{ fontSize:'0.8125rem' }}>
        Estimates only — based on simplified brackets. Consult a qualified tax advisor for accurate calculations.
      </div>

      {error && (
        <div className="card">
          <EmptyState title="Income not set"
            description={error + '. Go to Settings and set your monthly income first.'}
            action={<a href="/settings" className="btn btn-primary btn-sm">Open Settings</a>} />
        </div>
      )}

      {data && (
        <>
          <div className="grid-4 mb-6">
            <StatCard label="Gross Annual Income"   value={format(data.grossIncome || 0)} />
            <StatCard label="Estimated Tax"         value={format(data.totalTax || 0)} />
            <StatCard label="Effective Rate"        value={`${data.effectiveRate || 0}%`} />
            <StatCard label="Monthly Take-Home"     value={format(data.monthlyTakeHome || 0)} />
          </div>

          <div className="grid-2">
            <div className="card">
              <h4 style={{ marginBottom:20 }}>Tax Bracket Breakdown — {data.country}</h4>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Income Range</th><th>Rate</th><th>Tax in Bracket</th></tr></thead>
                  <tbody>
                    {(data.brackets || []).map((b, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily:'monospace', fontSize:'0.8125rem' }}>{b.range}</td>
                        <td><span className="badge badge-default">{b.rate}</span></td>
                        <td style={{ fontWeight:500 }}>{format(b.tax || 0)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop:'2px solid var(--gray-200)' }}>
                      <td style={{ fontWeight:700 }}>Total</td>
                      <td><span className="badge badge-black">{data.effectiveRate}%</span></td>
                      <td style={{ fontWeight:700 }}>{format(data.totalTax || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginBottom:16 }}>Summary</h4>
              {[
                ['Gross Annual Income',  format(data.grossIncome || 0)],
                ['Standard Deduction',   format(data.standardDeduction || 0)],
                ['Taxable Income',       format(data.taxableIncome || 0)],
                ['Total Tax',            format(data.totalTax || 0)],
                ['Annual Take-Home',     format(data.takeHome || 0)],
                ['Monthly Take-Home',    format(data.monthlyTakeHome || 0)],
              ].map(([l, v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'0.875rem' }}>
                  <span style={{ color:'var(--gray-600)' }}>{l}</span>
                  <span style={{ fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
