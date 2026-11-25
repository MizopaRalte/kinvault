import React, { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import type { TranslationDictionary } from '../locales/translations';

interface UpdateBannerProps {
  t: TranslationDictionary;
  /** When true (open modal, active form, PDF export, offline), defer auto-reload and prompt safely. */
  deferAutoReload: boolean;
}

const SW_CHECK_THROTTLE_MS = 15_000;
const SW_POLL_INTERVAL_MS = 60_000;
const RELOAD_COOLDOWN_MS = 15_000;
const RELOAD_TS_KEY = 'kinvault_sw_reloaded_at';

function hasActiveUserInputInDom(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.querySelector('dialog[open]')) return true;

  const activeEl = document.activeElement;
  if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) {
    return true;
  }

  return Array.from(document.querySelectorAll('input, textarea')).some((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    if (input instanceof HTMLInputElement && (input.type === 'hidden' || input.type === 'checkbox' || input.type === 'radio' || input.type === 'file')) {
      return false;
    }
    return input.value.trim().length > 0;
  });
}

function canSafelyReloadNow(deferAutoReload: boolean): boolean {
  if (deferAutoReload || hasActiveUserInputInDom()) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) || '0');
    if (last && Date.now() - last < RELOAD_COOLDOWN_MS) return false;
  } catch {
    // Ignore storage restriction (private browsing)
  }
  return true;
}

function triggerCleanReload() {
  try {
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
  } catch {
    // Ignore storage error
  }
  window.location.reload();
}

/**
 * Keeps browser tabs and installed standalone PWAs on the newest deployed build:
 * - Polls registration.update() on launch, visibility resume, pageshow, focus, online, and every 60s
 * - Auto-reloads seamlessly when a new Service Worker activates while the user is idle
 * - Falls back to a non-blocking update banner if the user has a modal/form open
 */
export const UpdateBanner: React.FC<UpdateBannerProps> = ({ t, deferAutoReload }) => {
  const [updateReady, setUpdateReady] = useState(false);
  const deferRef = useRef(deferAutoReload);
  const updateReadyRef = useRef(false);

  useEffect(() => {
    deferRef.current = deferAutoReload;
  }, [deferAutoReload]);

  useEffect(() => {
    updateReadyRef.current = updateReady;
  }, [updateReady]);

  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const lastCheckAtRef = useRef(0);

  const checkForUpdate = (reg?: ServiceWorkerRegistration) => {
    const target = reg || registrationRef.current;
    if (!target || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;

    if (target.waiting) {
      target.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    const now = Date.now();
    if (now - lastCheckAtRef.current < SW_CHECK_THROTTLE_MS) return;
    lastCheckAtRef.current = now;

    target.update().catch(() => {
      // Ignore transient network errors while checking SW
    });
  };

  useRegisterSW({
    immediate: true,
    onNeedReload() {
      if (canSafelyReloadNow(deferRef.current)) {
        triggerCleanReload();
      } else {
        setUpdateReady(true);
      }
    },
    onNeedRefresh() {
      if (canSafelyReloadNow(deferRef.current)) {
        triggerCleanReload();
      } else {
        setUpdateReady(true);
      }
    },
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration;
      checkForUpdate(registration);
    },
  });

  useEffect(() => {
    const handleResumeCheck = () => {
      if (document.visibilityState === 'visible') {
        if (updateReadyRef.current && canSafelyReloadNow(deferRef.current)) {
          triggerCleanReload();
          return;
        }
        checkForUpdate();
      }
    };

    const handlePageShow = () => {
      if (updateReadyRef.current && canSafelyReloadNow(deferRef.current)) {
        triggerCleanReload();
        return;
      }
      checkForUpdate();
    };
    const handleFocus = () => checkForUpdate();
    const handleOnline = () => checkForUpdate();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    }, SW_POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleResumeCheck);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleResumeCheck);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,1rem))] inset-x-3 sm:inset-x-auto sm:left-6 sm:max-w-sm z-50 flex items-center justify-between gap-3 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-sky-400 shrink-0"
          aria-hidden="true"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        <span className="text-xs sm:text-sm font-semibold leading-tight">
          {t.updateAvailableBanner}
        </span>
      </div>
      <button
        type="button"
        onClick={triggerCleanReload}
        className="shrink-0 min-h-9 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
      >
        {t.updateNowBtn}
      </button>
    </div>
  );
};
