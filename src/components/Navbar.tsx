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
    isDriveLinked,
    syncStatus,
    syncNow,
  } = useAuth();
  const { currency, setCurrency, currencyList } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSyncClick = async () => {
    if (!isDriveLinked) {
      setMobileMenuOpen(true);
      return;
    }
    try {
      setIsSyncing(true);
      await syncNow(undefined, true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#25201b] border-b-4 border-[#100d0a] shadow-lg">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onTabChange('add')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 p-1 bg-[#171411] border-2 border-black shadow-[inset_1px_1px_0_#4a423a,inset_-1px_-1px_0_#080605] flex items-center justify-center group-hover:scale-105 transition-transform">
              <img
                src="/logo.svg"
                alt="Ledgerly Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-pixel text-base sm:text-lg text-[#55ff55] tracking-wider drop-shadow-[2px_2px_0px_#000]">
                LEDGERLY
              </span>
              <span className="font-mc text-[11px] text-[#ffaa00] uppercase font-bold tracking-wider hidden sm:block">
                ★ Spending & Debts
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Minecraft Hotbar Style Tabs) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#171411] p-1.5 border-2 border-black shadow-[inset_2px_2px_0_#0a0806,inset_-2px_-2px_0_#38322a]">
            <button
              id="nav-tab-add"
              onClick={() => onTabChange('add')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                currentTab === 'add'
                  ? 'mc-button mc-button-emerald'
                  : 'mc-button'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Spending</span>
            </button>
            <button
              id="nav-tab-history"
              onClick={() => onTabChange('history')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                currentTab === 'history'
                  ? 'mc-button mc-button-emerald'
                  : 'mc-button'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
            <button
              id="nav-tab-people"
              onClick={() => onTabChange('people')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                currentTab === 'people'
                  ? 'mc-button mc-button-emerald'
                  : 'mc-button'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>People (Debts)</span>
            </button>
            <button
              id="nav-tab-reports"
              onClick={onOpenReports}
              className="mc-button mc-button-diamond flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#55ffff]" />
              <span>Excel Report</span>
            </button>
          </nav>

          {/* Right Tools: Sync Button, Currency, Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Google Drive Sync Pill */}
            {isDriveLinked ? (
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={isSyncing}
                title={
                  syncStatus === 'error'
                    ? 'Sync notice - click to see details'
                    : 'Google Drive Linked - Tap to sync now'
                }
                className={`mc-button text-[11px] sm:text-xs px-2.5 py-1.5 flex items-center gap-1.5 ${
                  syncStatus === 'error'
                    ? 'mc-button-redstone'
                    : 'mc-button-diamond'
                }`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isSyncing || syncStatus === 'syncing' ? 'animate-spin' : ''
                  }`}
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
                className="mc-button text-[11px] sm:text-xs px-2.5 py-1.5 flex items-center gap-1 text-[#4de1f4]"
                title="Connect Google Drive to sync across devices"
              >
                <Cloud className="w-3.5 h-3.5 text-[#4de1f4]" />
                <span>Link Drive</span>
              </button>
            )}

            {/* Offline indicator */}
            {isOffline && (
              <div
                className="mc-badge bg-[#7a2a0d] text-[#ffaa00] px-2 py-1 text-[10px] border-2 border-black"
                title="Offline - Saving locally"
              >
                <WifiOff className="w-3.5 h-3.5 mr-1 text-[#ffaa00]" />
                <span className="hidden lg:inline">Offline</span>
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
                className="mc-input text-xs font-bold py-1.5 px-2.5 border-2 border-black cursor-pointer text-[#ffd700]"
                title="Change Currency Symbol"
              >
                {currencyList.map((c) => (
                  <option key={c.code} value={c.symbol} className="bg-[#25201b] text-white">
                    {c.symbol} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop User profile & Logout */}
            {user && (
              <div className="hidden md:flex items-center gap-2 pl-2 border-l-2 border-[#120e0a]">
                <span
                  className="font-mc text-xs text-[#a0a0a0] max-w-[120px] truncate"
                  title={user.email || 'User'}
                >
                  {user.displayName || user.email?.split('@')[0] || 'Player'}
                </span>
                <button
                  id="btn-logout-desktop"
                  onClick={() => logout()}
                  className="mc-button mc-button-redstone p-1.5 transition text-xs font-bold cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Mobile Hamburger / Profile Toggle Button */}
            <button
              id="btn-mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden mc-button p-2 flex items-center gap-1.5 text-xs font-bold"
              aria-label="Open mobile menu"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-5 h-5 border border-black object-cover"
                />
              ) : (
                <div className="w-5 h-5 bg-[#2e7d32] border border-black text-[#55ff55] flex items-center justify-center font-bold text-[10px]">
                  {user?.displayName ? user.displayName[0].toUpperCase() : 'P'}
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
