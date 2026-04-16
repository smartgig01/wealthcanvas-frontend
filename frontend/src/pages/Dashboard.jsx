import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { LineChart, DonutChart, HBar } from '../components/charts';
import { StatCard, ScoreRing, ProgressBar, SellTriggerBanner, LossBanner, EmptyState, Spinner } from '../components/ui';
import { finance as finAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function Dashboard() {
  const { user }    = useAuth();
  const { format }  = useApp();   // format() already uses correct currency from AppContext
  const navigate    = useNavigate();
  const [data,    setData]    = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      finAPI.getDashboard(),
      finAPI.getNetWorthHistory().catch(() => ({ history: [] })),
    ]).then(([dash, nwh]) => {
      setData(dash);
      setHistory(nwh.history || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Dashboard">
      <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Spinner size={32} /></div>
    </Layout>
  );

  if (!data) return (
    <Layout title="Dashboard">
      <div className="alert alert-warning">Unable to load dashboard. Please refresh the page.</div>
    </Layout>
  );

  const { loss, expenseAnalysis, subAnalysis, netWorthData, efAnalysis, disciplineScore, riskAssessment, sellTrigger, summary } = data;

  // Net worth timeline
  const nwLineData = history.slice(-12).map(h => ({
    name:  new Date(h.date).toLocaleDateString('en', { month:'short' }),
    value: h.netWorth,
  }));

  // Expense donut
  const expDonut = Object.entries(expenseAnalysis?.byCategory || {})
    .map(([k, v]) => ({ name: k, value: v }))
    .sort((a, b) => b.value - a.value).slice(0, 6);

  // Loss breakdown bars
  const lossBars = [
    { name:'Savings Gap',         value: loss?.breakdown?.savingsGap         || 0, label: format(loss?.breakdown?.savingsGap || 0) },
    { name:'Overspending',        value: loss?.breakdown?.overspending        || 0, label: format(loss?.breakdown?.overspending || 0) },
    { name:'Sub Waste',           value: loss?.breakdown?.subscriptionWaste   || 0, label: format(loss?.breakdown?.subscriptionWaste || 0) },
    { name:'Opportunity Loss',    value: loss?.breakdown?.opportunityLoss     || 0, label: format(loss?.breakdown?.opportunityLoss || 0) },
  ].filter(i => i.value > 0);

  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout
      title={`${greet}, ${user?.name?.split(' ')[0] || 'there'}`}
      subtitle={new Date().toLocaleDateString('en', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}>

      {/* SELL TRIGGER */}
      {sellTrigger && (
        <SellTriggerBanner trigger={sellTrigger} onUpgrade={() => navigate('/pricing')} />
      )}

      {/* LOSS BANNER — only for free plan users with detected loss */}
      {user?.plan === 'free' && (loss?.monthlyLoss || 0) > 100 && (
        <LossBanner
          monthly={format(loss.monthlyLoss)}
          yearly={format(loss.yearlyLoss)}
          onUpgrade={() => navigate('/pricing')} />
      )}

      {/* KPI GRID */}
      <div className="grid-4 mb-6">
        <StatCard label="Monthly Income"   value={format(summary?.income        || 0)} />
        <StatCard label="Monthly Expenses" value={format(summary?.monthlyBurn   || 0)}
          changeLabel={`${summary?.savingsRate || 0}% savings rate`} />
        <StatCard label="Net Worth"        value={format(netWorthData?.netWorth || 0)}
          change={netWorthData?.netWorth > 0 ? 1 : 0} />
        <StatCard label="Investments"      value={format(summary?.totalInvested || 0)} />
      </div>

      {/* ROW 1 */}
      <div className="grid-2 mb-6">
        {/* LOSS DETECTION */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <h4 style={{ marginBottom:2 }}>Loss Detection</h4>
              <p style={{ fontSize:'0.75rem' }}>Preventable financial loss this month</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:700, fontFamily:'var(--font-serif)',
                color: (loss?.monthlyLoss || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {format(loss?.monthlyLoss || 0)}
              </div>
              <div style={{ fontSize:'0.7rem', color:'var(--gray-500)' }}>per month</div>
            </div>
          </div>
          {lossBars.length > 0
            ? <HBar items={lossBars} />
            : <div style={{ textAlign:'center', padding:'20px 0', color:'var(--gray-400)', fontSize:'0.875rem' }}>No losses detected — great financial health.</div>}
          {user?.plan === 'free' && (
            <div style={{ marginTop:16, padding:'10px 14px', background:'var(--gray-50)', borderRadius:'var(--radius)', fontSize:'0.75rem', color:'var(--gray-500)', cursor:'pointer' }}
              onClick={() => navigate('/pricing')}>
              Upgrade to see full loss analysis and corrective actions →
            </div>
          )}
        </div>

        {/* DISCIPLINE SCORE */}
        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
          <h4 style={{ marginBottom:20, alignSelf:'flex-start' }}>Financial Discipline</h4>
          <ScoreRing score={disciplineScore?.score || 0} />
          <div style={{ marginTop:16 }}>
            <div style={{ fontWeight:700, fontSize:'1rem', marginBottom:4 }}>{disciplineScore?.level?.name || 'Beginner'}</div>
            <div style={{ fontSize:'0.8125rem', color:'var(--gray-500)', marginBottom:16 }}>{disciplineScore?.level?.description}</div>
          </div>
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(disciplineScore?.breakdown || {}).slice(0, 4).map(([k, v]) => (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:10, fontSize:'0.75rem' }}>
                <span style={{ width:80, textAlign:'right', color:'var(--gray-500)', textTransform:'capitalize' }}>{k}</span>
                <div style={{ flex:1 }}><ProgressBar value={v} max={25} /></div>
                <span style={{ width:30, color:'var(--gray-700)', fontWeight:500 }}>{Math.round(v)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h4>Net Worth Timeline</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/net-worth')}>Details →</button>
          </div>
          {nwLineData.length >= 2
            ? <LineChart data={nwLineData} height={180} />
            : <EmptyState title="No history yet"
                description="Record your net worth monthly to see your wealth timeline."
                action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/net-worth')}>Record Net Worth</button>} />}
        </div>

        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h4>Expense Breakdown</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>View All →</button>
          </div>
          {expDonut.length
            ? <DonutChart data={expDonut} />
            : <EmptyState title="No expenses logged"
                description="Start tracking expenses to see your spending breakdown."
                action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/expenses')}>Log Expense</button>} />}
        </div>
      </div>

      {/* ROW 3 */}
      <div className="grid-3 mb-6">
        {/* SUBSCRIPTIONS */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h4>Subscriptions</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/subscriptions')}>Manage →</button>
          </div>
          <div style={{ fontSize:'1.75rem', fontWeight:700, fontFamily:'var(--font-serif)', marginBottom:4 }}>
            {format(subAnalysis?.monthlyTotal || 0)}
            <span style={{ fontSize:'0.875rem', fontWeight:400, color:'var(--gray-500)' }}>/mo</span>
          </div>
          <div style={{ fontSize:'0.75rem', color:'var(--gray-500)', marginBottom:12 }}>
            {format(subAnalysis?.annualTotal || 0)} annually · {subAnalysis?.activeCount || 0} active
          </div>
          {(subAnalysis?.unusedCount || 0) > 0 && (
            <div className="alert alert-warning" style={{ fontSize:'0.75rem', padding:'8px 12px' }}>
              {subAnalysis.unusedCount} unused — save {format(subAnalysis.potentialSavings || 0)}/mo
            </div>
          )}
        </div>

        {/* EMERGENCY FUND */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h4>Emergency Fund</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/goals')}>Details →</button>
          </div>
          <div style={{ fontSize:'1.75rem', fontWeight:700, fontFamily:'var(--font-serif)', marginBottom:4 }}>
            {efAnalysis?.progress || 0}%
          </div>
          <div style={{ fontSize:'0.75rem', color:'var(--gray-500)', marginBottom:12 }}>
            Target: {format(efAnalysis?.target || 0)}
          </div>
          <ProgressBar value={efAnalysis?.progress || 0} max={100}
            variant={efAnalysis?.status === 'funded' ? 'success' : efAnalysis?.status === 'building' ? 'warning' : 'danger'} />
          <div style={{ fontSize:'0.75rem', color:'var(--gray-500)', marginTop:8 }}>{efAnalysis?.recommendation}</div>
        </div>

        {/* RISK */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h4>Risk Level</h4>
            <span className={`badge badge-${riskAssessment?.riskLevel === 'High' ? 'danger' : riskAssessment?.riskLevel === 'Medium' ? 'warning' : 'success'}`}>
              {riskAssessment?.riskLevel || 'Low'}
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(riskAssessment?.alerts || []).slice(0, 3).map((a, i) => (
              <div key={i} style={{ fontSize:'0.75rem', color:'var(--gray-600)', display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ color: a.severity === 'high' ? 'var(--danger)' : 'var(--warning)', flexShrink:0 }}>—</span>
                {a.message}
              </div>
            ))}
            {!(riskAssessment?.alerts?.length) && (
              <p style={{ fontSize:'0.8125rem', color:'var(--gray-500)' }}>No significant risks detected.</p>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop:12, paddingLeft:0 }} onClick={() => navigate('/risk')}>
            Full risk report →
          </button>
        </div>
      </div>

      {/* DEBT SUMMARY */}
      {(summary?.totalDebt || 0) > 0 && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <h4 style={{ marginBottom:4 }}>Active Debt</h4>
              <p style={{ fontSize:'0.8125rem' }}>Loan and credit obligations outstanding</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:700, fontFamily:'var(--font-serif)', color:'var(--danger)' }}>
                {format(summary.totalDebt)}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/debt')}>View Payoff Strategy →</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
