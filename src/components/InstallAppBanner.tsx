import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import type { TranslationDictionary } from '../locales/translations';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppBannerProps {
  t: TranslationDictionary;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onClearPrompt: () => void;
  isStandalone: boolean;
  isIos: boolean;
  forceOpen: boolean;
  onCloseForce: () => void;
}

const DISMISS_KEY = 'kinvault_install_dismissed_at';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({
  t,
  deferredPrompt,
  onClearPrompt,
  isStandalone,
  isIos,
  forceOpen,
  onCloseForce,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return !Number.isNaN(ts) && Date.now() - ts < SEVEN_DAYS_MS;
  });

  const [iosDelayReady, setIosDelayReady] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Show gentle iOS banner shortly after load if not dismissed and not installed
  useEffect(() => {
    if (!isIos || isStandalone || dismissed) return;
    const timer = setTimeout(() => setIosDelayReady(true), 2200);
    return () => clearTimeout(timer);
  }, [isIos, isStandalone, dismissed]);

  if (isStandalone) return null;

  const shouldShowAutoBanner = !dismissed && (Boolean(deferredPrompt) || (isIos && iosDelayReady));
  const isVisible = forceOpen || shouldShowAutoBanner;

  if (!isVisible) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setShowInstructions(false);
    onCloseForce();
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          onClearPrompt();
          onCloseForce();
          setDismissed(true);
        }
      } catch (err) {
        console.warn('Install prompt failed:', err);
      }
      return;
    }

    // iOS or browser without native beforeinstallprompt: expand visual steps
    setShowInstructions(true);
  };

  // Detailed instructions sheet (when user clicks Install on iOS or opens manually without deferredPrompt)
  if (showInstructions || (forceOpen && !deferredPrompt)) {
    return (
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50"
        onClick={handleDismiss}
      >
        <div
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base shadow-sm shrink-0">
                KV
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{t.installAppTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t.installAppSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isIos ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <p>{t.installIosStep1}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <p>{t.installIosStep2}</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-700 font-medium">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <p>{t.installFallbackHint}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            {t.gotItBtn}
          </button>
        </div>
      </div>
    );
  }

  // Sleek Floating Bottom Install Notification Banner
  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-sm z-40">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl border border-slate-700/80 shadow-2xl p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white text-slate-900 flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
            KV
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs sm:text-sm leading-tight truncate">
              {t.installAppTitle}
            </h4>
            <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 mt-0.5">
              {t.installAppSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            {isIos && !deferredPrompt ? (
              <Share className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{t.installAppBtn}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
