import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Network,
  Share2,
  Download,
  Shield,
  Lock,
  FolderTree,
  Search,
  LogOut,
  RefreshCw,
  UserCheck,
  Check,
  ShieldAlert,
  Menu,
  X,
  Smartphone,
} from 'lucide-react';

import type { Language, TranslationDictionary } from './locales/translations';
import { translations } from './locales/translations';
import type { TreeData, UserSession, Person, Household } from './types/family';
import {
  getSession,
  saveSession,
  saveOfflineTree,
  getOfflineTree,
  getAppLockPin,
  setAppLockPin,
} from './utils/offlineCache';
import { exportTreeToPdf } from './utils/pdfExport';

import { OnboardingView, type InitialInviteParams } from './components/OnboardingView';
import { TreeCanvas } from './components/TreeCanvas';
import { DirectoryView } from './components/DirectoryView';
import { MemberModal } from './components/MemberModal';
import { ShareModal } from './components/ShareModal';
import { BackupModal } from './components/BackupModal';
import { GlobalAdminModal } from './components/GlobalAdminModal';
import { InstallAppBanner, type BeforeInstallPromptEvent } from './components/InstallAppBanner';

function parseInviteFromUrl(): InitialInviteParams | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const inviteCode = (params.get('join') || params.get('code') || '').trim().toUpperCase();
  const pin = (hashParams.get('pin') || params.get('pin') || '').replace(/\D/g, '').slice(0, 6);
  const claimPersonId = (params.get('claim') || '').trim();
  if (!inviteCode && !pin && !claimPersonId) return null;
  return { inviteCode, pin, claimPersonId: claimPersonId || undefined };
}

