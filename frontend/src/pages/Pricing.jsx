import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { payment as payAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/ui';

const FEATURES = {
  free:     ['Expense tracking (unlimited)', 'Subscription management', 'Basic loss detection', 'Emergency fund goal', 'Financial score'],
  lite:     ['Everything in Free', 'Full loss engine breakdown', 'Net worth tracking', 'Discipline score', 'Budget planning', 'Goals & milestones'],
  pro:      ['Everything in Lite', 'Debt planner (snowball & avalanche)', 'Tax estimation (all countries)', 'Wealth projection (5 & 10 year)', 'Risk analysis', 'Full scenario simulator'],
  ultimate: ['Everything in Pro', 'Investment engine with projections', 'Advanced scenario modeling', 'Risk-based allocation', 'Advanced Intelligence Engine access', 'Priority support'],
};

const TRUST_ITEMS = ['256-bit encryption', 'No data sharing', 'Cancel anytime', 'Instant access', '7-day trial on paid plans'];

export default function Pricing() {
  const { user, updateUser } = useAuth();
  const { toast } = useApp();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [country, setCountry] = useState(user?.country || 'US');
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1=confirm, 2=payment, 3=success
  const [payMethod, setPayMethod] = useState('paypal');

  useEffect(() => {
    payAPI.getPlans(country).then(res => setPlans(res.plans || [])).catch(() => {}).finally(() => setLoading(false));
  }, [country]);

  const currentPlan = user?.trialActive ? user.trialPlan : user?.plan || 'free';

  const handleSelect = (plan) => {
    if (plan.id === currentPlan) return;
    if (plan.id === 'free') return handleDowngrade();
    setCheckoutPlan(plan);
    setStep(1);
  };

  const handleDowngrade = async () => {
    if (!window.confirm('Downgrade to Free plan? You will lose access to paid features.')) return;
    try {
      await payAPI.cancelPlan();
      updateUser({ plan: 'free', trialActive: false });
      toast('Plan cancelled. You are now on the Free plan.', 'info');
    } catch { toast('Failed to cancel plan', 'error'); }
  };

  const handleTrialOrActivate = async () => {
    if (!checkoutPlan) return;
    setProcessing(true);
    try {
      if (!user?.trialUsed && user?.plan === 'free') {
        const res = await payAPI.startTrial(checkoutPlan.id);
        updateUser({ trialActive: true, trialPlan: checkoutPlan.id, trialEnds: res.trialEnds });
        setStep(3);
      } else {
        await payAPI.activatePlan({ plan: checkoutPlan.id, paymentMethod: payMethod, transactionId: 'simulated_' + Date.now() });
        updateUser({ plan: checkoutPlan.id, trialActive: false });
        setStep(3);
      }
    } catch { toast('Payment processing failed. Please try again.', 'error'); }
    finally { setProcessing(false); }
  };

  const getPlanPrice = (plan) => {
    const sym = country === 'IN' ? '₹' : '$';
    return plan.price === 0 ? 'Free' : `${sym}${plan.price}/mo`;
  };

  if (loading) return <Layout title="Plans & Pricing"><div style={{ textAlign: 'center', padding: 80 }}>Loading...</div></Layout>;

  return (
    <Layout title="Plans & Pricing" subtitle="Choose the level of financial intelligence you need">

      {/* HEADLINE */}
      <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 48px' }}>
        <h2 style={{ marginBottom: 12 }}>Complete financial intelligence,<br/>at every level</h2>
        <p>From basic expense tracking to advanced wealth projection — select what your financial journey needs today.</p>
      </div>

      {/* COUNTRY TOGGLE */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 40 }}>
        {[['US', 'Global (USD)'], ['IN', 'India (INR)']].map(([c, l]) => (
          <button key={c} className={`btn ${country === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCountry(c)}>{l}</button>
        ))}
      </div>

      {/* PLAN GRID */}
      <div className="grid-4 mb-6" style={{ maxWidth: 1100, margin: '0 auto 48px' }}>
        {plans.map(plan => {
          const isCurrent = currentPlan === plan.id;
          const isUpgrade = ['free', 'lite', 'pro'].indexOf(currentPlan) < ['free', 'lite', 'pro', 'ultimate'].indexOf(plan.id);
          return (
            <div key={plan.id} className={`plan-card ${plan.popular ? 'featured' : ''}`} style={{ position: 'relative' }}>
              {plan.popular && <div className="plan-badge-popular">Most Popular</div>}
              {plan.id === 'ultimate' && !plan.popular && (
                <div className="plan-badge-popular" style={{ background: 'var(--gray-700)' }}>Complete System</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-500)', fontWeight: 600, marginBottom: 8 }}>{plan.label}</div>
                <div className="plan-price">{getPlanPrice(plan)}</div>
              </div>
              <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(FEATURES[plan.id] || []).map((f, i) => (
                  <div key={i} className="plan-feature">
                    <span className="check">—</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button
                className={`btn btn-full ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => handleSelect(plan)}
                disabled={isCurrent}
              >
                {isCurrent ? 'Current Plan' : plan.price === 0 ? 'Downgrade to Free' : (!user?.trialUsed && user?.plan === 'free' ? 'Start 7-Day Trial' : isUpgrade ? 'Upgrade' : 'Switch Plan')}
              </button>
            </div>
          );
        })}
      </div>

      {/* VALUE PROOF */}
      <div className="card mb-6" style={{ background: 'var(--gray-50)', border: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, textAlign: 'center' }}>
          {[['Average monthly loss detected', country === 'IN' ? '₹12,400' : '$148'],
            ['Average savings rate improvement', '14%'],
            ['Average debt payoff acceleration', '8 months faster']].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, marginBottom: 4 }}>{v}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TRUST */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 48 }}>
        {TRUST_ITEMS.map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
            <span style={{ fontSize: '0.625rem' }}>—</span> {t}
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h3 style={{ textAlign: 'center', marginBottom: 24, fontFamily: 'var(--font-serif)' }}>Common Questions</h3>
        {[['Can I try before paying?', 'Yes. New users get a 7-day free trial on any paid plan. Card required, cancel before trial ends and you will not be charged.'],
          ['Can I switch plans?', 'Yes. Upgrade or downgrade at any time. Changes apply immediately. Downgrades take effect at end of billing cycle.'],
          ['Is my financial data secure?', 'All data is encrypted in transit and at rest. We never sell data to third parties.'],
          ['What payment methods are accepted?', 'PayPal and major credit/debit cards via Payhip. Both are configured by your account administrator.']].map(([q, a]) => (
          <div key={q} style={{ padding: '16px 0', borderBottom: '1px solid var(--gray-200)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>{q}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', lineHeight: 1.6 }}>{a}</div>
          </div>
        ))}
      </div>

      {/* CHECKOUT MODAL */}
      <Modal open={!!checkoutPlan && step < 3} onClose={() => { setCheckoutPlan(null); setStep(1); }} title={step === 1 ? 'Confirm Plan' : 'Complete Payment'} size="sm">
        {step === 1 && checkoutPlan && (
          <div>
            {/* VALUE RECAP */}
            <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{checkoutPlan.label} Plan — {getPlanPrice(checkoutPlan)}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginBottom: 12 }}>You will gain access to:</div>
              {(FEATURES[checkoutPlan.id] || []).slice(0, 4).map((f, i) => (
                <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', marginBottom: 4 }}>— {f}</div>
              ))}
            </div>
            {/* LOSS REMINDER */}
            {user?.plan === 'free' && (
              <div className="alert alert-black" style={{ marginBottom: 20, fontSize: '0.8125rem' }}>
                Our analysis detected financial losses you may be experiencing. This plan includes the full detection and correction engine.
              </div>
            )}
            {/* TRUST */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {['Cancel anytime', '7-day trial', 'Secure payment', 'Instant access'].map(t => (
                <span key={t} className="badge badge-default">{t}</span>
              ))}
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={() => !user?.trialUsed && user?.plan === 'free' ? handleTrialOrActivate() : setStep(2)} disabled={processing}>
              {!user?.trialUsed && user?.plan === 'free' ? 'Start Free Trial' : 'Continue to Payment'}
            </button>
          </div>
        )}

        {step === 2 && checkoutPlan && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div className="form-label" style={{ marginBottom: 10 }}>Payment Method</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['paypal', 'PayPal'], ['card', 'Credit / Debit Card (Payhip)']].map(([id, label]) => (
                  <div key={id} onClick={() => setPayMethod(id)}
                    style={{ padding: '12px 14px', border: `2px solid ${payMethod === id ? 'var(--black)' : 'var(--gray-200)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'border-color 0.15s' }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 20, fontSize: '0.75rem', color: 'var(--gray-500)', lineHeight: 1.5 }}>
              In a production environment, this step would open a secure PayPal or Payhip payment window. Configure payment credentials in the Admin panel.
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleTrialOrActivate} disabled={processing}>
              {processing ? 'Processing...' : `Pay ${getPlanPrice(checkoutPlan)}`}
            </button>
          </div>
        )}
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal open={step === 3} onClose={() => { setCheckoutPlan(null); setStep(1); navigate('/dashboard'); }} title="" size="sm">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 20 }}>—</div>
          <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>Access Activated</h3>
          <p style={{ color: 'var(--gray-500)', marginBottom: 28, fontSize: '0.875rem' }}>
            Your {checkoutPlan?.label} plan is now active. All features are immediately available.
          </p>
          <button className="btn btn-primary btn-full" onClick={() => { setCheckoutPlan(null); setStep(1); navigate('/dashboard'); }}>
            Open Dashboard
          </button>
        </div>
      </Modal>
    </Layout>
  );
}
