import React, { useState } from 'react';
import {
  X,
  Download,
  Upload,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  FileText,
  Shield,
} from 'lucide-react';
import type { TreeData, Role } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';
import { encryptBackup, decryptBackup, downloadBackupFile, type BackupPayload } from '../utils/cryptoVault';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TreeData;
  userRole?: Role;
  t: TranslationDictionary;
  onRestoreSuccess: () => Promise<void>;
  token: string;
  activePersonId?: string;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  data,
  userRole,
  t,
  onRestoreSuccess,
  token,
  activePersonId,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [exportPassword, setExportPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [decryptedPayload, setDecryptedPayload] = useState<BackupPayload | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!exportPassword || exportPassword.length < 4) {
      setError('Please choose a password with at least 4 characters.');
      return;
    }

    setLoading(true);
    try {
      const payload: BackupPayload = {
        version: 1,
        exportedAt: Date.now(),
        tree: data.tree,
        households: data.households,
        persons: data.persons,
        relationships: data.relationships,
      };

      const encryptedBlob = await encryptBackup(payload, exportPassword);
      downloadBackupFile(encryptedBlob, data.tree.invite_code);
      setSuccessMsg('Encrypted .fam backup file successfully downloaded!');
      setExportPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setDecryptedPayload(null);
      setError(null);
    }
  };

  const handleDecryptPreview = async () => {
    if (!importFile) {
      setError('Please select a .fam file first.');
      return;
    }
    if (!importPassword) {
      setError('Please enter the password used to encrypt this backup.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const payload = await decryptBackup(importFile, importPassword);
      setDecryptedPayload(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to decrypt .fam backup file.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!decryptedPayload) return;
    if (userRole !== 'super_admin') {
      setError(t.restoreWarning);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      if (activePersonId) {
        headers['X-Person-Id'] = activePersonId;
      }

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tree: decryptedPayload.tree,
          households: decryptedPayload.households,
          persons: decryptedPayload.persons,
          relationships: decryptedPayload.relationships,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'Restore failed');
      }

      setSuccessMsg(t.restoredSuccess);
      await onRestoreSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-800" />
            <h3 className="font-bold text-slate-900 text-base">{t.backupTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('export');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-center rounded-lg transition-all ${
              tab === 'export'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Export Backup (.fam)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('import');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-center rounded-lg transition-all ${
              tab === 'import'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Import & Restore
          </button>
        </div>

        {error && (
          <div className="m-6 mb-0 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="m-6 mb-0 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6">
          {tab === 'export' ? (
            <form onSubmit={handleExport} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">{t.backupSubtitle}</p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.backupPasswordLabel} *
                </label>
                <div className="relative">
                  <input
                    type={showExportPassword ? 'text' : 'password'}
                    required
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    placeholder={t.backupPasswordPlaceholder}
                    className="w-full px-3.5 py-2.5 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowExportPassword(!showExportPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                  >
                    {showExportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[11px] leading-relaxed">
                {t.exportNotice}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {loading ? t.loading : t.exportBackupBtn}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Select an encrypted <code>.fam</code> file and enter the password used during export to decrypt and inspect the tree.
              </p>

              {/* File selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.selectBackupFile}
                </label>
                <input
                  type="file"
                  accept=".fam"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.backupPasswordLabel}
                </label>
                <div className="relative">
                  <input
                    type={showImportPassword ? 'text' : 'password'}
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    placeholder="Password for this .fam file"
                    className="w-full px-3.5 py-2.5 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowImportPassword(!showImportPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                  >
                    {showImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDecryptPreview}
                disabled={loading || !importFile || !importPassword}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                {loading ? t.loading : t.decryptPreviewBtn}
              </button>

              {/* Decrypted Inspection Card */}
              {decryptedPayload && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900">
                      {decryptedPayload.tree.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Code: {decryptedPayload.tree.invite_code}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="block font-bold text-slate-900 text-sm">
                        {decryptedPayload.households.length}
                      </span>
                      <span className="text-[10px] text-slate-500">{t.statsHouseholds}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="block font-bold text-slate-900 text-sm">
                        {decryptedPayload.persons.length}
                      </span>
                      <span className="text-[10px] text-slate-500">{t.statsPersons}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="block font-bold text-slate-900 text-sm">
                        {decryptedPayload.relationships.length}
                      </span>
                      <span className="text-[10px] text-slate-500">{t.statsRelationships}</span>
                    </div>
                  </div>

                  {userRole === 'super_admin' ? (
                    <div className="pt-2">
                      <p className="text-[11px] text-amber-700 font-medium mb-2">
                        {t.restoreWarning}
                      </p>
                      <button
                        type="button"
                        onClick={handleCloudRestore}
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        {loading ? t.loading : t.restoreToCloudBtn}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-center pt-1">
                      Only the Super Admin can restore this backup to Cloudflare D1.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
