import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Shield,
  ShieldCheck,
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
  QrCode,
  Smartphone,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import type { TranslationDictionary } from '../locales/translations';

interface AdminStats {
  totalTrees: number;
  totalPersons: number;
  totalHouseholds: number;
  livingPersons: number;
  deceasedPersons: number;
  is2faEnabled?: boolean;
  hasAdminSecret?: boolean;
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

interface InspectedPerson {
  id: string;
  household_id: string | null;
  full_name: string;
  nickname_or_maiden?: string;
  phone_e164?: string;
  birth_year?: string;
  death_year?: string;
  is_living: number;
  role: string;
  claimed_device_id?: string;
}

interface InspectedHousehold {
  id: string;
  family_name: string;
  branch_color: string;
  city?: string;
  country?: string;
}

interface InspectedTreeData {
  tree: { id: string; invite_code: string; name: string; created_at: number };
  households: InspectedHousehold[];
  persons: InspectedPerson[];
}

interface GlobalAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationDictionary;
  onDataChanged?: () => void;
}

const ADMIN_TOKEN_KEY = 'kv_admin_token';

export const GlobalAdminModal: React.FC<GlobalAdminModalProps> = ({
  isOpen,
  onClose,
  t,
  onDataChanged,
}) => {
  const [adminSecret, setAdminSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'trees' | 'security'>('trees');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Security & 2FA state
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [hasCustomSecret, setHasCustomSecret] = useState(false);
  const [envLockedSecret, setEnvLockedSecret] = useState(false);
  const [envLockedTotp, setEnvLockedTotp] = useState(false);

  // TOTP enrollment state
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupQrDataUrl, setSetupQrDataUrl] = useState<string | null>(null);
  const [verifyEnrollCode, setVerifyEnrollCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [disableTotpCode, setDisableTotpCode] = useState('');
  const [newCustomSecret, setNewCustomSecret] = useState('');

  // Dashboard Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trees, setTrees] = useState<TreeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Tree action states
  const [resetPinValue, setResetPinValue] = useState('');
  const [activeActionTreeId, setActiveActionTreeId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'reset_pin' | 'puk' | 'delete' | null>(null);
  const [generatedPuk, setGeneratedPuk] = useState<string | null>(null);
  const [copiedPuk, setCopiedPuk] = useState(false);

  // Full tree & member inspector states
  const [inspectedTree, setInspectedTree] = useState<InspectedTreeData | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<'member' | 'branch_admin' | 'super_admin'>('branch_admin');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmAdminDelete, setConfirmAdminDelete] = useState<{
    type: 'person' | 'household';
    id: string;
    label: string;
  } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = (await res.json()) as AdminStats;
        setStats(data);
        if (typeof data.is2faEnabled === 'boolean') {
          setIs2faEnabled(data.is2faEnabled);
        }
        if (typeof data.hasAdminSecret === 'boolean') {
          setHasCustomSecret(data.hasAdminSecret);
        }
      }
    } catch (err) {
      console.warn('Failed to load admin stats:', err);
    }
  }, []);

  const loadTrees = useCallback(async (token: string, query = '') => {
    try {
      const url = query ? `/api/admin/trees?q=${encodeURIComponent(query)}` : '/api/admin/trees';
      const res = await fetch(url, {
        headers: { 'X-Admin-Token': token },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdminToken('');
        setIsAuthenticated(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTrees(data.trees || []);
      }
    } catch (err) {
      console.warn('Failed to load trees:', err);
    }
  }, []);

  // On modal open: fetch public 2FA flag & validate any existing session token (does NOT run on keystrokes)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const initModal = async () => {
      await loadStats();
      const storedToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
      if (!storedToken) {
        if (!cancelled) setIsAuthenticated(false);
        return;
      }

      try {
        const res = await fetch('/api/admin/trees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': storedToken,
          },
          body: JSON.stringify({ action: 'get_security_status' }),
        });

        if (!res.ok) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          if (!cancelled) {
            setAdminToken('');
            setIsAuthenticated(false);
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setAdminToken(storedToken);
          setIsAuthenticated(true);
          setIs2faEnabled(Boolean(data.is2faEnabled));
          setHasCustomSecret(Boolean(data.hasCustomSecret));
          setEnvLockedSecret(Boolean(data.envLockedSecret));
          setEnvLockedTotp(Boolean(data.envLockedTotp));
          await loadTrees(storedToken, '');
        }
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    };

    initModal();
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadStats, loadTrees]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requireSecret = hasCustomSecret || !is2faEnabled;
    if (requireSecret && !adminSecret.trim()) return;
    if (is2faEnabled && totpCode.trim().length !== 6) return;

    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (adminSecret.trim()) headers['X-Admin-Secret'] = adminSecret.trim();
      if (totpCode.trim()) headers['X-Admin-Totp'] = totpCode.trim();

      const verifyRes = await fetch('/api/admin/trees', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'verify_admin',
          totpCode: totpCode.trim() || undefined,
        }),
      });

      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      const token = data.adminToken as string;
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      setAdminToken(token);
      setIsAuthenticated(true);
      setIs2faEnabled(Boolean(data.is2faEnabled));
      setHasCustomSecret(Boolean(data.hasCustomSecret));
      setEnvLockedSecret(Boolean(data.envLockedSecret));
      setEnvLockedTotp(Boolean(data.envLockedTotp));
      setAdminSecret('');
      setTotpCode('');

      await Promise.all([loadStats(), loadTrees(token, searchQuery)]);
    } catch (err: unknown) {
      setIsAuthenticated(false);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminToken) {
      loadTrees(adminToken, searchQuery);
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
          'X-Admin-Token': adminToken,
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
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          action: 'generate_puk',
          treeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate PUK');

      setGeneratedPuk(data.pukCode);
      loadTrees(adminToken, searchQuery);
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
          'X-Admin-Token': adminToken,
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
      if (inspectedTree?.tree.id === treeId) {
        setInspectedTree(null);
      }
      await Promise.all([loadStats(), loadTrees(adminToken, searchQuery)]);
      onDataChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error deleting tree');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectTree = async (treeId: string) => {
    setLoading(true);
    setError(null);
    setConfirmAdminDelete(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          action: 'inspect_tree',
          treeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tree details');
      setInspectedTree({
        tree: data.tree,
        households: data.households || [],
        persons: data.persons || [],
      });
      setMemberSearch('');
      setSelectedPersonIds(new Set());
      setConfirmBulkDelete(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to inspect tree');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminDeleteNode = async (
    treeId: string,
    type: 'person' | 'household',
    targetId: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify(
          type === 'person'
            ? { action: 'delete_person', treeId, personId: targetId }
            : { action: 'delete_household', treeId, householdId: targetId }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to delete ${type}`);

      setConfirmAdminDelete(null);
      setSuccessMsg(
        type === 'person' ? 'Profile deleted permanently.' : 'Household and members deleted.'
      );
      setTimeout(() => setSuccessMsg(null), 3000);
      await Promise.all([
        handleInspectTree(treeId),
        loadStats(),
        loadTrees(adminToken, searchQuery),
      ]);
      onDataChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to delete ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetRole = async (
    treeId: string,
    personId: string,
    role: 'super_admin' | 'branch_admin' | 'member'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          action: 'set_person_role',
          treeId,
          personId,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');

      setSuccessMsg('Member role updated.');
      setTimeout(() => setSuccessMsg(null), 2500);
      await handleInspectTree(treeId);
      onDataChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSetRole = async () => {
    if (!inspectedTree || selectedPersonIds.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          action: 'bulk_set_person_role',
          treeId: inspectedTree.tree.id,
          personIds: Array.from(selectedPersonIds),
          role: bulkRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update roles');

      setSuccessMsg(`Updated role for ${selectedPersonIds.size} members.`);
      setTimeout(() => setSuccessMsg(null), 2500);
      setSelectedPersonIds(new Set());
      await handleInspectTree(inspectedTree.tree.id);
      onDataChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteSelected = async () => {
    if (!inspectedTree || selectedPersonIds.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const count = selectedPersonIds.size;
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          action: 'bulk_delete_persons',
          treeId: inspectedTree.tree.id,
          personIds: Array.from(selectedPersonIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete selected members');

      setConfirmBulkDelete(false);
      setSelectedPersonIds(new Set());
      setSuccessMsg(`Deleted ${count} selected profiles.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await Promise.all([
        handleInspectTree(inspectedTree.tree.id),
        loadStats(),
        loadTrees(adminToken, searchQuery),
      ]);
      onDataChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete selected members');
    } finally {
      setLoading(false);
    }
  };

  const handleInitTotpSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({ action: 'init_totp_setup' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize 2FA');

      const qrUrl = await QRCode.toDataURL(data.otpauthUrl, {
        width: 220,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });

      setSetupSecret(data.secret);
      setSetupQrDataUrl(qrUrl);
      setVerifyEnrollCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupSecret || !/^\d{6}$/.test(verifyEnrollCode.trim())) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          action: 'enable_totp',
          secret: setupSecret,
          totpCode: verifyEnrollCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setIs2faEnabled(true);
      setSetupSecret(null);
      setSetupQrDataUrl(null);
      setVerifyEnrollCode('');
      setSuccessMsg('2FA Authenticator is now active on Global Admin!');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadStats();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(disableTotpCode.trim())) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          action: 'disable_totp',
          totpCode: disableTotpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');

      setIs2faEnabled(false);
      setDisableTotpCode('');
      setSuccessMsg('2FA Authenticator disabled.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadStats();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error disabling 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomSecret.trim().length < 8) {
      setError('Admin Secret Key must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          action: 'update_admin_secret',
          newSecret: newCustomSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update Admin Secret');

      setHasCustomSecret(true);
      setNewCustomSecret('');
      setSuccessMsg('Custom Admin Secret Key updated! Default key is now disabled.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating secret');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken('');
    setAdminSecret('');
    setTotpCode('');
    setTrees([]);
    setSetupSecret(null);
    setSetupQrDataUrl(null);
  };

  const copyToClipboard = (text: string, which: 'puk' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (which === 'puk') {
      setCopiedPuk(true);
      setTimeout(() => setCopiedPuk(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
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
              <p className="text-[11px] text-slate-400">Platform Control, 2FA & Registration Telemetry</p>
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

        {/* Navigation Tabs when authenticated */}
        {isAuthenticated && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('trees')}
              className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'trees'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Trees & Stats</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'security'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${is2faEnabled ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>2FA & Security</span>
              {is2faEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[78vh] overflow-y-auto">
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
            <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-md mx-auto py-6">
              <div className="text-center space-y-1 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-700">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Authentication Required</h4>
                <p className="text-xs text-slate-500">
                  {hasCustomSecret && is2faEnabled
                    ? 'Enter your Master Admin Secret Key and 2FA Authenticator code to access global controls.'
                    : is2faEnabled
                    ? 'Enter the 6-digit code from your Authenticator app to sign in.'
                    : 'Enter your Master Admin Secret Key to access global controls.'}
                </p>
              </div>

              {(hasCustomSecret || !is2faEnabled) && (
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
              )}

              {is2faEnabled && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{t.totpCodeLabel} *</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.totpCodePlaceholder}
                    className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-200 rounded-xl text-base font-mono tracking-[0.4em] text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  ((hasCustomSecret || !is2faEnabled) && !adminSecret.trim()) ||
                  (is2faEnabled && totpCode.length !== 6)
                }
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>{loading ? t.loading : t.unlockAdminBtn}</span>
              </button>
            </form>
          ) : activeTab === 'security' ? (
            /* 2FA & Security Tab */
            <div className="space-y-6">
              {/* 2FA Authenticator Card */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      is2faEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        2FA Authenticator (Google Authenticator / Authy / Apple Passwords)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Protect Global Admin login with a rotating 6-digit TOTP code every 30 seconds.
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                    is2faEnabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {is2faEnabled ? 'Active' : 'Not Configured'}
                  </span>
                </div>

                {envLockedTotp ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                    2FA is controlled via Cloudflare environment variable <code className="font-mono font-bold">GLOBAL_ADMIN_TOTP_SECRET</code>.
                  </div>
                ) : !is2faEnabled ? (
                  !setupSecret ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleInitTotpSetup}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Setup 2FA Authenticator QR Code</span>
                    </button>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="flex flex-col items-center bg-white p-3 rounded-xl border border-slate-200">
                          {setupQrDataUrl && (
                            <img src={setupQrDataUrl} alt="2FA QR Code" className="w-44 h-44" />
                          )}
                          <span className="text-[11px] text-slate-500 mt-1 font-medium">
                            Scan with Google Authenticator
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Or enter Secret Key manually:
                            </p>
                            <div className="flex items-center gap-1.5">
                              <code className="flex-1 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-mono text-[11px] text-slate-800 break-all select-all">
                                {setupSecret}
                              </code>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(setupSecret, 'secret')}
                                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                                title="Copy Secret"
                              >
                                {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                              </button>
                            </div>
                          </div>

                          <form onSubmit={handleEnableTotp} className="space-y-2 pt-2 border-t border-slate-200">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                              Enter 6-digit code from app to activate *
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                required
                                value={verifyEnrollCode}
                                onChange={(e) => setVerifyEnrollCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="••••••"
                                className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                              />
                              <button
                                type="submit"
                                disabled={loading || verifyEnrollCode.length !== 6}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                              >
                                Verify & Activate
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <form onSubmit={handleDisableTotp} className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-600">
                      To disable 2FA, verify with a current code from your Authenticator app:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={disableTotpCode}
                        onChange={(e) => setDisableTotpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6-digit code"
                        className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={loading || disableTotpCode.length !== 6}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Master Admin Secret Key Card */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Master Admin Secret Key</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hasCustomSecret
                        ? 'A private custom Admin Secret Key is active.'
                        : is2faEnabled
                        ? 'Currently protected by 2FA Authenticator only. You may optionally add a private Secret Key below.'
                        : 'Set a private Master Admin Secret Key below or configure GLOBAL_ADMIN_SECRET in Cloudflare.'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                    hasCustomSecret
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {hasCustomSecret ? 'Private Key Set' : is2faEnabled ? '2FA-Only Mode' : 'Not Set'}
                  </span>
                </div>

                {envLockedSecret ? (
                  <p className="text-xs text-slate-500">
                    Managed via Cloudflare environment variable <code className="font-mono font-bold">GLOBAL_ADMIN_SECRET</code>.
                  </p>
                ) : (
                  <form onSubmit={handleUpdateCustomSecret} className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="password"
                      minLength={8}
                      required
                      value={newCustomSecret}
                      onChange={(e) => setNewCustomSecret(e.target.value)}
                      placeholder="New private Admin Secret (min 8 characters)"
                      className="flex-1 min-w-[220px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={loading || newCustomSecret.trim().length < 8}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Save Custom Secret
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* Trees & Telemetry Dashboard View */
            <div className="space-y-6">
              {/* Telemetry Stat Cards */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                      <FolderTree className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.totalTrees}</span>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900">{stats.totalTrees}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.totalMembers}</span>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900">{stats.totalPersons}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.totalHouseholds}</span>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900">{stats.totalHouseholds}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.livingVsDeceased}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      <span className="text-emerald-700">{stats.livingPersons}</span> / <span className="text-slate-500">{stats.deceasedPersons}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Search & Trees List OR Tree Member Inspector */}
              {inspectedTree ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          setInspectedTree(null);
                          setConfirmAdminDelete(null);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>All Trees</span>
                      </button>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {inspectedTree.tree.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {inspectedTree.persons.length} members • {inspectedTree.households.length} households
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInspectTree(inspectedTree.tree.id)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Refresh Members"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Confirm Member / Household Deletion Box */}
                  {confirmAdminDelete && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-rose-900">
                        Delete {confirmAdminDelete.type} &ldquo;{confirmAdminDelete.label}&rdquo;? This cannot be undone.
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            handleAdminDeleteNode(
                              inspectedTree.tree.id,
                              confirmAdminDelete.type,
                              confirmAdminDelete.id
                            )
                          }
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAdminDelete(null)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Member Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Filter profiles by name, phone, or year..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {/* Empty Orphan Households (if any) */}
                  {(() => {
                    const occupiedIds = new Set(
                      inspectedTree.persons.map((p) => p.household_id).filter(Boolean)
                    );
                    const emptyHouseholds = inspectedTree.households.filter(
                      (h) => !occupiedIds.has(h.id)
                    );
                    if (emptyHouseholds.length === 0) return null;
                    return (
                      <div className="border border-amber-200 bg-amber-50/70 rounded-xl p-2.5 space-y-1.5">
                        <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                          Empty Households ({emptyHouseholds.length})
                        </p>
                        {emptyHouseholds.map((eh) => (
                          <div
                            key={eh.id}
                            className="flex items-center justify-between gap-2 bg-white border border-amber-200/80 rounded-lg px-2.5 py-1.5"
                          >
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {eh.family_name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAdminDelete({
                                  type: 'household',
                                  id: eh.id,
                                  label: eh.family_name,
                                })
                              }
                              className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                            >
                              Delete Empty Household
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Select All & Bulk Actions + All Individual Profiles */}
                  {(() => {
                    const q = memberSearch.trim().toLowerCase();
                    const householdNameMap = new Map(
                      inspectedTree.households.map((h) => [h.id, h.family_name])
                    );
                    const filtered = inspectedTree.persons.filter((p) => {
                      if (!q) return true;
                      const hName = (p.household_id ? householdNameMap.get(p.household_id) : '') || '';
                      return (
                        p.full_name.toLowerCase().includes(q) ||
                        (p.nickname_or_maiden || '').toLowerCase().includes(q) ||
                        (p.phone_e164 || '').toLowerCase().includes(q) ||
                        (p.birth_year || '').includes(q) ||
                        hName.toLowerCase().includes(q)
                      );
                    });
                    const allFilteredSelected =
                      filtered.length > 0 && filtered.every((p) => selectedPersonIds.has(p.id));

                    return (
                      <>
                        {filtered.length > 0 && (
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                            <label className="inline-flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={allFilteredSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPersonIds(new Set(filtered.map((p) => p.id)));
                                  } else {
                                    setSelectedPersonIds(new Set());
                                    setConfirmBulkDelete(false);
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                              />
                              <span>
                                {allFilteredSelected
                                  ? `Deselect All (${filtered.length})`
                                  : `Select All (${filtered.length})`}
                              </span>
                              {selectedPersonIds.size > 0 && (
                                <span className="px-2 py-0.5 bg-slate-900 text-white rounded-full text-[10px]">
                                  {selectedPersonIds.size} selected
                                </span>
                              )}
                            </label>

                            {selectedPersonIds.size > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <select
                                  aria-label="Bulk role"
                                  value={bulkRole}
                                  disabled={loading}
                                  onChange={(e) =>
                                    setBulkRole(
                                      e.target.value as 'member' | 'branch_admin' | 'super_admin'
                                    )
                                  }
                                  className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700"
                                >
                                  <option value="member">Member</option>
                                  <option value="branch_admin">Branch Admin</option>
                                  <option value="super_admin">Super Admin (All)</option>
                                </select>
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={handleBulkSetRole}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                >
                                  Apply Role
                                </button>
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() => setConfirmBulkDelete(true)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete ({selectedPersonIds.size})</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {confirmBulkDelete && selectedPersonIds.size > 0 && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-rose-900">
                              Delete {selectedPersonIds.size} selected profile(s)? This cannot be undone.
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={loading}
                                onClick={handleBulkDeleteSelected}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                              >
                                Confirm Bulk Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmBulkDelete(false)}
                                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                          {filtered.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                              No profiles found.
                            </div>
                          ) : (
                            filtered.map((p) => {
                              const hName = p.household_id ? householdNameMap.get(p.household_id) : undefined;
                              const isSelected = selectedPersonIds.has(p.id);
                              return (
                                <div
                                  key={p.id}
                                  className={`p-3 transition-colors flex items-center justify-between gap-2 ${
                                    isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <input
                                      type="checkbox"
                                      aria-label={`Select ${p.full_name}`}
                                      checked={isSelected}
                                      onChange={(e) => {
                                        setSelectedPersonIds((prev) => {
                                          const next = new Set(prev);
                                          if (e.target.checked) next.add(p.id);
                                          else next.delete(p.id);
                                          return next;
                                        });
                                      }}
                                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-bold text-slate-900 text-xs">
                                          {p.full_name}
                                        </span>
                                        {p.role === 'super_admin' && (
                                          <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                            Super Admin
                                          </span>
                                        )}
                                        {p.role === 'branch_admin' && (
                                          <span className="text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.2 rounded">
                                            Branch Admin
                                          </span>
                                        )}
                                        {p.claimed_device_id ? (
                                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded">
                                            Claimed
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">
                                            Unclaimed
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                        {[
                                          hName ? `Household: ${hName}` : 'No Household',
                                          p.birth_year ? `b. ${p.birth_year}` : '',
                                          p.is_living ? 'Living' : 'Deceased',
                                          p.phone_e164 || '',
                                        ]
                                          .filter(Boolean)
                                          .join(' • ')}
                                      </p>
                                    </div>
                                  </div>

                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              <select
                                aria-label={`Role for ${p.full_name}`}
                                value={p.role}
                                disabled={loading}
                                onChange={(e) =>
                                  handleAdminSetRole(
                                    inspectedTree.tree.id,
                                    p.id,
                                    e.target.value as 'super_admin' | 'branch_admin' | 'member'
                                  )
                                }
                                className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                              >
                                <option value="member">Member</option>
                                <option value="branch_admin">Branch Admin</option>
                                <option value="super_admin">Super Admin (All)</option>
                              </select>
                              {p.household_id && (
                                <button
                                  type="button"
                                  title="Delete Entire Household"
                                  onClick={() =>
                                    setConfirmAdminDelete({
                                      type: 'household',
                                      id: p.household_id!,
                                      label: hName || p.full_name,
                                    })
                                  }
                                  className="px-2 py-1 text-[10px] font-semibold text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  Del Household
                                </button>
                              )}
                              <button
                                type="button"
                                title="Delete Profile"
                                onClick={() =>
                                  setConfirmAdminDelete({
                                    type: 'person',
                                    id: p.id,
                                    label: p.full_name,
                                  })
                                }
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Family Trees Management
                  </h4>
                  <button
                    type="button"
                    onClick={() => Promise.all([loadStats(), loadTrees(adminToken, searchQuery)])}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

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
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleInspectTree(tree.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Members</span>
                              </button>
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
                                      onClick={() => copyToClipboard(generatedPuk, 'puk')}
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
