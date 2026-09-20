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
      <div className="relative ml-auto w-full max-w-xs sm:max-w-sm mc-panel h-full shadow-2xl flex flex-col z-10 overflow-y-auto p-0 border-r-0">
        {/* Drawer Header */}
        <div className="p-4 bg-[#1e1914] border-b-2 border-[#120f0c] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#120f0c] border-2 border-black flex items-center justify-center shadow-[inset_1px_1px_0_#2b241e,inset_-1px_-1px_0_#0a0806]">
              <img
                src="/logo.svg"
                alt="Logo"
                className="w-5 h-5 object-contain"
              />
            </div>
            <div>
              <div className="font-pixel text-[#ffd700] text-sm tracking-wide">Menu & Options</div>
              <div className="font-mc text-[11px] text-[#a0a0a0]">Personal Finance & Sync</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mc-button p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 bg-[#231e19] border-b-2 border-[#120f0c]">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-11 h-11 border-2 border-black object-cover"
              />
            ) : (
              <div className="w-11 h-11 border-2 border-black bg-[#120f0c] text-[#ffd700] flex items-center justify-center font-pixel text-base">
                {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-pixel text-[#ffffff] text-xs truncate">
                {user?.displayName || 'Steve'}
              </div>
              <div className="font-mc text-xs text-[#888888] truncate">{user?.email || 'Guest Mode'}</div>
              {isDriveLinked ? (
                <span className="inline-flex items-center gap-1 font-pixel text-[10px] text-[#55ff55] bg-[#1b3d1b] border border-black px-2 py-0.5 mt-1">
                  Drive Linked
                </span>
              ) : user?.isDemo ? (
                <span className="inline-flex items-center gap-1 font-pixel text-[10px] text-[#ffaa00] bg-[#3d2714] border border-black px-2 py-0.5 mt-1">
                  Demo Sandbox
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-pixel text-[10px] text-[#aaaaaa] bg-[#161310] border border-black px-2 py-0.5 mt-1">
                  Local Session
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Options List */}
        <div className="p-4 space-y-5 flex-1 bg-[#2b2520]">
          {/* Google Drive Sync Section */}
          <div className="mc-panel p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-[#ffd700] flex items-center gap-1.5 uppercase tracking-wider">
                <Cloud className="w-4 h-4 text-[#55ffff]" />
                Google Drive Sync
              </span>
              {isDriveLinked ? (
                <span className="mc-badge bg-[#1b3d1b] text-[#55ff55] px-2 py-0.5 text-[10px]">
                  {syncStatus === 'syncing' || isSyncing ? 'Syncing...' : 'Connected'}
                </span>
              ) : (
                <span className="font-mc text-[11px] text-[#888888]">Not Linked</span>
              )}
            </div>

            <p className="font-mc text-xs text-[#aaaaaa] leading-relaxed">
              Syncs your spending and debts between your mobile phone and PC using your private
              Google Drive file.
            </p>

            {isDriveLinked ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between font-mc text-[11px] text-[#ffffff]">
                  <span>Last synced:</span>
                  <span className="font-pixel text-[#55ff55]">{formatLastSync(lastSyncTimestamp)}</span>
                </div>

                {syncError && (
                  <div className="font-mc text-[11px] text-[#ff6b6b] bg-[#4a1414] border-2 border-black p-2.5 space-y-1">
                    <div className="flex items-start gap-1.5 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-[#ff4444] shrink-0 mt-0.5" />
                      <span className="font-pixel text-xs">Drive Sync Notice</span>
                    </div>
                    <p className="text-[11px] text-[#ffaaaa] leading-snug break-words">{syncError}</p>
                    {syncError.includes('drive.googleapis.com') && (
                      <a
                        href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=gen-lang-client-0847831288"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-1 font-bold text-[#55ffff] underline text-xs"
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
                  className="mc-button mc-button-emerald w-full py-2 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync with Drive Now'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePushPrompt}
                    className="mc-button py-1.5 px-2 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    title="Upload current local state to Drive"
                  >
                    <Upload className="w-3 h-3 text-[#55ffff]" />
                    <span>Backup</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestorePrompt}
                    className="mc-button py-1.5 px-2 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    title="Pull latest data from Drive to this device"
                  >
                    <Download className="w-3 h-3 text-[#55ffff]" />
                    <span>Restore</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      await unlinkDrive();
                    }}
                    className="font-mc text-[11px] text-[#888888] hover:text-[#ff6b6b] transition-colors cursor-pointer underline"
                  >
                    Disconnect Drive from this device
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
                className="mc-button w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
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
            <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#ffd700]" />
              Active Currency
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {currencyList.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.symbol)}
                  className={`py-2 px-1 text-center font-pixel text-xs transition cursor-pointer ${
                    currency === c.symbol
                      ? 'mc-button mc-button-emerald text-[#55ff55]'
                      : 'mc-button'
                  }`}
                >
                  <div className="text-sm">{c.symbol}</div>
                  <div className="font-mc text-[10px] opacity-80">{c.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-2">
              Navigation
            </label>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  onTabChange('add');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold transition font-pixel ${
                  currentTab === 'add'
                    ? 'mc-button mc-button-emerald text-[#ffffff]'
                    : 'mc-button text-[#aaaaaa]'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-[#55ff55]" />
                <span>Add Spending</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTabChange('history');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold transition font-pixel ${
                  currentTab === 'history'
                    ? 'mc-button mc-button-emerald text-[#ffffff]'
                    : 'mc-button text-[#aaaaaa]'
                }`}
              >
                <History className="w-4 h-4 text-[#55ffff]" />
                <span>Spending History</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTabChange('people');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold transition font-pixel ${
                  currentTab === 'people'
                    ? 'mc-button mc-button-emerald text-[#ffffff]'
                    : 'mc-button text-[#aaaaaa]'
                }`}
              >
                <Users className="w-4 h-4 text-[#ffd700]" />
                <span>Debts & IOUs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReports();
                }}
                className="mc-button w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-[#aaaaaa] transition cursor-pointer font-pixel"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#55ff55]" />
                <span>Monthly Excel Statement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer / Logout */}
        <div className="p-4 border-t-2 border-[#120f0c] bg-[#1e1914]">
          <button
            type="button"
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="mc-button mc-button-redstone w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive Operations */}
      {confirmDialog && confirmDialog.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
          <div className="mc-panel max-w-sm w-full p-5 space-y-3">
            <h4 className="font-pixel text-[#ffd700] text-base">{confirmDialog.title}</h4>
            <p className="font-mc text-xs text-[#aaaaaa] leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="mc-button px-3 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.action}
                className="mc-button mc-button-emerald px-4 py-2 text-xs font-bold"
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
