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
  Pencil,
  MoreVertical,
} from 'lucide-react';

import type { Language, TranslationDictionary } from './locales/translations';
import { translations } from './locales/translations';
import type { TreeData, UserSession, Person, Household, PresenceUser } from './types/family';
import {
  getSession,
  saveSession,
  saveOfflineTree,
  getOfflineTree,
  getAppLockPin,
  setAppLockPin,
} from './utils/offlineCache';

import { OnboardingView, type InitialInviteParams } from './components/OnboardingView';
import { TreeCanvas } from './components/TreeCanvas';
import { DirectoryView } from './components/DirectoryView';
import { MemberModal } from './components/MemberModal';
import { ShareModal } from './components/ShareModal';
import { BackupModal } from './components/BackupModal';
import { GlobalAdminModal } from './components/GlobalAdminModal';
import { InstallAppBanner, type BeforeInstallPromptEvent } from './components/InstallAppBanner';
import { UpdateBanner } from './components/UpdateBanner';

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

  // Tab-scoped session PIN (never persisted to localStorage or DB)
  const [sessionPin, setSessionPinState] = useState<string>(() => {
    const saved = getSession();
    if (
      saved &&
      initialInvite?.inviteCode === saved.inviteCode &&
      /^\d{6}$/.test(initialInvite.pin)
    ) {
      try {
        sessionStorage.setItem(`kinvault_pin_${saved.inviteCode}`, initialInvite.pin);
      } catch {
        // Ignore storage errors
      }
      return initialInvite.pin;
    }
    if (saved?.inviteCode) {
      try {
        const stored = sessionStorage.getItem(`kinvault_pin_${saved.inviteCode}`) || '';
        if (/^\d{6}$/.test(stored)) return stored;
      } catch {
        // Ignore storage errors
      }
    }
    return '';
  });

  const updateSessionPin = (nextPin: string, inviteCodeOverride?: string) => {
    const clean = nextPin.replace(/\D/g, '').slice(0, 6);
    setSessionPinState(clean);
    const code = inviteCodeOverride || session?.inviteCode;
    if (code) {
      try {
        if (/^\d{6}$/.test(clean)) {
          sessionStorage.setItem(`kinvault_pin_${code}`, clean);
        } else {
          sessionStorage.removeItem(`kinvault_pin_${code}`);
        }
      } catch {
        // Ignore storage errors
      }
    }
  };

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
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [presenceMenuOpen, setPresenceMenuOpen] = useState(false);
  const [activityToast, setActivityToast] = useState<string | null>(null);
  const [viewingPresenceCtx, setViewingPresenceCtx] = useState<{
    activeHouseholdId: string;
    activity: 'viewing' | 'editing' | 'adding';
    targetName: string;
  }>({ activeHouseholdId: '', activity: 'viewing', targetName: '' });
  const lastEventTsRef = useRef<number>(0);
  const ownMutationTsRef = useRef<number>(0);
  const activityToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didPromptIdentifyRef = useRef<boolean>(false);
  const [identifyModalOpen, setIdentifyModalOpen] = useState(false);
  const [visitorNameInput, setVisitorNameInput] = useState('');
  const [identifySearch, setIdentifySearch] = useState('');
  const [identifySaving, setIdentifySaving] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
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
        let resolvedSession = currentSession;

        // Auto-claim personalized invite target if unclaimed & not super_admin
        const autoClaimId = pendingClaimRef.current;
        if (autoClaimId && resolvedSession.activePersonId !== autoClaimId) {
          pendingClaimRef.current = '';
          const claimTarget = data.persons.find((p) => p.id === autoClaimId);
          if (claimTarget && !claimTarget.claimed_device_id && claimTarget.role !== 'super_admin') {
            try {
              const claimRes = await fetch('/api/mutate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${resolvedSession.token}`,
                },
                body: JSON.stringify({
                  action: 'claim_profile',
                  payload: { personId: autoClaimId },
                }),
              });
              if (claimRes.ok) {
                resolvedSession = {
                  ...resolvedSession,
                  activePersonId: claimTarget.id,
                  role: claimTarget.role,
                  guestName: undefined,
                };
                setSession(resolvedSession);
                saveSession(resolvedSession);
                data.persons = data.persons.map((p) =>
                  p.id === claimTarget.id
                    ? { ...p, claimed_device_id: resolvedSession.deviceId }
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
        await saveOfflineTree(resolvedSession.treeId, data);

        // Update active profile role and treeName in session if changed
        const me = resolvedSession.activePersonId
          ? data.persons.find((p) => p.id === resolvedSession.activePersonId)
          : undefined;
        const nextRole = me ? me.role : resolvedSession.role;
        const nextTreeName = data.tree?.name || resolvedSession.treeName;
        if (nextRole !== resolvedSession.role || nextTreeName !== resolvedSession.treeName) {
          resolvedSession = { ...resolvedSession, role: nextRole, treeName: nextTreeName };
          setSession(resolvedSession);
          saveSession(resolvedSession);
        }

        if (!resolvedSession.activePersonId && !resolvedSession.guestName && !didPromptIdentifyRef.current) {
          didPromptIdentifyRef.current = true;
          setVisitorNameInput('');
          setIdentifySearch('');
          setIdentifyModalOpen(true);
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
    updateSessionPin(enteredPin || '', newSession.inviteCode);
    saveSession(newSession);
  };

  // Sign out / disconnect tree
  const handleSignOut = () => {
    const oldSession = session;
    const oldCode = session?.inviteCode;
    if (oldSession) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${oldSession.token}`,
      };
      if (oldSession.activePersonId) headers['X-Person-Id'] = oldSession.activePersonId;
      fetch('/api/presence', {
        method: 'POST',
        headers,
        body: JSON.stringify({ leave: true }),
      }).catch(() => {});
    }
    didPromptIdentifyRef.current = false;
    setIdentifyModalOpen(false);
    setSession(null);
    updateSessionPin('', oldCode);
    saveSession(null);
    setTreeData(null);
    setPresenceUsers([]);
  };

  // Execute mutation
  const handleMutate = async (action: string, payload: any) => {
    if (!session) throw new Error('No active session');

    ownMutationTsRef.current = Date.now() + 2500;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    };
    if (session.activePersonId) {
      headers['X-Person-Id'] = session.activePersonId;
    } else if (session.guestName) {
      headers['X-Visitor-Name'] = encodeURIComponent(session.guestName);
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

  // Presence & Live Sync Heartbeat
  const effectivePresenceCtx = useMemo(() => {
    if (memberModalState.isOpen) {
      const hId =
        memberModalState.household?.id || memberModalState.person?.household_id || '';
      const mode = memberModalState.initialMode || 'edit_person';
      return {
        activeHouseholdId: hId,
        activity: mode.startsWith('add_') ? ('adding' as const) : ('editing' as const),
        targetName:
          memberModalState.person?.full_name || memberModalState.household?.family_name || '',
      };
    }
    return viewingPresenceCtx;
  }, [memberModalState, viewingPresenceCtx]);

  const hasTreeData = Boolean(treeData);

  useEffect(() => {
    if (!session || !isOnline || !hasTreeData) return;
    let cancelled = false;

    const sendHeartbeat = async () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        };
        if (session.activePersonId) headers['X-Person-Id'] = session.activePersonId;

        const res = await fetch('/api/presence', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...effectivePresenceCtx,
            guestName: session.guestName,
          }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          activeUsers?: PresenceUser[];
          lastEvent?: { lastMutatedAt: number; actorName: string; summary: string } | null;
        };
        if (Array.isArray(data.activeUsers)) {
          setPresenceUsers(data.activeUsers);
        }
        if (data.lastEvent?.lastMutatedAt) {
          const ts = data.lastEvent.lastMutatedAt;
          if (lastEventTsRef.current === 0) {
            lastEventTsRef.current = ts;
          } else if (ts > lastEventTsRef.current) {
            lastEventTsRef.current = ts;
            if (ts > ownMutationTsRef.current) {
              loadTreeData(session, false);
              setActivityToast(`${data.lastEvent.actorName} ${data.lastEvent.summary}`);
              if (activityToastTimerRef.current) clearTimeout(activityToastTimerRef.current);
              activityToastTimerRef.current = setTimeout(() => {
                setActivityToast(null);
              }, 4200);
            }
          }
        }
      } catch {
        // Ignore transient presence errors
      }
    };

    const initialTimer = setTimeout(sendHeartbeat, 400);
    const interval = setInterval(sendHeartbeat, 10_000);
    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [session, isOnline, hasTreeData, effectivePresenceCtx, loadTreeData]);

  useEffect(() => {
    return () => {
      if (activityToastTimerRef.current) clearTimeout(activityToastTimerRef.current);
    };
  }, []);

  const openRenameModal = () => {
    setRenameInput(treeData?.tree?.name || session?.treeName || '');
    setRenameError(null);
    setRenameModalOpen(true);
  };

  const handleRenameTreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renameInput.trim();
    if (!trimmed) {
      setRenameError(t.treeNameLabel + ' is required.');
      return;
    }
    setRenameSaving(true);
    setRenameError(null);
    try {
      await handleMutate('rename_tree', { name: trimmed });
      setRenameModalOpen(false);
    } catch (err: unknown) {
      setRenameError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setRenameSaving(false);
    }
  };

  // Export PDF Handler (dynamically loads jsPDF + html2canvas only on demand)
  const handleExportPdf = async () => {
    if (!treeData) return;
    setPdfExporting(true);
    try {
      const { exportTreeToPdf } = await import('./utils/pdfExport');
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

  const deferAutoReload = Boolean(
    memberModalState.isOpen ||
    identifyModalOpen ||
    renameModalOpen ||
    shareModalOpen ||
    backupModalOpen ||
    adminModalOpen ||
    lockSettingsModalOpen ||
    pdfExporting ||
    !isOnline
  );

  // 1. APP LOCK PIN SCREEN
  const content = isLocked ? (
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
  ) : !session ? (
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
  ) : (
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
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="font-extrabold text-slate-900 text-sm sm:text-base truncate tracking-tight">
                  {treeData?.tree?.name || session.treeName}
                </h1>
                {session.role === 'super_admin' && (
                  <button
                    type="button"
                    onClick={openRenameModal}
                    title={t.renameTreeBtn}
                    aria-label={t.renameTreeBtn}
                    className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
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
                  <button
                    type="button"
                    onClick={() => {
                      setVisitorNameInput(session.guestName || '');
                      setIdentifySearch('');
                      setIdentifyModalOpen(true);
                    }}
                    className={
                      session.guestName
                        ? 'inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 truncate cursor-pointer'
                        : 'inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 font-semibold text-[11px] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-full truncate cursor-pointer transition-colors'
                    }
                    title={t.identifyYourselfTitle}
                  >
                    {session.guestName ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate">{session.guestName}</span>
                        <Pencil className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      </>
                    ) : (
                      <>
                        <span>{t.setYourNameHint}</span>
                        <Pencil className="w-2.5 h-2.5 shrink-0" />
                      </>
                    )}
                  </button>
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
          <div className="hidden md:flex items-center gap-1.5 relative">
            {/* Live Online Presence Stack */}
            {presenceUsers.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPresenceMenuOpen((v) => !v)}
                  title={t.onlineUsersTitle}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-900 transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="flex -space-x-1.5">
                    {presenceUsers.slice(0, 3).map((u) => (
                      <span
                        key={u.deviceId}
                        className="w-5 h-5 rounded-full bg-slate-900 text-white border border-white flex items-center justify-center text-[9px] font-extrabold"
                      >
                        {u.displayName.slice(0, 1).toUpperCase()}
                      </span>
                    ))}
                  </span>
                  <span>{presenceUsers.length}</span>
                </button>
              </div>
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
              className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{t.shareTab}</span>
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

            <div className="relative">
              <button
                type="button"
                onClick={() => setDesktopMenuOpen((v) => !v)}
                title={t.moreSettingsBtn}
                aria-label={t.moreSettingsBtn}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  desktopMenuOpen
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {desktopMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setDesktopMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-40 text-xs font-semibold text-slate-700 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDesktopMenuOpen(false);
                        setBackupModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>{t.backupTab}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDesktopMenuOpen(false);
                        setLockSettingsModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>{t.lockTab}</span>
                      </span>
                      {lockPin && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                          ON
                        </span>
                      )}
                    </button>

                    {!isInstalledStandalone && (
                      <button
                        type="button"
                        onClick={() => {
                          setDesktopMenuOpen(false);
                          setInstallGuideOpen(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>{t.installAppBtn}</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setDesktopMenuOpen(false);
                        setAdminModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-amber-50 text-amber-800 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{t.globalAdminTitle}</span>
                      </span>
                      {globalStats && (
                        <span className="text-[10px] font-bold text-slate-500">
                          {globalStats.totalPersons}/{globalStats.totalTrees}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDesktopMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Quick Actions (Mobile < md) */}
          <div className="flex md:hidden items-center gap-1 shrink-0 relative">
            {presenceUsers.length > 0 && (
              <button
                type="button"
                onClick={() => setPresenceMenuOpen((v) => !v)}
                title={t.onlineUsersTitle}
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-900 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{presenceUsers.length}</span>
              </button>
            )}
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
        {/* Live Online Presence Popover (Shared Desktop & Mobile) */}
        {presenceMenuOpen && presenceUsers.length > 0 && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setPresenceMenuOpen(false)}
            />
            <div className="absolute right-3 sm:right-6 top-full mt-1.5 w-72 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-40">
              <p className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {t.onlineUsersTitle} ({presenceUsers.length})
              </p>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {presenceUsers.map((u) => {
                  const isBusy = u.activity === 'editing' || u.activity === 'adding';
                  const statusWord =
                    u.activity === 'editing'
                      ? t.presenceEditingLabel
                      : u.activity === 'adding'
                      ? t.presenceAddingLabel
                      : t.presenceViewingLabel;
                  const targetPerson = u.activeHouseholdId
                    ? treeData?.persons.find((p) => p.household_id === u.activeHouseholdId)
                    : undefined;
                  return (
                    <button
                      key={u.deviceId}
                      type="button"
                      onClick={() => {
                        setPresenceMenuOpen(false);
                        if (targetPerson) {
                          setActiveTab('tree');
                          setFocusPersonRequest((prev) => ({
                            personId: targetPerson.id,
                            nonce: (prev?.nonce ?? 0) + 1,
                          }));
                        }
                      }}
                      className="w-full px-2 py-2 flex items-center gap-2.5 hover:bg-slate-50 rounded-xl text-left transition-colors cursor-pointer"
                    >
                      <span
                        className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          isBusy ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                      >
                        {u.displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {u.displayName}
                          {u.deviceId === deviceId ? ' (You)' : ''}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {u.targetName
                            ? `${statusWord} • ${u.targetName}`
                            : t.presenceBrowsingTree}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </header>

        {/* Main Viewport Content */}
      <main className="flex-1 relative min-h-0">
        {activityToast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{activityToast}</span>
          </div>
        )}
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
              presenceUsers={presenceUsers}
              onPresenceContextChange={setViewingPresenceCtx}
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
              onRenameTree={session.role === 'super_admin' ? openRenameModal : undefined}
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
            guestName: undefined,
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
          onPinChange={(nextPin) => updateSessionPin(nextPin)}
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

      {/* Rename Tree Modal */}
      {renameModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => !renameSaving && setRenameModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-slate-800" />
                <h3 className="font-bold text-slate-900 text-sm">{t.renameTreeTitle}</h3>
              </div>
              <button
                type="button"
                disabled={renameSaving}
                onClick={() => setRenameModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">{t.renameTreeHint}</p>

            {renameError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                {renameError}
              </div>
            )}

            <form onSubmit={handleRenameTreeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.treeNameLabel}
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={80}
                  required
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder={t.treeNamePlaceholder}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={renameSaving}
                  onClick={() => setRenameModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={renameSaving || !renameInput.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-45 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {renameSaving ? t.loading : t.saveChanges}
                </button>
              </div>
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

      {/* Who Are You / Identify Visitor Modal */}
      {identifyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">{t.identifyYourselfTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIdentifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed shrink-0">
              {t.identifyYourselfSubtitle}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = visitorNameInput.trim().slice(0, 60);
                const updated: UserSession = {
                  ...session,
                  guestName: clean || undefined,
                };
                setSession(updated);
                saveSession(updated);
                setIdentifyModalOpen(false);
              }}
              className="space-y-3 shrink-0"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.enterVisitorNameLabel}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    maxLength={60}
                    value={visitorNameInput}
                    onChange={(e) => setVisitorNameInput(e.target.value)}
                    placeholder={t.visitorNamePlaceholder}
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={!visitorNameInput.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-45 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    {t.continueWithNameBtn}
                  </button>
                </div>
              </div>
            </form>

            {treeData && treeData.persons.some((p) => !p.claimed_device_id && p.role !== 'super_admin') && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex-1 min-h-0 flex flex-col">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 shrink-0">
                  {t.pickProfileOnTreeLabel}
                </p>
                <div className="relative mb-2.5 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={identifySearch}
                    onChange={(e) => setIdentifySearch(e.target.value)}
                    placeholder={t.searchYourNamePlaceholder}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="overflow-y-auto space-y-1.5 pr-1 max-h-48">
                  {treeData.persons
                    .filter((p) => {
                      if (p.claimed_device_id || p.role === 'super_admin') return false;
                      const q = identifySearch.trim().toLowerCase();
                      return !q || p.full_name.toLowerCase().includes(q);
                    })
                    .slice(0, 30)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={identifySaving}
                        onClick={async () => {
                          setIdentifySaving(true);
                          try {
                            await handleMutate('claim_profile', { personId: p.id });
                            const updated: UserSession = {
                              ...session,
                              activePersonId: p.id,
                              role: p.role,
                              guestName: undefined,
                            };
                            setSession(updated);
                            saveSession(updated);
                            setIdentifyModalOpen(false);
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Failed to claim profile');
                          } finally {
                            setIdentifySaving(false);
                          }
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.full_name}</p>
                          {(p.birth_year || p.death_year) && (
                            <p className="text-[10px] text-slate-500">
                              {p.birth_year || '?'} – {p.death_year || (p.is_living === 0 ? '?' : t.present)}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                          {t.claimMeBtn}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

  return (
    <>
      {content}
      <UpdateBanner t={t} deferAutoReload={deferAutoReload} />
    </>
  );
};

export default App;
