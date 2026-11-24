import React, { useState } from 'react';
import { KeyRound, PlusCircle, LogIn, Globe, Shield, ShieldAlert, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import type { Language, TranslationDictionary } from '../locales/translations';
import { translations } from '../locales/translations';
import type { UserSession } from '../types/family';
import { RecoveryModal } from './RecoveryModal';

interface OnboardingViewProps {
  onSessionReady: (session: UserSession) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  deviceId: string;
  onOpenAdmin?: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onSessionReady,
  lang,
  onLanguageChange,
  deviceId,
  onOpenAdmin,
}) => {
  const t: TranslationDictionary = translations[lang] || translations.en;
  const [mode, setMode] = useState<'create' | 'join'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('join') || params.get('code') ? 'join' : 'create';
  });

  // Create form state
  const [treeName, setTreeName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [createPin, setCreatePin] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [branchColor, setBranchColor] = useState('#0F172A');

  // Join form state
  const [inviteCode, setInviteCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('join') || params.get('code') || '').trim().toUpperCase();
  });
  const [joinPin, setJoinPin] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PUK recovery and creation notice states
  const [createdPukData, setCreatedPukData] = useState<{
    pukCode: string;
    session: UserSession;
  } | null>(null);
  const [copiedPuk, setCopiedPuk] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);



  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!treeName.trim() || treeName.trim().length < 2) {
      setError(t.treeNameLabel + ' is required (min 2 chars).');
      return;
    }
    if (!creatorName.trim()) {
      setError(t.creatorNameLabel + ' is required.');
      return;
    }
    if (!/^\d{6}$/.test(createPin)) {
      setError(t.pinLabel + ' must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/tree/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treeName: treeName.trim(),
          creatorName: creatorName.trim(),
          pin: createPin.trim(),
          branchColor,
          city: city.trim(),
          country: country.trim(),
          deviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create family tree');
      }

      const newSession: UserSession = {
        token: data.token,
        treeId: data.treeId,
        inviteCode: data.inviteCode,
        treeName: treeName.trim(),
        deviceId,
        activePersonId: data.personId,
        role: 'super_admin',
      };

      if (data.pukCode) {
        setCreatedPukData({ pukCode: data.pukCode, session: newSession });
      } else {
        onSessionReady(newSession);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteCode.trim() || inviteCode.trim().length !== 8) {
      setError('Invite code must be exactly 8 characters.');
      return;
    }
    if (!/^\d{6}$/.test(joinPin)) {
      setError(t.pinLabel + ' must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          pin: joinPin.trim(),
          deviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      onSessionReady({
        token: data.token,
        treeId: data.tree.id,
        inviteCode: data.tree.inviteCode,
        treeName: data.tree.name,
        deviceId,
        activePersonId: data.claimedPerson?.id,
        role: data.claimedPerson?.role || 'member',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  const colorPresets = [
    '#0F172A', '#1E40AF', '#065F46', '#854D0E',
    '#991B1B', '#6B21A8', '#9D174D', '#155E75',
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            KV
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
              {t.appName}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">{t.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              title={t.globalAdminTitle}
              className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </button>
          )}

          {/* Language selector pill */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
            {(['en', 'mz', 'es', 'de'] as Language[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLanguageChange(l)}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  lang === l
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full mx-auto my-auto py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.welcomeTitle}
          </h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            {t.welcomeSubtitle}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/80 rounded-xl mb-6 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              mode === 'create'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            {t.createNewTree}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('join');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              mode === 'join'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            {t.joinExistingTree}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
            {error}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.treeNameLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={treeName}
                  onChange={(e) => setTreeName(e.target.value)}
                  placeholder={t.treeNamePlaceholder}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.creatorNameLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder={t.creatorNamePlaceholder}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.pinLabel} *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      required
                      value={createPin}
                      onChange={(e) => setCreatePin(e.target.value.replace(/\D/g, ''))}
                      placeholder={t.pinPlaceholder}
                      className="w-full px-3.5 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.branchColorLabel}
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBranchColor(color)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          branchColor === color ? 'scale-115 border-slate-900 shadow-sm' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.cityLabel}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t.cityPlaceholder || "e.g. Aizawl"}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.countryLabel}
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder={t.countryPlaceholder || "e.g. India"}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block animate-pulse">{t.loading}</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    {t.createTreeBtn}
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.inviteCodeLabel} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder={t.inviteCodePlaceholder}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono uppercase tracking-widest text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.pinLabel} *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={joinPin}
                    onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.pinPlaceholder}
                    className="w-full px-3.5 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono tracking-widest text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRecoveryOpen(true)}
                    className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                  >
                    {t.forgotPin}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block animate-pulse">{t.loading}</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-sky-400" />
                    {t.joinTreeBtn}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-xl w-full mx-auto text-center pt-6 border-t border-slate-200 text-xs text-slate-400 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onOpenAdmin}
          className="flex items-center gap-1 text-slate-400 hover:text-amber-700 transition-colors cursor-pointer"
          title={t.globalAdminTitle}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>KinVault</span>
        </button>
        <span>•</span>
        <span>Zero Third-Party Trackers</span>
        <span>•</span>
        <span>End-to-End Family Privacy</span>
      </div>

      {/* PUK Presentation Modal on Tree Creation */}
      {createdPukData && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
              <KeyRound className="w-5 h-5 shrink-0" />
              <h3>{t.pukLabel}</h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold">{t.pukSaveNotice}</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <span className="font-mono text-xl font-bold tracking-widest text-slate-900 select-all">
                {createdPukData.pukCode}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdPukData.pukCode);
                  setCopiedPuk(true);
                  setTimeout(() => setCopiedPuk(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                {copiedPuk ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copiedPuk ? t.pukCopied : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onSessionReady(createdPukData.session)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Family Tree</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Recovery Modal */}
      <RecoveryModal
        isOpen={isRecoveryOpen}
        onClose={() => setIsRecoveryOpen(false)}
        t={t}
        deviceId={deviceId}
        initialInviteCode={inviteCode}
        onSessionReady={onSessionReady}
      />
    </div>
  );
};
