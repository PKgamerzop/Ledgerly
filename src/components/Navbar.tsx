import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { NavigationTab } from '../types';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import {
  PlusCircle,
  History,
  Users,
  FileSpreadsheet,
  LogOut,
  WifiOff,
  Cloud,
  RefreshCw,
  Menu,
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
  const {
    user,
    logout,
    isOffline,
    googleToken,
    syncStatus,
    syncNow,
  } = useAuth();
  const { currency, setCurrency, currencyList } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSyncClick = async () => {
    if (!googleToken) {
      setMobileMenuOpen(true);
      return;
    }
    try {
      setIsSyncing(true);
      await syncNow();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onTabChange('add')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          >
            <img
              src="/logo.svg"
              alt="Ledgerly Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-lg shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-wider text-[#0c3744] leading-tight">
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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
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
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-teal-700 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Excel Report
            </button>
          </nav>

          {/* Right Tools: Sync Button, Currency, Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Google Drive Sync Pill */}
            {googleToken ? (
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={isSyncing}
                title={syncStatus === 'error' ? 'Sync notice - click to see details' : 'Sync with Google Drive'}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                  syncStatus === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                    : 'bg-teal-50 border-teal-200/80 text-teal-800 hover:bg-teal-100'
                }`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    syncStatus === 'error' ? 'text-rose-600' : 'text-teal-600'
                  } ${isSyncing || syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">
                  {isSyncing || syncStatus === 'syncing'
                    ? 'Syncing...'
                    : syncStatus === 'error'
                    ? 'Sync Notice'
                    : 'Drive Synced'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-600 hover:text-teal-800 transition cursor-pointer"
                title="Connect Google Drive to sync with PC"
              >
                <Cloud className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] sm:text-xs">Link Drive</span>
              </button>
            )}

            {/* Offline indicator */}
            {isOffline && (
              <div
                className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded-full text-xs font-medium"
                title="Offline - Saving locally"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden lg:inline text-[11px]">Offline</span>
              </div>
            )}

            {/* Currency Selector (Desktop) */}
            <div className="hidden sm:flex items-center">
              <label htmlFor="currency-select" className="sr-only">
                Currency
              </label>
              <select
                id="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-bold text-xs py-1.5 px-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                title="Change Currency Symbol"
              >
                {currencyList.map((c) => (
                  <option key={c.code} value={c.symbol}>
                    {c.symbol} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop User profile & Logout */}
            {user && (
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
                <span
                  className="text-xs text-slate-500 max-w-[120px] truncate"
                  title={user.email || 'User'}
                >
                  {user.email || user.displayName || 'User'}
                </span>
                <button
                  id="btn-logout-desktop"
                  onClick={() => logout()}
                  className="flex items-center gap-1 p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs font-semibold cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Hamburger / Profile Toggle Button */}
            <button
              id="btn-mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex items-center gap-1.5 p-2 text-slate-700 hover:text-[#0c3744] hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200/60"
              aria-label="Open mobile menu"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full object-cover border border-teal-500"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-teal-800 text-teal-100 flex items-center justify-center font-bold text-xs">
                  {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu & Sync Drawer */}
      <MobileMenuDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentTab={currentTab}
        onTabChange={onTabChange}
        onOpenReports={onOpenReports}
      />
    </>
  );
};
