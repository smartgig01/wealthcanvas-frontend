import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Pricing from './pages/Pricing';
import AdminPanel from './pages/AdminPanel';
import { Subscriptions, DebtPlanner, Projections, TaxEstimate } from './pages/FinancePages';
import { Settings, DisciplinePage, Goals, ReferPage } from './pages/AccountPages';
import { NetWorth, Scenarios, Investments, RiskAnalysis } from './pages/FinancePages2';
import { Spinner } from './components/ui';

/* Bridge: AuthProvider needs syncUserCurrency from AppProvider */
function AuthBridge({ children }) {
  const { syncUserCurrency } = useApp();
  return <AuthProvider syncUserCurrency={syncUserCurrency}>{children}</AuthProvider>;
}

function Protected({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function Guest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32} /></div>;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"            element={<Navigate to="/login" replace />} />
      <Route path="/login"       element={<Guest><LoginPage /></Guest>} />
      <Route path="/register"    element={<Guest><RegisterPage /></Guest>} />

      <Route path="/dashboard"    element={<Protected><Dashboard /></Protected>} />
      <Route path="/expenses"     element={<Protected><Expenses /></Protected>} />
      <Route path="/subscriptions"element={<Protected><Subscriptions /></Protected>} />
      <Route path="/debt"         element={<Protected><DebtPlanner /></Protected>} />
      <Route path="/projections"  element={<Protected><Projections /></Protected>} />
      <Route path="/tax"          element={<Protected><TaxEstimate /></Protected>} />
      <Route path="/net-worth"    element={<Protected><NetWorth /></Protected>} />
      <Route path="/scenarios"    element={<Protected><Scenarios /></Protected>} />
      <Route path="/investments"  element={<Protected><Investments /></Protected>} />
      <Route path="/risk"         element={<Protected><RiskAnalysis /></Protected>} />
      <Route path="/goals"        element={<Protected><Goals /></Protected>} />
      <Route path="/discipline"   element={<Protected><DisciplinePage /></Protected>} />
      <Route path="/pricing"      element={<Protected><Pricing /></Protected>} />
      <Route path="/settings"     element={<Protected><Settings /></Protected>} />
      <Route path="/refer"        element={<Protected><ReferPage /></Protected>} />

      <Route path="/admin"        element={<Protected adminOnly><AdminPanel /></Protected>} />
      <Route path="/admin/*"      element={<Protected adminOnly><AdminPanel /></Protected>} />

      <Route path="*"             element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AuthBridge>
          <AppRoutes />
        </AuthBridge>
      </AppProvider>
    </BrowserRouter>
  );
}
