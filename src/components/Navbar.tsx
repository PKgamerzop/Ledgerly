import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { NavigationTab } from '../types';
import {
  PlusCircle,
  History,
  Users,
  FileSpreadsheet,
  LogOut,
  WifiOff,
  Wifi,
  Coins,
} from 'lucide-react';

interface NavbarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenReports: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenReports,
}) => {
  const { user, logout, isOffline } = useAuth();
  const { currency, setCurrency, currencyList } = useCurrency();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div 
          onClick={() => onTabChange('add')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <img
            src="/logo.svg"
            alt="Ledgerly Logo"
            className="w-9 h-9 object-contain rounded-lg shadow-xs group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-wider text-[#0c3744] leading-tight">
              LEDGERLY
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-teal-600 hidden sm:block">
              Spending & Debts
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          <button
            id="nav-tab-add"
            onClick={() => onTabChange('add')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
              currentTab === 'add'
                ? 'bg-[#0c3744] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Add Spending
          </button>
          <button
            id="nav-tab-history"
            onClick={() => onTabChange('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
              currentTab === 'history'
                ? 'bg-[#0c3744] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            id="nav-tab-people"
            onClick={() => onTabChange('people')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
              currentTab === 'people'
                ? 'bg-[#0c3744] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            People (Debts)
          </button>
          <button
            id="nav-tab-reports"
            onClick={onOpenReports}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-teal-700 hover:bg-slate-200/60 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            Excel Report
          </button>
        </nav>

        {/* Right Tools: Currency, Offline Status, User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Offline/Online Status Indicator */}
          {isOffline ? (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-full text-xs font-medium" title="Operating offline. All entries will sync once online.">
              <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="hidden lg:inline">Offline (Cached)</span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-1 text-xs text-teal-700 bg-teal-50 border border-teal-200/70 px-2 py-0.5 rounded-full" title="Connected to Cloud Firestore">
              <Wifi className="w-3 h-3 text-teal-600" />
              <span>Cloud Sync</span>
            </div>
          )}

          {/* Currency Selector */}
          <div className="relative flex items-center">
            <label htmlFor="currency-select" className="sr-only">Currency</label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-bold text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              title="Change Currency Symbol"
            >
              {currencyList.map((c) => (
                <option key={c.code} value={c.symbol}>
                  {c.symbol} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* User Email & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
              <span className="hidden xl:inline text-xs text-slate-500 max-w-[140px] truncate" title={user.email || 'User'}>
                {user.email || 'Anonymous'}
              </span>
              <button
                id="btn-logout"
                onClick={() => logout()}
                className="flex items-center gap-1 p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs font-semibold cursor-pointer"
                title="Sign out of persistent session"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
