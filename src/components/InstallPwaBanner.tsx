import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
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
      // Guide mobile user how to install manually via browser menu if prompt not supported
      alert('To install on iOS / Chrome: Tap "Share" or the browser menu (⋮) and select "Add to Home Screen" to install Ledgerly without the browser watermark!');
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
    <div id="pwa-install-banner" className="bg-[#1e1914] border-b-2 border-black text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-[#120f0c] border border-black text-[#55ff55]">
          <Smartphone className="w-4 h-4" />
        </div>
        <div>
          <span className="font-pixel text-[#ffd700]">Install Ledgerly:</span>
          <span className="font-mc text-[#aaaaaa] ml-2 hidden sm:inline">Add to your home screen for full offline support and instant launch!</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          id="btn-install-pwa"
          onClick={handleInstallClick}
          className="mc-button mc-button-emerald flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="mc-button p-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
