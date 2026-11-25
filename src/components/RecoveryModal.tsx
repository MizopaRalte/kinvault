import React, { useState } from 'react';
import { X, KeyRound, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import type { TranslationDictionary } from '../locales/translations';
import type { UserSession } from '../types/family';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationDictionary;
  deviceId: string;
  initialInviteCode?: string;
  onSessionReady: (session: UserSession) => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  isOpen,
  onClose,
  t,
  deviceId,
  initialInviteCode = '',
  onSessionReady,
}) => {
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [pukCode, setPukCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePukChange = (val: string) => {
    // Automatically format as KV-XXXX-XXXX
    let clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.startsWith('KV')) {
      clean = clean.slice(2);
    }
    clean = clean.slice(0, 8);
    if (clean.length > 4) {
      setPukCode(`KV-${clean.slice(0, 4)}-${clean.slice(4)}`);
    } else if (clean.length > 0) {
      setPukCode(`KV-${clean}`);
    } else {
      setPukCode('');
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInvite = inviteCode.trim().toUpperCase();
    const cleanPuk = pukCode.trim().toUpperCase();
    const cleanPin = newPin.trim();

    if (cleanInvite.length !== 8) {
      setError(t.inviteCodeLabel + ' must be 8 characters.');
      return;
    }

    if (!cleanPuk || cleanPuk.length < 8) {
      setError(t.pukLabel + ' is invalid.');
      return;
    }

    if (!/^\d{6}$/.test(cleanPin)) {
      setError(t.newPinLabel + ' must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: cleanInvite,
          pukCode: cleanPuk,
          newPin: cleanPin,
          deviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset PIN.');
      }

      setSuccess(true);
      setTimeout(() => {
        onSessionReady({
          token: data.token,
          treeId: data.tree.id,
          inviteCode: data.tree.inviteCode,
          treeName: data.tree.name,
          deviceId,
          activePersonId: data.claimedPerson?.id,
          role: data.claimedPerson?.role || 'member',
        });
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-base">{t.pukRecoveryTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4">{t.pukRecoverySubtitle}</p>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.pinResetSuccess}</span>
            </div>
          )}

          <form onSubmit={handleRecover} className="space-y-4">
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase tracking-widest text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.pukLabel} *
              </label>
              <input
                type="text"
                required
                value={pukCode}
                onChange={(e) => handlePukChange(e.target.value)}
                placeholder={t.pukPlaceholder}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase tracking-widest text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.newPinLabel} (6 Digits) *
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-4 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>{t.loading}</span>
              ) : (
                <>
                  <span>{t.resetPinBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
