import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

/* ── Currency config ────────────────────────────────────────── */
const CURRENCY_MAP = {
  IN: 'INR', US: 'USD', GB: 'GBP', AU: 'AUD',
  CA: 'CAD', SG: 'SGD', AE: 'AED', DE: 'EUR',
  FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  JP: 'JPY', CN: 'CNY', BR: 'BRL', ZA: 'ZAR',
  NG: 'NGN', PK: 'PKR', BD: 'BDT',
};

const SYMBOLS = {
  USD: '$', INR: '₹', EUR: '€', GBP: '£',
  AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'AED ',
  JPY: '¥', CHF: 'CHF ', CNY: '¥', BRL: 'R$',
  ZAR: 'R ', NGN: '₦', PKR: '₨', BDT: '৳',
};

const RATES = {
  USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79,
  AUD: 1.53, CAD: 1.36, SGD: 1.34, AED: 3.67,
  JPY: 149.5, CNY: 7.24, BRL: 4.97, ZAR: 18.6,
  NGN: 1580, PKR: 278, BDT: 110, CHF: 0.90,
};

/* Resolve currency from user object → country → localStorage → fallback */
function resolveCurrency(user) {
  if (user?.currency && SYMBOLS[user.currency]) return user.currency;
  if (user?.country && CURRENCY_MAP[user.country]) return CURRENCY_MAP[user.country];
  const stored = localStorage.getItem('wc_currency');
  if (stored && SYMBOLS[stored]) return stored;
  return 'USD';
}

/* Detect country from IP using free API — called once on first load */
async function detectCountryFromIP() {
  try {
    // ipapi.co is free, no key needed, 1000 req/day
    const res  = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    const cc   = data.country_code;
    if (cc && CURRENCY_MAP[cc]) {
      localStorage.setItem('wc_detected_country',  cc);
      localStorage.setItem('wc_detected_currency', CURRENCY_MAP[cc]);
      return { country: cc, currency: CURRENCY_MAP[cc] };
    }
  } catch { /* silent — IP detection is best-effort */ }
  return null;
}

export function AppProvider({ children }) {
  const [toasts,        setToasts]        = useState([]);
  const [currency,      _setCurrency]     = useState(() => {
    // Initialise from localStorage on first render (before user object is available)
    const stored = localStorage.getItem('wc_currency');
    return (stored && SYMBOLS[stored]) ? stored : 'USD';
  });
  const [exchangeRates, setExchangeRates] = useState(RATES);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [ipCountry,     setIpCountry]     = useState(null); // detected from IP

  /* Detect IP country once on first page load (no user needed) */
  useEffect(() => {
    const alreadyDetected = localStorage.getItem('wc_detected_country');
    if (alreadyDetected) {
      setIpCountry(alreadyDetected);
      // Only use IP detection if no user currency is stored yet
      if (!localStorage.getItem('wc_currency')) {
        const detectedCur = CURRENCY_MAP[alreadyDetected];
        if (detectedCur) _setCurrency(detectedCur);
      }
    } else {
      detectCountryFromIP().then(result => {
        if (result) {
          setIpCountry(result.country);
          // Only apply if no user currency override exists
          if (!localStorage.getItem('wc_currency')) {
            _setCurrency(result.currency);
          }
        }
      });
    }
  }, []);

  /* Public setCurrency — persists to localStorage */
  const setCurrency = useCallback((curr) => {
    if (!curr) return;
    const c = curr.toUpperCase();
    _setCurrency(c);
    localStorage.setItem('wc_currency', c);
  }, []);

  /* Called by AuthContext after login/me — syncs user currency */
  const syncUserCurrency = useCallback((user) => {
    const resolved = resolveCurrency(user);
    _setCurrency(resolved);
    localStorage.setItem('wc_currency', resolved);
  }, []);

  /* Toast notifications */
  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  /* Format a number with correct currency symbol */
  const format = useCallback((amount, curr) => {
    const c   = (curr || currency).toUpperCase();
    const sym = SYMBOLS[c] || (c + ' ');
    const abs = Math.abs(Math.round(amount || 0));
    // Use locale that groups with commas for INR, dots for others
    const locale = c === 'INR' ? 'en-IN' : 'en-US';
    return sym + abs.toLocaleString(locale);
  }, [currency]);

  /* Convert amount between currencies */
  const convert = useCallback((amount, from = 'USD', to = currency) => {
    if (from === to) return amount;
    const f = (from || '').toUpperCase();
    const t = (to   || '').toUpperCase();
    const usd = (amount || 0) / (exchangeRates[f] || 1);
    return Math.round(usd * (exchangeRates[t] || 1));
  }, [currency, exchangeRates]);

  /* Get symbol for a currency code */
  const getSymbol = useCallback((curr) => {
    return SYMBOLS[(curr || currency).toUpperCase()] || '$';
  }, [currency]);

  return (
    <AppContext.Provider value={{
      /* Currency */
      currency, setCurrency, syncUserCurrency,
      exchangeRates, setExchangeRates,
      format, convert, getSymbol,
      ipCountry,
      CURRENCY_MAP, SYMBOLS, RATES,

      /* UI */
      toasts, toast,
      sidebarOpen, setSidebarOpen,
    }}>
      {children}

      {/* TOAST CONTAINER */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380,
          pointerEvents: 'none',
        }}>
          {toasts.map(t => (
            <div key={t.id}
              className={`alert alert-${t.type === 'error' ? 'danger' : t.type} fade-in`}
              style={{
                boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-lg)',
                pointerEvents: 'auto', cursor: 'pointer',
              }}
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
