import React, { createContext, useContext, useState, useEffect } from 'react';

interface CurrencyContextType {
  currency: string;
  setCurrency: (curr: string) => void;
  currencyList: { symbol: string; label: string; code: string }[];
}

const CURRENCIES = [
  { symbol: '$', label: 'USD / Dollar ($)', code: 'USD' },
  { symbol: '€', label: 'EUR / Euro (€)', code: 'EUR' },
  { symbol: '£', label: 'GBP / British Pound (£)', code: 'GBP' },
  { symbol: '₹', label: 'INR / Indian Rupee (₹)', code: 'INR' },
  { symbol: '¥', label: 'JPY / Japanese Yen (¥)', code: 'JPY' },
  { symbol: 'C$', label: 'CAD / Canadian Dollar (C$)', code: 'CAD' },
  { symbol: 'A$', label: 'AUD / Australian Dollar (A$)', code: 'AUD' },
  { symbol: 'AED', label: 'AED / UAE Dirham', code: 'AED' },
];

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('ledgerly_currency') || '$';
  });

  const setCurrency = (curr: string) => {
    setCurrencyState(curr);
    localStorage.setItem('ledgerly_currency', curr);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, currencyList: CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
