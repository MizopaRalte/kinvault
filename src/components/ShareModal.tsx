import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, KeyRound, QrCode, Link2 } from 'lucide-react';
import type { Tree } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: Tree;
  pin: string;
  onPinChange?: (pin: string) => void;
  t: TranslationDictionary;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  tree,
  pin,
  onPinChange,
  t,
}) => {
  const [pinInput, setPinInput] = useState(() => pin.replace(/\D/g, '').slice(0, 6));
  const [includePinInLink, setIncludePinInLink] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  if (!isOpen) return null;

  const cleanPin = pinInput.replace(/\D/g, '').slice(0, 6);
  const hasValidPin = /^\d{6}$/.test(cleanPin);

  const joinUrl =
    includePinInLink && hasValidPin
      ? `${window.location.origin}/?join=${tree.invite_code}#pin=${cleanPin}`
      : `${window.location.origin}/?join=${tree.invite_code}`;

  const handlePinInputChange = (raw: string) => {
    const nextPin = raw.replace(/\D/g, '').slice(0, 6);
    setPinInput(nextPin);
    onPinChange?.(nextPin);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tree.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyPin = () => {
    if (!hasValidPin) return;
    navigator.clipboard.writeText(cleanPin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // Build WhatsApp pre-filled text
  const shareText = hasValidPin
    ? t.whatsAppMessage
        .replace('{code}', tree.invite_code)
        .replace('{pin}', cleanPin)
        .replace('{link}', joinUrl)
    : t.whatsAppMessageNoPin
        .replace('{code}', tree.invite_code)
        .replace('{link}', joinUrl);

  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-slate-800" />
            <h3 className="font-bold text-slate-900 text-base">{t.shareTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed">{t.shareSubtitle}</p>

          {/* Invite Code & PIN Displays */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center flex flex-col justify-between">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {t.inviteCodeLabel}
              </span>
              <span className="block font-mono text-xl font-bold tracking-widest text-slate-900 mb-2">
                {tree.invite_code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="w-full py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? t.copied : t.copyInviteCode}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center flex flex-col justify-between">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {t.pinLabel}
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={cleanPin}
                onChange={(e) => handlePinInputChange(e.target.value)}
                placeholder={t.pinPlaceholder}
                aria-label={t.pinLabel}
                className="w-full bg-white border border-slate-200 rounded-lg py-0.5 px-2 font-mono text-xl font-bold tracking-widest text-center text-slate-900 mb-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={handleCopyPin}
                disabled={!hasValidPin}
                className="w-full py-1 px-2 bg-white hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <KeyRound className="w-3.5 h-3.5" />}
                {copiedPin ? t.copied : t.copyPinBtn}
              </button>
            </div>
          </div>

          {!hasValidPin && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {t.enterPinToShareHint}
            </p>
          )}

          {/* Direct Link */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.copyInviteLink}</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={joinUrl}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? t.copied : t.copyBtn}
              </button>
            </div>

            <label className="mt-2.5 flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includePinInLink}
                onChange={(e) => setIncludePinInLink(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <span>{t.includePinInLink}</span>
            </label>
          </div>

          {/* 1-Tap WhatsApp Share Button */}
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            {t.shareWhatsApp}
          </a>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1 text-center">
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span>{t.shareSecurityNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
