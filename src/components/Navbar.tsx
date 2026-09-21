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
   Terminal,
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
      <header className="sticky top-0 z-40 bg-[#2c1810] text-[#fbf5eb] border-b border-[#44281b] shadow-[0_4px_16px_rgba(44,24,16,0.3)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Name (Vintage Bookkeeper Style) */}
          <div
            onClick={() => onTabChange('add')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#805333] group-hover:border-[#d4af37] transition-all shadow-md flex items-center justify-center bg-[#28130a]">
              <img
                src="/logo.svg"
                alt="Ledgerly"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#fbf5eb]">
                  LEDGERLY
                </span>
                <span className="hidden sm:inline font-serif text-[10px] text-[#e0c48e] bg-[#3e2317] border border-[#6b422a] px-1.5 py-0.2 rounded font-medium tracking-wide">
                  FOLIO 1926
                </span>
              </div>
              <span className="text-[10px] text-[#cbb69e] hidden sm:flex items-center gap-1.5 font-serif italic">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c59b27]"></span>
                <span>The Bookkeeper&apos;s Accounting Journal</span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Vintage Leather & Paper Folio Tabs) */}
          <nav className="hidden md:flex items-center gap-1 bg-[#20100a] p-1 rounded-xl border border-[#44281b]">
            <button
              id="nav-tab-add"
              onClick={() => onTabChange('add')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-lg transition cursor-pointer font-serif ${
                currentTab === 'add'
                  ? 'bg-[#fcf9f2] text-[#2c1810] shadow-[0_2px_6px_rgba(0,0,0,0.3)] font-bold'
                  : 'text-[#d6c2a8] hover:text-[#ffffff] hover:bg-[#341b12]'
              }`}
            >
              <PlusCircle className={`w-3.5 h-3.5 ${currentTab === 'add' ? 'text-[#85261c]' : 'text-[#c59b27]'}`} />
              <span>Record Entry</span>
            </button>
            <button
              id="nav-tab-history"
              onClick={() => onTabChange('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-lg transition cursor-pointer font-serif ${
                currentTab === 'history'
                  ? 'bg-[#fcf9f2] text-[#2c1810] shadow-[0_2px_6px_rgba(0,0,0,0.3)] font-bold'
                  : 'text-[#d6c2a8] hover:text-[#ffffff] hover:bg-[#341b12]'
              }`}
            >
              <History className={`w-3.5 h-3.5 ${currentTab === 'history' ? 'text-[#2c1810]' : 'text-[#c59b27]'}`} />
              <span>General Ledger</span>
            </button>
            <button
              id="nav-tab-people"
              onClick={() => onTabChange('people')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-lg transition cursor-pointer font-serif ${
                currentTab === 'people'
                  ? 'bg-[#fcf9f2] text-[#2c1810] shadow-[0_2px_6px_rgba(0,0,0,0.3)] font-bold'
                  : 'text-[#d6c2a8] hover:text-[#ffffff] hover:bg-[#341b12]'
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${currentTab === 'people' ? 'text-[#2c1810]' : 'text-[#c59b27]'}`} />
              <span>Counterparties</span>
            </button>
            <button
              id="nav-tab-reports"
              onClick={onOpenReports}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-lg transition cursor-pointer font-serif text-[#d9bf8f] hover:text-[#fbf5eb] hover:bg-[#341b12]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#265c3b]" />
              <span>Monthly Statement</span>
            </button>
          </nav>

          {/* Right Tools: Sync Button, Currency, Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Google Drive Sync Status Pill */}
            {isDriveLinked ? (
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={isSyncing}
                title={
                  syncStatus === 'error'
                    ? 'Sync notice - click to see details'
                    : 'Google Drive Vault Linked - Tap to sync now'
                }
                className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition cursor-pointer font-serif ${
                  syncStatus === 'error'
                    ? 'bg-[#4a1c18] text-[#f7b7b2] border border-[#8a332a] hover:bg-[#5e231e]'
                    : 'bg-[#1b3d28] text-[#c4ebd1] border border-[#2b6340] hover:bg-[#255236] shadow-[0_1px_4px_rgba(0,0,0,0.2)]'
                }`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#c4ebd1] ${
                    isSyncing || syncStatus === 'syncing' ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden sm:inline">
                  {isSyncing || syncStatus === 'syncing'
                    ? 'Inking...'
                    : syncStatus === 'error'
                    ? 'Sync Notice'
                    : 'Vault Synced'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl font-serif font-medium bg-[#3a2016] border border-[#593421] text-[#e0c48e] hover:text-[#ffffff] hover:border-[#c59b27] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Connect Google Drive to sync your ledger across devices"
              >
                <Cloud className="w-3.5 h-3.5 text-[#c59b27]" />
                <span>Link Vault</span>
              </button>
            )}

            {/* Offline indicator */}
            {isOffline && (
              <div
                className="bg-[#4d3211] text-[#fae1a0] border border-[#8c5e23] px-2 py-1 rounded-lg text-xs font-serif font-semibold flex items-center gap-1"
                title="Offline - Logged to local desk storage"
              >
                <WifiOff className="w-3 h-3 text-[#fae1a0]" />
                <span className="hidden lg:inline">Desk Offline</span>
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
                className="font-serif text-xs font-bold py-1.5 px-2.5 bg-[#3a2016] border border-[#593421] rounded-xl cursor-pointer text-[#fbf5eb] hover:border-[#c59b27] focus:outline-none focus:ring-2 focus:ring-[#c59b27]/40 shadow-xs"
                title="Change Ledger Currency"
              >
                {currencyList.map((c) => (
                  <option key={c.code} value={c.symbol} className="bg-[#2c1810] text-[#fbf5eb]">
                    {c.symbol} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop User profile & Logout */}
            {user && (
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#44281b]">
                <span
                  className="font-serif text-xs text-[#d6c2a8] max-w-[120px] truncate"
                  title={user.email || 'Bookkeeper'}
                >
                  {user.displayName || user.email?.split('@')[0] || 'Bookkeeper'}
                </span>
                <button
                  id="btn-logout-desktop"
                  onClick={() => logout()}
                  className="p-1.5 rounded-lg text-[#d6c2a8] hover:text-[#f87171] hover:bg-[#3e1f18] transition cursor-pointer"
                  title="Close ledger / Sign out"
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
              className="md:hidden p-2 rounded-xl bg-[#3a2016] border border-[#593421] text-[#fbf5eb] hover:border-[#c59b27] flex items-center gap-1.5 text-xs font-serif"
              aria-label="Open ledger menu"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-5 h-5 rounded-full object-cover border border-[#6b422a]"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#522e1b] border border-[#854b2d] text-[#fbf5eb] flex items-center justify-center font-serif font-bold text-[10px]">
                  {user?.displayName ? user.displayName[0].toUpperCase() : 'B'}
                </div>
              )}
              <Menu className="w-4 h-4 text-[#e0c48e]" />
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
