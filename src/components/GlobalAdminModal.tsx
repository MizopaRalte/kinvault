import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Shield,
  Key,
  Search,
  Users,
  FolderTree,
  Home,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  Lock,
  Trash2,
} from 'lucide-react';
import type { TranslationDictionary } from '../locales/translations';

interface AdminStats {
  totalTrees: number;
  totalPersons: number;
  totalHouseholds: number;
  livingPersons: number;
  deceasedPersons: number;
}

interface TreeItem {
  id: string;
  invite_code: string;
  name: string;
  puk_created_at: number;
  created_at: number;
  member_count: number;
  household_count: number;
  has_puk: number;
}

interface GlobalAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationDictionary;
}

export const GlobalAdminModal: React.FC<GlobalAdminModalProps> = ({
  isOpen,
  onClose,
  t,
}) => {
  const [adminSecret, setAdminSecret] = useState(() => sessionStorage.getItem('kv_admin_secret') || '');
  const [totpCode, setTotpCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dashboard Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trees, setTrees] = useState<TreeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Action states
  const [resetPinValue, setResetPinValue] = useState('');
  const [activeActionTreeId, setActiveActionTreeId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'reset_pin' | 'puk' | 'delete' | null>(null);
  const [generatedPuk, setGeneratedPuk] = useState<string | null>(null);
  const [copiedPuk, setCopiedPuk] = useState(false);

  const loadStats = useCallback(async (secret: string) => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'X-Admin-Secret': secret },
      });
      if (res.ok) {
        const data = (await res.json()) as AdminStats;
        setStats(data);
      }
    } catch (err) {
      console.warn('Failed to load admin stats:', err);
    }
  }, []);

  const loadTrees = useCallback(async (secret: string, query = '') => {
    try {
      const url = query ? `/api/admin/trees?q=${encodeURIComponent(query)}` : '/api/admin/trees';
      const res = await fetch(url, {
        headers: { 'X-Admin-Secret': secret },
      });
      if (res.ok) {
        const data = await res.json();
        setTrees(data.trees || []);
      }
    } catch (err) {
      console.warn('Failed to load trees:', err);
    }
  }, []);

  const verifyAndLoadData = useCallback(async (secret: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Verify admin key
      const verifyRes = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': secret.trim(),
          ...(totpCode ? { 'X-Admin-Totp': totpCode.trim() } : {}),
        },
        body: JSON.stringify({ action: 'verify_admin', totpCode: totpCode.trim() || undefined }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Authentication failed');
      }

      setIsAuthenticated(true);
      sessionStorage.setItem('kv_admin_secret', secret.trim());

      // 2. Load stats and trees in parallel
      await Promise.all([loadStats(secret.trim()), loadTrees(secret.trim(), searchQuery)]);
    } catch (err: unknown) {
      setIsAuthenticated(false);
      setError(err instanceof Error ? err.message : 'Invalid Admin Secret');
    } finally {
      setLoading(false);
    }
  }, [totpCode, loadStats, loadTrees, searchQuery]);

  // Authenticate on mount if session exists
  useEffect(() => {
    if (isOpen && adminSecret) {
      verifyAndLoadData(adminSecret);
    }
  }, [isOpen, adminSecret, verifyAndLoadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSecret) {
      loadTrees(adminSecret, searchQuery);
    }
  };

  const handleResetPin = async (treeId: string) => {
    if (!/^\d{6}$/.test(resetPinValue.trim())) {
      setError(t.newPinLabel + ' must be 6 digits.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': adminSecret,
        },
        body: JSON.stringify({
          action: 'reset_pin',
          treeId,
          newPin: resetPinValue.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset PIN');

      setSuccessMsg('PIN successfully updated for this tree.');
      setActiveActionTreeId(null);
      setResetPinValue('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error resetting PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePuk = async (treeId: string) => {
    setLoading(true);
    setError(null);
    setGeneratedPuk(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': adminSecret,
        },
        body: JSON.stringify({
          action: 'generate_puk',
          treeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate PUK');

      setGeneratedPuk(data.pukCode);
      // Reload trees to reflect PUK status
      loadTrees(adminSecret, searchQuery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating PUK');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTree = async (treeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': adminSecret,
        },
        body: JSON.stringify({
          action: 'delete_tree',
          treeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete tree');

      setActiveActionTreeId(null);
      setActionType(null);
      setSuccessMsg('Tree deleted permanently.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await Promise.all([loadStats(adminSecret), loadTrees(adminSecret, searchQuery)]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error deleting tree');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('kv_admin_secret');
    setAdminSecret('');
    setStats(null);
    setTrees([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPuk(true);
    setTimeout(() => setCopiedPuk(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{t.globalAdminTitle}</h3>
              <p className="text-[11px] text-slate-400">Platform Control & Registration Telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isAuthenticated ? (
            /* Login View */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyAndLoadData(adminSecret);
              }}
              className="space-y-4 max-w-md mx-auto py-8"
            >
              <div className="text-center space-y-1 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-700">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Authentication Required</h4>
                <p className="text-xs text-slate-500">Enter master administrative secret key to access global controls.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.globalAdminKeyLabel} *
                </label>
                <input
                  type="password"
                  required
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder={t.globalAdminKeyPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.totpCodeLabel} (Optional 2FA)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.totpCodePlaceholder}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? t.loading : t.unlockAdminBtn}
              </button>
            </form>
          ) : (
            /* Admin Dashboard */
            <div className="space-y-6">
              {/* Telemetry Metric Cards */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-600" />
                      {t.totalMembers}
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-slate-900">{stats.totalPersons}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {stats.livingPersons} living
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                      <FolderTree className="w-3.5 h-3.5 text-emerald-600" />
                      {t.totalTrees}
                    </span>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-slate-900">{stats.totalTrees}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-indigo-600" />
                      {t.totalHouseholds}
                    </span>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-slate-900">{stats.totalHouseholds}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-600" />
                      Platform Status
                    </span>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      D1 Live & Active
                    </div>
                  </div>
                </div>
              )}

              {/* Tree Directory & Support Tools */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">Family Trees & PIN Recovery</h4>
                  <button
                    type="button"
                    onClick={() => {
                      loadStats(adminSecret);
                      loadTrees(adminSecret, searchQuery);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Refresh list"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchTreesPlaceholder}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Search
                  </button>
                </form>

                {/* Tree Rows */}
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {trees.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">No family trees found.</div>
                  ) : (
                    trees.map((tree) => {
                      const isActionOpen = activeActionTreeId === tree.id;

                      return (
                        <div key={tree.id} className="p-3.5 hover:bg-slate-50/70 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-slate-900 text-xs truncate">{tree.name}</h5>
                                <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {tree.invite_code}
                                </span>
                                {tree.has_puk ? (
                                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    PUK Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    No PUK
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {tree.member_count} members • {tree.household_count} households • Created {new Date(tree.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionTreeId(isActionOpen && actionType === 'reset_pin' ? null : tree.id);
                                  setActionType('reset_pin');
                                  setResetPinValue('');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                {t.resetTreePinBtn}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionTreeId(isActionOpen && actionType === 'puk' ? null : tree.id);
                                  setActionType('puk');
                                  handleGeneratePuk(tree.id);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                              >
                                {t.generateNewPukBtn}
                              </button>
                              <button
                                type="button"
                                title="Delete Tree"
                                onClick={() => {
                                  setActiveActionTreeId(isActionOpen && actionType === 'delete' ? null : tree.id);
                                  setActionType('delete');
                                }}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Sub-action Box */}
                          {isActionOpen && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60">
                              {actionType === 'reset_pin' && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="Enter new 6-digit PIN"
                                    value={resetPinValue}
                                    onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, ''))}
                                    className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                                  />
                                  <button
                                    type="button"
                                    disabled={loading || resetPinValue.length !== 6}
                                    onClick={() => handleResetPin(tree.id)}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                                  >
                                    Apply PIN
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveActionTreeId(null)}
                                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}

                              {actionType === 'puk' && generatedPuk && (
                                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
                                  <p className="font-semibold text-amber-900">
                                    {t.pukGeneratedNotice}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-base text-slate-900 bg-white px-3 py-1 rounded border border-amber-200 select-all">
                                      {generatedPuk}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(generatedPuk)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors cursor-pointer"
                                    >
                                      {copiedPuk ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                      <span>{copiedPuk ? t.pukCopied : 'Copy'}</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {actionType === 'delete' && (
                                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center justify-between gap-3">
                                  <span className="font-semibold text-rose-900">
                                    Delete &ldquo;{tree.name}&rdquo; ({tree.member_count} members)? This cannot be undone.
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      disabled={loading}
                                      onClick={() => handleDeleteTree(tree.id)}
                                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                                    >
                                      Confirm Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveActionTreeId(null)}
                                      className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