export const App: React.FC = () => {
  // Language state
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('kinvault_lang') as Language) || 'en';
  });
  const t: TranslationDictionary = useMemo(() => translations[lang] || translations.en, [lang]);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('kinvault_lang', newLang);
  };

  // Device identifier
  const [deviceId] = useState<string>(() => {
    let id = localStorage.getItem('kinvault_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('kinvault_device_id', id);
    }
    return id;
  });

  // URL invite params (captured once on boot before URL cleanup)
  const [initialInvite] = useState<InitialInviteParams | null>(() => parseInviteFromUrl());
  const pendingClaimRef = useRef<string>(initialInvite?.claimPersonId || '');

  // Session state (discard cached session if opening a link to a different tree or targeted claim)
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = getSession();
    if (saved && initialInvite?.inviteCode && saved.inviteCode !== initialInvite.inviteCode) {
      return null;
    }
    if (
      saved &&
      initialInvite?.claimPersonId &&
      saved.activePersonId !== initialInvite.claimPersonId
    ) {
      return null;
    }
    return saved;
  });

  // Volatile in-memory PIN (never persisted to localStorage or DB)
  const [sessionPin, setSessionPin] = useState<string>(() => {
    const saved = getSession();
    if (
      saved &&
      initialInvite?.inviteCode === saved.inviteCode &&
      /^\d{6}$/.test(initialInvite.pin)
    ) {
      return initialInvite.pin;
    }
    return '';
  });

  // Clean ?join=... and #pin=... from address bar after boot
  useEffect(() => {
    if (initialInvite) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [initialInvite]);

  // Tree data state
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineSnapshot, setIsOfflineSnapshot] = useState<boolean>(false);

  // Active view tab & focus target on tree
  const [activeTab, setActiveTab] = useState<'tree' | 'directory'>('tree');
  const [focusPersonRequest, setFocusPersonRequest] = useState<{
    personId: string;
    nonce: number;
  } | null>(null);

  // App Lock PIN state
  const [lockPin, setLockPin] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [enteredUnlockPin, setEnteredUnlockPin] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [lockSettingsModalOpen, setLockSettingsModalOpen] = useState<boolean>(false);
  const [newLockPinInput, setNewLockPinInput] = useState<string>('');
  const [lockSuccessMsg, setLockSuccessMsg] = useState<string | null>(null);

  // Global Admin and live telemetry state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalStats, setGlobalStats] = useState<{ totalTrees: number; totalPersons: number } | null>(null);

  // PWA Install Prompt & Platform Detection
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [isInstalledStandalone, setIsInstalledStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });

  const isIosDevice = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return (
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setInstallGuideOpen(false);
      setIsInstalledStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredInstallPrompt) {
      try {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredInstallPrompt(null);
          setIsInstalledStandalone(true);
        }
      } catch {
        setInstallGuideOpen(true);
      }
    } else {
      setInstallGuideOpen(true);
    }
  };

  // Load telemetry stats on mount
  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setGlobalStats({ totalTrees: data.totalTrees, totalPersons: data.totalPersons });
        }
      })
      .catch((err) => console.warn('Could not fetch stats:', err));
  }, []);

  // Modals state
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareTargetPerson, setShareTargetPerson] = useState<Person | null>(null);
  const [backupModalOpen, setBackupModalOpen] = useState<boolean>(false);
  const [pdfExporting, setPdfExporting] = useState<boolean>(false);
  const [memberModalState, setMemberModalState] = useState<{
    isOpen: boolean;
    person?: Person;
    household?: Household;
    initialMode?: string;
  }>({ isOpen: false });

  // Cached canvas coordinates for PDF export
  const [nodeLayouts, setNodeLayouts] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(
    new Map()
  );

  // Check offline connectivity
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check App Lock on startup
  useEffect(() => {
    getAppLockPin().then((pin) => {
      if (pin) {
        setLockPin(pin);
        setIsLocked(true);
      }
    });
  }, []);

  // Fetch Tree Data
  const loadTreeData = useCallback(
    async (currentSession: UserSession, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const res = await fetch('/api/tree', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${currentSession.token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Could not fetch tree data from cloud');
        }

        const data = (await res.json()) as TreeData;

        // Auto-claim personalized invite target if unclaimed & not super_admin
        const autoClaimId = pendingClaimRef.current;
        if (autoClaimId && currentSession.activePersonId !== autoClaimId) {
          pendingClaimRef.current = '';
          const claimTarget = data.persons.find((p) => p.id === autoClaimId);
          if (claimTarget && !claimTarget.claimed_device_id && claimTarget.role !== 'super_admin') {
            try {
              const claimRes = await fetch('/api/mutate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${currentSession.token}`,
                },
                body: JSON.stringify({
                  action: 'claim_profile',
                  payload: { personId: autoClaimId },
                }),
              });
              if (claimRes.ok) {
                const updatedSession: UserSession = {
                  ...currentSession,
                  activePersonId: claimTarget.id,
                  role: claimTarget.role,
                };
                setSession(updatedSession);
                saveSession(updatedSession);
                data.persons = data.persons.map((p) =>
                  p.id === claimTarget.id
                    ? { ...p, claimed_device_id: currentSession.deviceId }
                    : p
                );
              }
            } catch (claimErr) {
              console.warn('Auto-claim skipped:', claimErr);
            }
          }
        }

        setTreeData(data);
        setIsOfflineSnapshot(false);

        // Cache snapshot in IndexedDB for offline access
        await saveOfflineTree(currentSession.treeId, data);

        // Update active profile role in session if found
        if (currentSession.activePersonId) {
          const me = data.persons.find((p) => p.id === currentSession.activePersonId);
          if (me && me.role !== currentSession.role) {
            const updatedSession = { ...currentSession, role: me.role };
            setSession(updatedSession);
            saveSession(updatedSession);
          }
        }
      } catch (err: unknown) {
        console.warn('Network fetch failed, attempting to load offline cache:', err);
        // Fallback to IndexedDB offline cache
        const cached = await getOfflineTree(currentSession.treeId);
        if (cached) {
          setTreeData(cached);
          setIsOfflineSnapshot(true);
        } else {
          setError('Unable to load family tree. Check your network connection.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Load tree when session is available
  useEffect(() => {
    if (session) {
      loadTreeData(session);
    }
  }, [session, loadTreeData]);

  // Session ready callback
  const handleSessionReady = (newSession: UserSession, enteredPin?: string) => {
    setSession(newSession);
    setSessionPin(enteredPin || '');
    saveSession(newSession);
  };

  // Sign out / disconnect tree
  const handleSignOut = () => {
    setSession(null);
    setSessionPin('');
    saveSession(null);
    setTreeData(null);
  };

  // Execute mutation
  const handleMutate = async (action: string, payload: any) => {
    if (!session) throw new Error('No active session');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    };
    if (session.activePersonId) {
      headers['X-Person-Id'] = session.activePersonId;
    }

    const res = await fetch('/api/mutate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, payload }),
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Operation failed');
    }

    // Refresh tree
    await loadTreeData(session, false);
  };

  // Export PDF Handler
  const handleExportPdf = async () => {
    if (!treeData) return;
    setPdfExporting(true);
    try {
      await exportTreeToPdf(
        treeData.tree,
        treeData.households,
        treeData.persons,
        treeData.relationships,
        nodeLayouts
      );
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPdfExporting(false);
    }
  };

  // Unlock PIN submission
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredUnlockPin === lockPin) {
      setIsLocked(false);
      setUnlockError(null);
      setEnteredUnlockPin('');
    } else {
      setUnlockError(t.pinMismatch);
      setEnteredUnlockPin('');
    }
  };

  // Save or Disable App Lock PIN
  const handleSaveLockPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newLockPinInput.trim().length === 4 && /^\d{4}$/.test(newLockPinInput.trim())) {
      await setAppLockPin(newLockPinInput.trim());
      setLockPin(newLockPinInput.trim());
      setLockSuccessMsg(t.pinSaved);
      setNewLockPinInput('');
      setTimeout(() => {
        setLockSettingsModalOpen(false);
        setLockSuccessMsg(null);
      }, 1200);
    }
  };

  const handleDisableLockPin = async () => {
    await setAppLockPin(null);
    setLockPin(null);
    setLockSuccessMsg('Device App Lock disabled.');
    setTimeout(() => {
      setLockSettingsModalOpen(false);
      setLockSuccessMsg(null);
    }, 1200);
  };

  // Determine active profile from tree data
  const activeProfile = useMemo(() => {
    if (!treeData || !session?.activePersonId) return null;
    return treeData.persons.find((p) => p.id === session.activePersonId) || null;
  }, [treeData, session]);

  // 1. APP LOCK PIN SCREEN
  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-800">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-800 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t.appLockTitle}</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">{t.enterPinToUnlock}</p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              autoFocus
              value={enteredUnlockPin}
              onChange={(e) => setEnteredUnlockPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center font-mono text-3xl tracking-[1em] py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />

            {unlockError && (
              <p className="text-xs text-rose-600 font-semibold">{unlockError}</p>
            )}

            <button
              type="submit"
              disabled={enteredUnlockPin.length !== 4}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {t.unlockBtn}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. ONBOARDING / JOIN SCREEN
  if (!session) {
    return (
      <>
        <OnboardingView
          onSessionReady={handleSessionReady}
          lang={lang}
          onLanguageChange={handleLanguageChange}
          deviceId={deviceId}
          onOpenAdmin={() => setAdminModalOpen(true)}
          initialInvite={initialInvite}
        />
        <GlobalAdminModal
          isOpen={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
          t={t}
        />
        <InstallAppBanner
          t={t}
          deferredPrompt={deferredInstallPrompt}
          onClearPrompt={() => setDeferredInstallPrompt(null)}
          isStandalone={isInstalledStandalone}
          isIos={isIosDevice}
          forceOpen={installGuideOpen}
          onCloseForce={() => setInstallGuideOpen(false)}
        />
      </>
    );
  }

  // 3. MAIN DASHBOARD VIEW
  return (
    <div className={activeTab === 'tree' ? 'h-dvh flex flex-col overflow-hidden bg-slate-50' : 'min-h-dvh flex flex-col bg-slate-50'}>
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2.5 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo & Tree Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 md:flex-initial">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              KV
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-sm sm:text-base truncate tracking-tight">
                  {treeData?.tree?.name || session.treeName}
                </h1>
                <span className="hidden sm:inline font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {session.inviteCode}
                </span>
              </div>

              {/* Active Profile Pill */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                {activeProfile ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{activeProfile.full_name}</span>
                    {activeProfile.role === 'super_admin' && (
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                        Admin
                      </span>
                    )}
                    {activeProfile.role === 'branch_admin' && (
                      <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 shrink-0">
                        Branch Admin
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-400 italic text-[11px] truncate">
                    Guest Device
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center Tabs (Desktop & Tablet) */}
          <div className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'tree'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>{t.treeTab}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t.directoryTab}</span>
            </button>
          </div>

          {/* Right Action Icons (Desktop) */}
          <div className="hidden md:flex items-center gap-1.5">
            {globalStats && (
              <button
                type="button"
                onClick={() => setAdminModalOpen(true)}
                title={t.liveStatsTooltip}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{globalStats.totalPersons} Members • {globalStats.totalTrees} Trees</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => loadTreeData(session, false)}
              disabled={refreshing}
              title="Refresh tree data"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              title={t.shareTab}
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={pdfExporting || !treeData}
              title={t.exportPdfBtn}
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${pdfExporting ? 'animate-bounce text-sky-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setBackupModalOpen(true)}
              title={t.backupTab}
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <Shield className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setLockSettingsModalOpen(true)}
              title={t.lockTab}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                lockPin ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Lock className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setAdminModalOpen(true)}
              title={t.globalAdminTitle}
              className="p-2 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>

            <div className="flex items-center bg-slate-100 rounded-xl p-1 text-[11px] font-bold">
              {(['en', 'mz', 'es', 'de'] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLanguageChange(l)}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    lang === l ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              title="Leave / Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Right Quick Actions (Mobile < md) */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => loadTreeData(session, false)}
              disabled={refreshing}
              title="Refresh"
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              title={t.shareTab}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menu"
              className="p-2 text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Secondary Tab Bar (< md) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 mt-2 md:hidden">
          <button
            type="button"
            onClick={() => {
              setActiveTab('tree');
              setMobileMenuOpen(false);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'tree' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span className="truncate">{t.treeTab}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('directory');
              setMobileMenuOpen(false);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'directory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="truncate">{t.directoryTab}</span>
          </button>
        </div>

        {/* Mobile Overflow Drawer (< md) */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 pt-3 pb-1 border-t border-slate-200 space-y-3">
            {/* Code & Live Stats */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                Code: {session.inviteCode}
              </span>
              {globalStats && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAdminModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{globalStats.totalPersons} Members • {globalStats.totalTrees} Trees</span>
                </button>
              )}
            </div>

            {/* Language Selector */}
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
              {(['en', 'mz', 'es', 'de'] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLanguageChange(l)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    lang === l ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleExportPdf();
                }}
                disabled={pdfExporting || !treeData}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="truncate">{t.exportPdfBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setBackupModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800"
              >
                <Shield className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="truncate">{t.backupTab}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLockSettingsModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800"
              >
                <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="truncate">{t.lockTab}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAdminModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900"
              >
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="truncate">{t.globalAdminTitle}</span>
              </button>

              {!isInstalledStandalone && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleTriggerInstall();
                  }}
                  className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>{t.installAppTitle}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Offline / Cached Notice Banner */}
        {(!isOnline || isOfflineSnapshot) && (
          <div className="mt-2 py-1.5 px-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-amber-600" />
              <span>{isOfflineSnapshot ? t.cachedOffline : t.offlineMode}</span>
            </div>
            <span className="text-[10px] text-amber-700 font-normal hidden sm:inline">
              IndexedDB local storage active
            </span>
          </div>
        )}
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 relative min-h-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-slate-50/80 backdrop-blur-xs z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600">{t.loading}</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center max-w-md mx-auto">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium mb-4">
              {error}
            </div>
            <button
              type="button"
              onClick={() => loadTreeData(session)}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : treeData ? (
          activeTab === 'tree' ? (
            <TreeCanvas
              tree={treeData.tree}
              households={treeData.households}
              persons={treeData.persons}
              relationships={treeData.relationships}
              t={t}
              activePersonId={session.activePersonId}
              userRole={session.role}
              deviceId={deviceId}
              focusPersonRequest={focusPersonRequest}
              onOpenMemberModal={(p, h, mode) => {
                const targetPerson = p || (h ? treeData?.persons.find((item) => item.household_id === h.id) : undefined);
                setMemberModalState({
                  isOpen: true,
                  person: targetPerson,
                  household: h,
                  initialMode: mode || (targetPerson ? 'edit_person' : 'edit_household'),
                });
              }}
              onUpdatePersonAvatar={async (targetPerson, avatarB64) => {
                await handleMutate('upsert_person', {
                  id: targetPerson.id,
                  household_id: targetPerson.household_id,
                  full_name: targetPerson.full_name,
                  nickname_or_maiden: targetPerson.nickname_or_maiden || '',
                  phone_e164: targetPerson.phone_e164 || '',
                  birth_year: targetPerson.birth_year || '',
                  death_year: targetPerson.death_year || '',
                  is_living: targetPerson.is_living,
                  avatar_b64: avatarB64,
                });
              }}
              onToggleSpouseStatus={async (relationshipId, status) => {
                await handleMutate('update_spouse_status', {
                  relationshipId,
                  status,
                });
              }}
              onInviteBranchMember={async (targetPerson) => {
                if (targetPerson.role === 'member') {
                  await handleMutate('set_role', {
                    targetPersonId: targetPerson.id,
                    role: 'branch_admin',
                  });
                }
                setShareTargetPerson(targetPerson);
                setShareModalOpen(true);
              }}
              onLayoutCalculated={(layouts) => setNodeLayouts(layouts)}
            />
          ) : (
            <DirectoryView
              households={treeData.households}
              persons={treeData.persons}
              t={t}
              activePersonId={session.activePersonId}
              userRole={session.role}
              onLocateOnTree={(person) => {
                setFocusPersonRequest((prev) => ({
                  personId: person.id,
                  nonce: (prev?.nonce ?? 0) + 1,
                }));
                setActiveTab('tree');
              }}
              onOpenMemberModal={(p, h, mode) => {
                const targetPerson = p || (h ? treeData?.persons.find((item) => item.household_id === h.id) : undefined);
                setMemberModalState({
                  isOpen: true,
                  person: targetPerson,
                  household: h,
                  initialMode: mode || 'edit_person',
                });
              }}
            />
          )
        ) : null}
      </main>

      {/* Member / Household Modal */}
      <MemberModal
        isOpen={memberModalState.isOpen}
        onClose={() => setMemberModalState({ isOpen: false })}
        person={memberModalState.person}
        household={memberModalState.household}
        initialMode={memberModalState.initialMode}
        allHouseholds={treeData?.households}
        allPersons={treeData?.persons}
        relationships={treeData?.relationships}
        t={t}
        activePersonId={session.activePersonId}
        userRole={session.role}
        deviceId={deviceId}
        onMutate={handleMutate}
        onProfileClaimed={(claimedPerson) => {
          const updatedSession: UserSession = {
            ...session,
            activePersonId: claimedPerson.id,
            role: claimedPerson.role,
          };
          setSession(updatedSession);
          saveSession(updatedSession);
        }}
      />

      {/* Share & Invite Modal */}
      {treeData && shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setShareTargetPerson(null);
          }}
          tree={treeData.tree}
          pin={sessionPin}
          onPinChange={setSessionPin}
          targetPerson={shareTargetPerson}
          t={t}
        />
      )}

      {/* Backup & Vault Modal */}
      {treeData && (
        <BackupModal
          isOpen={backupModalOpen}
          onClose={() => setBackupModalOpen(false)}
          data={treeData}
          userRole={session.role}
          t={t}
          token={session.token}
          activePersonId={session.activePersonId}
          onRestoreSuccess={async () => {
            await loadTreeData(session, true);
          }}
        />
      )}

      {/* App Lock Settings Modal */}
      {lockSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-slate-800" />
                <h3 className="font-bold text-slate-900 text-sm">{t.appLockTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setLockSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">{t.appLockSubtitle}</p>

            {lockSuccessMsg && (
              <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{lockSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveLockPin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.setLockPin}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  required
                  value={newLockPinInput}
                  onChange={(e) => setNewLockPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center font-mono text-xl tracking-widest px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={newLockPinInput.length !== 4}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Save Lock PIN
              </button>

              {lockPin && (
                <button
                  type="button"
                  onClick={handleDisableLockPin}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-rose-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t.disableLockPin}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Global Admin Dashboard Modal */}
      <GlobalAdminModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        t={t}
        onDataChanged={() => {
          if (session) {
            loadTreeData(session, false);
          }
        }}
      />

      {/* PWA Install Prompt Banner */}
      <InstallAppBanner
        t={t}
        deferredPrompt={deferredInstallPrompt}
        onClearPrompt={() => setDeferredInstallPrompt(null)}
        isStandalone={isInstalledStandalone}
        isIos={isIosDevice}
        forceOpen={installGuideOpen}
        onCloseForce={() => setInstallGuideOpen(false)}
      />
    </div>
  );
};

export default App;
