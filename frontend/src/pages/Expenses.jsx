import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Modal, ConfirmModal, EmptyState, Spinner, Field } from '../components/ui';
import { DonutChart, HBar } from '../components/charts';
import { finance as finAPI } from '../utils/api';
import { useApp } from '../context/AppContext';

const SUBCATEGORIES = ['Housing', 'Food & Dining', 'Transport', 'Healthcare', 'Education', 'Entertainment', 'Shopping', 'Insurance', 'Utilities', 'Personal Care', 'Fitness', 'Travel', 'Investments', 'Subscriptions', 'Other'];

const EMPTY_FORM = { amount: '', description: '', category: 'need', subcategory: 'Food & Dining', date: new Date().toISOString().slice(0, 10) };

export default function Expenses() {
  const { format } = useApp();
  const [expenses, setExpenses] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all'); // all|need|want

  const load = useCallback(async () => {
    try {
      const res = await finAPI.getExpenses();
      setExpenses(res.expenses || []);
      // Client-side analysis
      const exps = res.expenses || [];
      const total = exps.reduce((s, e) => s + e.amount, 0);
      const needs = exps.filter(e => e.category === 'need').reduce((s, e) => s + e.amount, 0);
      const wants = exps.filter(e => e.category === 'want').reduce((s, e) => s + e.amount, 0);
      const byCat = exps.reduce((acc, e) => { acc[e.subcategory] = (acc[e.subcategory] || 0) + e.amount; return acc; }, {});
      setAnalysis({ total, needs, wants, byCat });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openEdit = (item) => { setEditItem(item); setForm({ amount: item.amount, description: item.description, category: item.category, subcategory: item.subcategory, date: item.date.slice(0, 10) }); setShowAdd(true); };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    try {
      if (editItem) await finAPI.updateExpense(editItem.id, { ...form, amount: parseFloat(form.amount) });
      else await finAPI.addExpense({ ...form, amount: parseFloat(form.amount) });
      setShowAdd(false); setEditItem(null); setForm(EMPTY_FORM); load();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await finAPI.deleteExpense(deleteId); load(); } catch {}
    setDeleteId(null);
  };

  const shown = filter === 'all' ? expenses : expenses.filter(e => e.category === filter);
  const sorted = [...shown].sort((a, b) => new Date(b.date) - new Date(a.date));

  const donutData = Object.entries(analysis?.byCat || {}).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 6);

  return (
    <Layout title="Expenses" subtitle="Track every expense as need or want — user choice">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div />
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowAdd(true); }}>+ Add Expense</button>
      </div>

      {/* SUMMARY */}
      {analysis && (
        <div className="grid-4 mb-6">
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value">{format(analysis.total)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Needs</div>
            <div className="stat-value">{format(analysis.needs)}</div>
            <div className="stat-change">{analysis.total > 0 ? Math.round((analysis.needs / analysis.total) * 100) : 0}% of total</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Wants</div>
            <div className="stat-value">{format(analysis.wants)}</div>
            <div className="stat-change">{analysis.total > 0 ? Math.round((analysis.wants / analysis.total) * 100) : 0}% of total</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Transactions</div>
            <div className="stat-value">{expenses.length}</div>
          </div>
        </div>
      )}

      <div className="grid-2 mb-6">
        {/* CHART */}
        <div className="card">
          <h4 style={{ marginBottom: 20 }}>By Category</h4>
          {donutData.length ? <DonutChart data={donutData} /> : <EmptyState title="No data" description="Add expenses to see your spending distribution." />}
        </div>
        {/* NEEDS vs WANTS */}
        <div className="card">
          <h4 style={{ marginBottom: 20 }}>Needs vs Wants</h4>
          {analysis && analysis.total > 0 ? (
            <>
              <div style={{ display: 'flex', gap: 4, height: 32, borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ width: `${(analysis.needs / analysis.total) * 100}%`, background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--white)', fontWeight: 600, minWidth: 40 }}>
                  {Math.round((analysis.needs / analysis.total) * 100)}%
                </div>
                <div style={{ flex: 1, background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--gray-700)', fontWeight: 600 }}>
                  {Math.round((analysis.wants / analysis.total) * 100)}%
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 12, height: 12, background: 'var(--black)', borderRadius: 2 }} /><span>Needs — {format(analysis.needs)}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 12, height: 12, background: 'var(--gray-200)', borderRadius: 2 }} /><span>Wants — {format(analysis.wants)}</span></div>
              </div>
              {analysis.wants / (analysis.total || 1) > 0.40 && (
                <div className="alert alert-warning mt-4" style={{ fontSize: '0.75rem' }}>
                  Wants exceed 40% of spending. Recommended: keep wants under 30%.
                </div>
              )}
            </>
          ) : <EmptyState title="No data" description="Classify your expenses to see the breakdown." />}
        </div>
      </div>

      {/* TABLE */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h4>All Transactions</h4>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'need', 'want'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
        ) : sorted.length === 0 ? (
          <EmptyState title="No expenses" description="Start tracking your spending to gain financial clarity." action={<button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>Add First Expense</button>} />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Classification</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead>
              <tbody>
                {sorted.map(exp => (
                  <tr key={exp.id}>
                    <td style={{ color: 'var(--gray-500)' }}>{new Date(exp.date).toLocaleDateString('en', { day: '2-digit', month: 'short' })}</td>
                    <td style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{exp.description || '—'}</td>
                    <td><span className="badge badge-default">{exp.subcategory}</span></td>
                    <td><span className={`badge badge-${exp.category === 'need' ? 'default' : 'warning'}`}>{exp.category === 'need' ? 'Need' : 'Want'}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{format(exp.amount)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(exp)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(exp.id)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditItem(null); }} title={editItem ? 'Edit Expense' : 'Add Expense'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setEditItem(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Add'}</button>
        </>}>
        <Field label="Amount">
          <div className="input-group">
            <span className="input-prefix">{format(0).replace('0', '').replace(',', '')}</span>
            <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} placeholder="0.00" />
          </div>
        </Field>
        <Field label="Description">
          <input className="input" type="text" value={form.description} onChange={set('description')} placeholder="What was this for?" />
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={form.date} onChange={set('date')} />
        </Field>
        <Field label="Category">
          <select className="select" value={form.subcategory} onChange={set('subcategory')}>
            {SUBCATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Classification — is this a need or a want?">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['need', 'Need', 'Essential — housing, food, transport, healthcare'], ['want', 'Want', 'Discretionary — dining out, entertainment, shopping']].map(([val, lbl, desc]) => (
              <div key={val} onClick={() => setForm(p => ({ ...p, category: val }))}
                style={{ padding: '12px 14px', border: `2px solid ${form.category === val ? 'var(--black)' : 'var(--gray-200)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{lbl}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', lineHeight: 1.4 }}>{desc}</div>
              </div>
            ))}
          </div>
        </Field>
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Expense" message="This expense will be permanently removed from your records." confirmLabel="Delete" danger />
    </Layout>
  );
}
