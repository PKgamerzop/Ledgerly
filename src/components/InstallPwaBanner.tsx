import React, { useEffect, useState } from 'react';
import { Download, X, BookOpen, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setNotice('To install on your mobile device: tap Share (iOS Safari) or the browser menu (⋮) and select "Add to Home Screen".');
      setTimeout(() => setNotice(null), 6000);
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (isInstalled || dismissed) {
    return null;
  }

  return (
    <div id="pwa-install-banner" className="bg-[#2a160b] border-b border-[#522e1b] text-[#f7efe1] px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-xs font-serif shadow-md gap-2">
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <div className="p-1 bg-[#1a0c05] border border-[#6b3d22] rounded-lg text-[#e2c792] shrink-0">
          <BookOpen className="w-3.5 h-3.5" />
        </div>
        <div className="text-left">
          <span className="font-bold text-[#fcf6ea]">Keep Physical Accounting Offline:</span>
          <span className="text-[#d8c2aa] ml-1.5 hidden sm:inline">Add the Folio ledger to your home screen for distraction-free offline access.</span>
        </div>
      </div>

      {notice && (
        <div className="text-[11px] text-[#e2c792] bg-[#3a2012] px-2.5 py-1 rounded-lg border border-[#7a482b] text-center w-full sm:w-auto">
          {notice}
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          id="btn-install-pwa"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-[#fdfaf3] text-[#24140a] hover:bg-[#ede3d1] border border-[#d8c2aa] shadow-2xs transition cursor-pointer"
        >
          <Download className="w-3 h-3 text-[#6b4028]" />
          <span>Add to Home Screen</span>
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="p-1 rounded-lg text-[#c9a875] hover:text-[#fdf6ea] hover:bg-[#3d1f0f] transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
