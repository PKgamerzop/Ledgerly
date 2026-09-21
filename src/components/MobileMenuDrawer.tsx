import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { NavigationTab } from '../types';
import {
  X,
  Cloud,
  RefreshCw,
  Coins,
  FileSpreadsheet,
  LogOut,
  PlusCircle,
  History,
  Users,
  AlertCircle,
  Download,
  Upload,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenReports: () => void;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onTabChange,
  onOpenReports,
}) => {
  const {
    user,
    logout,
    isDriveLinked,
    syncStatus,
    lastSyncTimestamp,
    syncError,
    syncNow,
    unlinkDrive,
    loginWithGoogle,
  } = useAuth();
  const { currency, setCurrency, currencyList } = useCurrency();
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  if (!isOpen) return null;

  const handleManualSync = async (forceDirection?: 'push' | 'pull') => {
    try {
      setIsSyncing(true);
      await syncNow(forceDirection, true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestorePrompt = () => {
    setConfirmDialog({
      open: true,
      title: 'Restore Vault from Drive Archive?',
      message:
        'This will synchronize your ledger with the latest vault archive stored in your private Google Drive file, reconciling records across all your devices.',
      action: async () => {
        await handleManualSync('pull');
        setConfirmDialog(null);
      },
    });
  };

  const handlePushPrompt = () => {
    setConfirmDialog({
      open: true,
      title: 'Back Up Ledger to Drive Archive?',
      message:
        'This will commit and seal your current local ledger entries into your Google Drive vault file for safe keeping and multi-device access.',
      action: async () => {
        await handleManualSync('push');
        setConfirmDialog(null);
      },
    });
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Never';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex font-serif">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1c0f07]/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-[#fdfaf3] h-full shadow-2xl flex flex-col z-10 overflow-y-auto border-l border-[#cfbeaa]">
        {/* Drawer Leather Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#24140a] via-[#331b0e] to-[#24140a] border-b border-[#522e1b] flex items-center justify-between text-[#fcf6ea]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1c0e06] border border-[#7a482b] flex items-center justify-center text-[#e2c792] shadow-inner">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="font-serif font-bold text-xs tracking-wider text-[#fdf6ea]">
                Bookkeeper's Cabinet
              </div>
              <div className="text-[10px] text-[#c9a875] font-serif">Folio &amp; Vault Registry</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cabinet"
            className="p-1.5 rounded-lg text-[#c9a875] hover:text-[#fdf6ea] hover:bg-[#422212] transition cursor-pointer border border-[#5a331c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account / User Card */}
        <div className="p-4 bg-[#f7f2e7] border-b border-[#dfd1bd]">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-10 h-10 rounded-xl border border-[#cfbeaa] object-cover shadow-2xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl border border-[#cfbeaa] bg-[#ffffff] text-[#522e1b] flex items-center justify-center font-bold text-base shadow-2xs font-serif">
                {user?.displayName ? user.displayName[0].toUpperCase() : 'B'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[#24140a] text-xs truncate font-serif">
                {user?.displayName || 'Registered Bookkeeper'}
              </div>
              <div className="text-[10px] text-[#7d6350] truncate font-serif">{user?.email || 'local.folio@account'}</div>
              {isDriveLinked ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#265c3b] bg-[#eff7f1] border border-[#b9deb4] px-2 py-0.5 rounded mt-1">
                  <ShieldCheck className="w-3 h-3" />
                  Drive Vault Synchronized
                </span>
              ) : user?.isDemo ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#91590d] bg-[#fef8ea] border border-[#edd7a4] px-2 py-0.5 rounded mt-1">
                  Specimen Ledger (Demo)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6e5340] bg-[#ffffff] border border-[#cfbeaa] px-2 py-0.5 rounded mt-1">
                  Local Journal Storage
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Options List */}
        <div className="p-4 space-y-4 flex-1 bg-[#fdfaf3]">
          {/* Google Drive Vault Sync Section */}
          <div className="bg-[#ffffff] border border-[#cfbeaa] rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#24140a] flex items-center gap-1.5 uppercase tracking-wider font-serif">
                <Cloud className="w-4 h-4 text-[#6b4028]" />
                Private Drive Vault
              </span>
              {isDriveLinked ? (
                <span className="bg-[#eff7f1] text-[#265c3b] border border-[#b9deb4] px-2 py-0.5 rounded text-[10px] font-bold">
                  {syncStatus === 'syncing' || isSyncing ? 'Syncing...' : 'Connected'}
                </span>
              ) : (
                <span className="text-[10px] text-[#8c7361] font-serif">[Not Linked]</span>
              )}
            </div>

            <p className="text-[11px] text-[#6e5340] leading-relaxed font-serif">
              Safeguards your transactions and counterparty debts across all personal devices via your private Google Drive vault file.
            </p>

            {isDriveLinked ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-[#6e5340] font-serif">
                  <span>Last Reconciled:</span>
                  <span className="font-bold text-[#265c3b]">{formatLastSync(lastSyncTimestamp)}</span>
                </div>

                {syncError && (
                  <div className="text-xs text-[#a63428] bg-[#fbf0ee] border border-[#e8b6b0] rounded-xl p-3 space-y-1 font-serif">
                    <div className="flex items-start gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-[#a63428] shrink-0 mt-0.5" />
                      <span>Synchronization Notice</span>
                    </div>
                    <p className="text-[11px] text-[#a63428] leading-snug break-words">{syncError}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleManualSync()}
                  disabled={isSyncing}
                  className="w-full py-2.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer btn-leather flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Reconciling Vault...' : 'Synchronize Now'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1 font-serif">
                  <button
                    type="button"
                    onClick={handlePushPrompt}
                    className="py-1.5 px-2 text-[11px] font-bold rounded-xl bg-[#f7f2e7] border border-[#cfbeaa] text-[#4a2c1d] hover:bg-[#ede3d1] flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                    title="Upload local state to Drive"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#6b4028]" />
                    <span>Back Up</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestorePrompt}
                    className="py-1.5 px-2 text-[11px] font-bold rounded-xl bg-[#f7f2e7] border border-[#cfbeaa] text-[#4a2c1d] hover:bg-[#ede3d1] flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                    title="Pull latest data from Drive to this device"
                  >
                    <Download className="w-3.5 h-3.5 text-[#265c3b]" />
                    <span>Restore</span>
                  </button>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      await unlinkDrive();
                    }}
                    className="text-[11px] text-[#8c7361] hover:text-[#a63428] cursor-pointer underline font-serif"
                  >
                    Disconnect Google Drive
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch (e: any) {
                    if (e?.code === 'auth/popup-closed-by-user') {
                      return;
                    }
                    console.warn('Google Drive link notice:', e?.message || e);
                  }
                }}
                className="w-full py-2.5 px-4 text-xs font-bold rounded-xl btn-leather flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Cloud className="w-4 h-4 text-[#e2c792]" />
                <span>Link Google Drive Vault</span>
              </button>
            )}
          </div>

          {/* Quick Currency Selector */}
          <div className="bg-[#ffffff] border border-[#cfbeaa] rounded-2xl p-4 shadow-2xs">
            <label className="block text-xs font-bold text-[#24140a] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-serif">
              <Coins className="w-3.5 h-3.5 text-[#6b4028]" />
              Book Currency
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {currencyList.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.symbol)}
                  className={`py-2 px-1 text-center rounded-xl transition cursor-pointer border font-serif ${
                    currency === c.symbol
                      ? 'bg-[#3d2011] text-[#fbf5eb] border-[#29140a] font-bold shadow-xs'
                      : 'bg-[#f7f2e7] text-[#522e1b] border-[#cfbeaa] hover:bg-[#ede3d1]'
                  }`}
                >
                  <div className="text-sm font-bold">{c.symbol}</div>
                  <div className="text-[9px] text-[#8c7361]">{c.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="bg-[#ffffff] border border-[#cfbeaa] rounded-2xl p-4 shadow-2xs">
            <label className="block text-xs font-bold text-[#24140a] uppercase tracking-wider mb-2.5 font-serif">
              Ledger Navigation
            </label>
            <div className="space-y-1 font-serif">
              <button
                type="button"
                onClick={() => {
                  onTabChange('add');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer border ${
                  currentTab === 'add'
                    ? 'bg-[#f7f2e7] text-[#24140a] border-[#cfbeaa] shadow-2xs'
                    : 'text-[#6e5340] border-transparent hover:bg-[#f7f2e7] hover:text-[#24140a]'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-[#6b4028]" />
                <span>Ink New Entry</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTabChange('history');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer border ${
                  currentTab === 'history'
                    ? 'bg-[#f7f2e7] text-[#24140a] border-[#cfbeaa] shadow-2xs'
                    : 'text-[#6e5340] border-transparent hover:bg-[#f7f2e7] hover:text-[#24140a]'
                }`}
              >
                <History className="w-4 h-4 text-[#6b4028]" />
                <span>General Folio Register</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTabChange('people');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer border ${
                  currentTab === 'people'
                    ? 'bg-[#f7f2e7] text-[#24140a] border-[#cfbeaa] shadow-2xs'
                    : 'text-[#6e5340] border-transparent hover:bg-[#f7f2e7] hover:text-[#24140a]'
                }`}
              >
                <Users className="w-4 h-4 text-[#6b4028]" />
                <span>Counterparties &amp; Debts</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReports();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl text-[#6e5340] hover:bg-[#f7f2e7] hover:text-[#24140a] transition cursor-pointer border border-transparent"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#265c3b]" />
                <span>Monthly Accounting Statement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer / Logout */}
        <div className="p-4 border-t border-[#cfbeaa] bg-[#f7f2e7]">
          <button
            type="button"
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="w-full py-2.5 px-4 text-xs font-bold text-[#a63428] hover:bg-[#fbf0ee] border border-[#e8b6b0] rounded-xl transition cursor-pointer flex items-center justify-center gap-2 font-serif"
          >
            <LogOut className="w-4 h-4" />
            <span>Close Ledger Session</span>
          </button>
        </div>
      </div>

      {/* Tactile Vintage Confirmation Dialog */}
      {confirmDialog && confirmDialog.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#1c0f07]/80 backdrop-blur-xs">
          <div className="bg-[#fdfaf3] rounded-2xl border border-[#cfbeaa] max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl relative">
            <h4 className="font-serif font-bold text-[#24140a] text-base border-b border-[#dfd1bd] pb-2">
              {confirmDialog.title}
            </h4>
            <p className="text-xs text-[#6e5340] leading-relaxed font-serif">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2.5 pt-2 font-serif">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 text-xs font-bold text-[#6e5340] hover:text-[#24140a] hover:bg-[#f4ede1] rounded-xl transition cursor-pointer border border-[#cfbeaa]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.action}
                className="px-4 py-2 text-xs font-bold rounded-xl btn-leather transition cursor-pointer"
              >
                Confirm &amp; Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
