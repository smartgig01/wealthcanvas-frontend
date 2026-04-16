import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const API = axios.create({ baseURL: BASE, timeout: 20000 });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('wc_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

API.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wc_token');
      localStorage.removeItem('wc_user');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || { error: err.message });
  }
);

export const auth = {
  register:       d       => API.post('/auth/register', d),
  login:          d       => API.post('/auth/login', d),
  sendOTP:        email   => API.post('/auth/send-otp', { email }),
  verifyOTP:      (e, o)  => API.post('/auth/verify-otp', { email: e, otp: o }),
  changePassword: d       => API.put('/auth/change-password', d),
  me:             ()      => API.get('/auth/me'),
};

export const finance = {
  getDashboard:        ()      => API.get('/dashboard'),
  getProjections:      ()      => API.get('/projections'),
  getTax:              ()      => API.get('/tax'),
  getScenarios:        ()      => API.get('/scenarios'),
  getNetWorthHistory:  ()      => API.get('/net-worth/history'),
  saveNetWorth:        d       => API.post('/net-worth', d),
  updateProfile:       d       => API.put('/profile', d),

  getExpenses:         ()      => API.get('/expenses'),
  addExpense:          d       => API.post('/expenses', d),
  updateExpense:       (id, d) => API.put(`/expenses/${id}`, d),
  deleteExpense:       id      => API.delete(`/expenses/${id}`),

  getSubscriptions:    ()      => API.get('/subscriptions'),
  addSubscription:     d       => API.post('/subscriptions', d),
  updateSubscription:  (id, d) => API.put(`/subscriptions/${id}`, d),
  deleteSubscription:  id      => API.delete(`/subscriptions/${id}`),

  // /investments/project must be called BEFORE any /investments/:id calls
  projectInvestments:  params  => API.get('/investments/project', { params }),
  getInvestments:      ()      => API.get('/investments'),
  addInvestment:       d       => API.post('/investments', d),
  updateInvestment:    (id, d) => API.put(`/investments/${id}`, d),
  deleteInvestment:    id      => API.delete(`/investments/${id}`),

  // /debts/strategy must be called BEFORE any /debts/:id calls
  getDebtStrategy:     extra   => API.get('/debts/strategy', { params: { extraPayment: extra || 0 } }),
  getDebts:            ()      => API.get('/debts'),
  addDebt:             d       => API.post('/debts', d),
  updateDebt:          (id, d) => API.put(`/debts/${id}`, d),
  deleteDebt:          id      => API.delete(`/debts/${id}`),

  getGoals:            ()      => API.get('/goals'),
  addGoal:             d       => API.post('/goals', d),
  updateGoal:          (id, d) => API.put(`/goals/${id}`, d),
  deleteGoal:          id      => API.delete(`/goals/${id}`),

  getGamification:     ()      => API.get('/gamification'),
  checkIn:             ()      => API.post('/check-in'),
  getNotifications:    ()      => API.get('/notifications'),
  markRead:            id      => API.put(`/notifications/${id}/read`),
  submitFeedback:      d       => API.post('/feedback', d),
  getReferral:         ()      => API.get('/referral'),
  getContactInfo:      ()      => API.get('/contact'),
};

export const payment = {
  getPlans:       country => API.get('/payment/plans', { params: { country } }),
  startTrial:     plan    => API.post('/payment/trial', { plan }),
  activatePlan:   d       => API.post('/payment/activate', d),
  cancelPlan:     ()      => API.post('/payment/cancel'),
  getStatus:      ()      => API.get('/payment/status'),
};

export const admin = {
  getUsers:              ()      => API.get('/admin/users'),
  updateUser:            (id, d) => API.put(`/admin/users/${id}`, d),
  deleteUser:            id      => API.delete(`/admin/users/${id}`),
  getAnalytics:          ()      => API.get('/admin/analytics'),
  getSubscriptionPlans:  ()      => API.get('/admin/subscription-plans'),
  updateSubscriptionPlans: d     => API.put('/admin/subscription-plans', d),
  getFlags:              ()      => API.get('/admin/flags'),
  updateFlags:           d       => API.put('/admin/flags', d),
  getExchangeRates:      ()      => API.get('/admin/exchange-rates'),
  updateExchangeRates:   d       => API.put('/admin/exchange-rates', d),
  getPaymentConfig:      ()      => API.get('/admin/payment-config'),
  updatePaymentConfig:   d       => API.put('/admin/payment-config', d),
  getContactInfo:        ()      => API.get('/admin/contact'),
  updateContactInfo:     d       => API.put('/admin/contact', d),
  getAIConfig:           ()      => API.get('/admin/ai-config'),
  updateAIConfig:        d       => API.put('/admin/ai-config', d),
  changePassword:        d       => API.put('/admin/change-password', d),
  getFeedback:           ()      => API.get('/admin/feedback'),
  getLogs:               ()      => API.get('/admin/logs'),
  getReferrals:          ()      => API.get('/admin/referrals'),
  sendNotification:      d       => API.post('/admin/notifications', d),
};

export default API;
