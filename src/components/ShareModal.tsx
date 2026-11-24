import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, KeyRound, QrCode } from 'lucide-react';
import type { Tree } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: Tree;
  pin: string;
  t: TranslationDictionary;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  tree,
  pin,
  t,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  if (!isOpen) return null;

  const joinUrl = `${window.location.origin}?join=${tree.invite_code}`;

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
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // Build WhatsApp pre-filled text
  const shareText = t.whatsAppMessage
    .replace('{code}', tree.invite_code)
    .replace('{pin}', pin || '******')
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
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
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

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {t.pinLabel}
              </span>
              <span className="block font-mono text-xl font-bold tracking-widest text-slate-900 mb-2">
                {pin || '••••••'}
              </span>
              <button
                type="button"
                onClick={handleCopyPin}
                className="w-full py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <KeyRound className="w-3.5 h-3.5" />}
                {copiedPin ? t.copied : 'Copy PIN'}
              </button>
            </div>
          </div>

          {/* Direct Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.copyInviteLink}
            </label>
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
                {copiedLink ? t.copied : 'Copy'}
              </button>
            </div>
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
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-2">
            <QrCode className="w-3.5 h-3.5" />
            <span>Only relatives with the 6-digit PIN can view or join this tree.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
