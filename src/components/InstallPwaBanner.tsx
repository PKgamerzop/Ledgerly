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
    <div id="pwa-install-banner" className="bg-gradient-to-r from-teal-900 to-cyan-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-teal-500/20 rounded-lg text-teal-300">
          <Smartphone className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold text-white">Install Ledgerly App:</span>
          <span className="text-teal-200 ml-1 hidden sm:inline">Add to your home screen for full offline support and instant launch without browser badges.</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          id="btn-install-pwa"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 bg-teal-400 hover:bg-teal-300 text-teal-950 font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="p-1 text-teal-300 hover:text-white transition rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
