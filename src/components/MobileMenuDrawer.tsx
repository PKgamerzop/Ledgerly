import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { NavigationTab } from '../types';
import {
  X,
  Cloud,
  CloudCheck,
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
    googleToken,
    syncStatus,
    lastSyncTimestamp,
    syncError,
    syncNow,
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
      await syncNow(forceDirection);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestorePrompt = () => {
    setConfirmDialog({
      open: true,
      title: 'Restore Data from Google Drive?',
      message:
        'This will replace your current local transactions with the latest backup stored in your private Google Drive vault file.',
      action: async () => {
        await handleManualSync('pull');
        setConfirmDialog(null);
      },
    });
  };

  const handlePushPrompt = () => {
    setConfirmDialog({
      open: true,
      title: 'Overwrite Google Drive Vault?',
      message:
        'This will upload your current local transactions to Google Drive, updating the vault file across all devices.',
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
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-4 bg-[#0c3744] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Logo"
              className="w-8 h-8 rounded-lg bg-white/10 p-0.5 object-contain"
            />
            <div>
              <div className="font-extrabold text-base tracking-wide">Menu & Options</div>
              <div className="text-[11px] text-teal-200">Personal Finance & Sync</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-teal-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-11 h-11 rounded-full object-cover border-2 border-teal-500"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-teal-800 text-teal-100 flex items-center justify-center font-bold text-base">
                {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-sm truncate">
                {user?.displayName || 'User'}
              </div>
              <div className="text-xs text-slate-500 truncate">{user?.email || 'Guest Mode'}</div>
              {googleToken ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full mt-1">
                  Google Drive Linked
                </span>
              ) : user?.isDemo ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full mt-1">
                  Demo Sandbox
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full mt-1">
                  Local Session
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Options List */}
        <div className="p-4 space-y-5 flex-1">
          {/* Google Drive Sync Section */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Cloud className="w-4 h-4 text-teal-700" />
                Google Drive Sync
              </span>
              {googleToken ? (
                <span className="text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                  {syncStatus === 'syncing' || isSyncing ? 'Syncing...' : 'Connected'}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 font-semibold">Not Linked</span>
              )}
            </div>

            <p className="text-xs text-teal-900/90 leading-relaxed">
              Syncs your spending and debts between your mobile phone and PC using your private
              Google Drive file.
            </p>

            {googleToken ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-teal-900">
                  <span>Last synced:</span>
                  <span className="font-bold">{formatLastSync(lastSyncTimestamp)}</span>
                </div>

                {syncError && (
                  <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-start gap-1.5 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>Drive Sync Notice</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-snug break-words">{syncError}</p>
                    {syncError.includes('drive.googleapis.com') && (
                      <a
                        href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=gen-lang-client-0847831288"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-1 font-bold text-teal-800 underline hover:text-teal-900 text-xs"
                      >
                        👉 Click here to Enable Google Drive API (1-click)
                      </a>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleManualSync()}
                  disabled={isSyncing}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync with Drive Now'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePushPrompt}
                    className="py-1.5 px-2 bg-white border border-teal-200 text-teal-900 rounded-lg text-[11px] font-semibold hover:bg-teal-100/50 flex items-center justify-center gap-1 cursor-pointer"
                    title="Upload current local state to Drive"
                  >
                    <Upload className="w-3 h-3 text-teal-600" />
                    <span>Backup</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestorePrompt}
                    className="py-1.5 px-2 bg-white border border-teal-200 text-teal-900 rounded-lg text-[11px] font-semibold hover:bg-teal-100/50 flex items-center justify-center gap-1 cursor-pointer"
                    title="Pull latest data from Drive to this device"
                  >
                    <Download className="w-3 h-3 text-teal-600" />
                    <span>Restore</span>
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
                className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-4 h-4"
                />
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>

          {/* Quick Currency Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-slate-500" />
              Active Currency
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {currencyList.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.symbol)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer ${
                    currency === c.symbol
                      ? 'bg-[#0c3744] text-white border-[#0c3744] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-sm">{c.symbol}</div>
                  <div className="text-[10px] opacity-80">{c.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Navigation
            </label>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  onTabChange('add');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  currentTab === 'add'
                    ? 'bg-slate-100 text-teal-800 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-teal-600" />
                <span>Add Spending</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTabChange('history');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  currentTab === 'history'
                    ? 'bg-slate-100 text-teal-800 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <History className="w-4 h-4 text-teal-600" />
                <span>Spending History</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTabChange('people');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  currentTab === 'people'
                    ? 'bg-slate-100 text-teal-800 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Debts & IOUs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReports();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                <span>Monthly Excel Statement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer / Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive Operations */}
      {confirmDialog && confirmDialog.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <h4 className="font-extrabold text-slate-900 text-base">{confirmDialog.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.action}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
