import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Upload,
} from 'lucide-react';
import type { Household, Person, Role } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';
import { compressAvatar, compressFamilyPhoto } from '../utils/imageCompress';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: Person;
  household?: Household;
  initialMode?: string; // 'edit_person' | 'edit_household' | 'add_child' | 'add_spouse' | 'add_ancestor' | 'add_sibling'
  t: TranslationDictionary;
  activePersonId?: string;
  userRole?: Role;
  deviceId: string;
  onMutate: (action: string, payload: any) => Promise<void>;
  onProfileClaimed?: (person: Person) => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  person,
  household,
  initialMode = 'edit_person',
  t,
  activePersonId: _activePersonId,
  userRole,
  deviceId,
  onMutate,
  onProfileClaimed,
}) => {
  const [mode, setMode] = useState<string>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'person' | 'household' | null>(null);

  // Person form state
  const [fullName, setFullName] = useState('');
  const [nicknameOrMaiden, setNicknameOrMaiden] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [isLiving, setIsLiving] = useState(true);
  const [avatarB64, setAvatarB64] = useState('');
  const [avatarSizeKb, setAvatarSizeKb] = useState<number | null>(null);

  // Household form state
  const [familyName, setFamilyName] = useState('');
  const [branchColor, setBranchColor] = useState('#0F172A');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [familyPhotoB64, setFamilyPhotoB64] = useState('');
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);

  // Add child / new family state
  const [childFullName, setChildFullName] = useState('');
  const [childSpouseName, setChildSpouseName] = useState('');
  const [childBirthYear, setChildBirthYear] = useState('');
  const [childAvatarB64, setChildAvatarB64] = useState('');
  const [childAvatarSizeKb, setChildAvatarSizeKb] = useState<number | null>(null);

  // Add spouse state
  const [spouseFullName, setSpouseFullName] = useState('');
  const [spouseBirthYear, setSpouseBirthYear] = useState('');
  const [spousePhone, setSpousePhone] = useState('');
  const [spouseAvatarB64, setSpouseAvatarB64] = useState('');
  const [spouseAvatarSizeKb, setSpouseAvatarSizeKb] = useState<number | null>(null);

  // Add ancestors above state
  const [ancestorFather, setAncestorFather] = useState('');
  const [ancestorMother, setAncestorMother] = useState('');
  const [ancestorFamilyName, setAncestorFamilyName] = useState('');
  const [fatherAvatarB64, setFatherAvatarB64] = useState('');
  const [fatherAvatarSizeKb, setFatherAvatarSizeKb] = useState<number | null>(null);
  const [motherAvatarB64, setMotherAvatarB64] = useState('');
  const [motherAvatarSizeKb, setMotherAvatarSizeKb] = useState<number | null>(null);

  // Add sibling state
  const [siblingFullName, setSiblingFullName] = useState('');
  const [siblingBirthYear, setSiblingBirthYear] = useState('');
  const [siblingPhone, setSiblingPhone] = useState('');
  const [siblingSpouseName, setSiblingSpouseName] = useState('');
  const [siblingAvatarB64, setSiblingAvatarB64] = useState('');
  const [siblingAvatarSizeKb, setSiblingAvatarSizeKb] = useState<number | null>(null);
  const [siblingParentName, setSiblingParentName] = useState('');

  // Synchronize modal state with props on open
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setConfirmDelete(null);
      return;
    }

    setMode(initialMode);
    setError(null);
    setConfirmDelete(null);

    if (person) {
      setFullName(person.full_name || '');
      setNicknameOrMaiden(person.nickname_or_maiden || '');
      setPhoneE164(person.phone_e164 || '');
      setBirthYear(person.birth_year || '');
      setDeathYear(person.death_year || '');
      setIsLiving(person.is_living === 1);
      setAvatarB64(person.avatar_b64 || '');
      setAvatarSizeKb(null);
    } else {
      setFullName('');
      setNicknameOrMaiden('');
      setPhoneE164('');
      setBirthYear('');
      setDeathYear('');
      setIsLiving(true);
      setAvatarB64('');
      setAvatarSizeKb(null);
    }

    if (household) {
      setFamilyName(household.family_name || '');
      setBranchColor(household.branch_color || '#0F172A');
      setAddressLine(household.address_line || '');
      setCity(household.city || '');
      setPostalCode(household.postal_code || '');
      setCountry(household.country || '');
      setFamilyPhotoB64(household.family_photo_b64 || '');
      setPhotoSizeKb(null);
    } else {
      setFamilyName('');
      setBranchColor('#0F172A');
      setAddressLine('');
      setCity('');
      setPostalCode('');
      setCountry('');
      setFamilyPhotoB64('');
      setPhotoSizeKb(null);
    }

    // Reset extra form inputs
    setChildFullName('');
    setChildSpouseName('');
    setChildBirthYear('');
    setChildAvatarB64('');
    setChildAvatarSizeKb(null);
    setSpouseFullName('');
    setSpouseBirthYear('');
    setSpousePhone('');
    setSpouseAvatarB64('');
    setSpouseAvatarSizeKb(null);
    setAncestorFather('');
    setAncestorMother('');
    setAncestorFamilyName('');
    setFatherAvatarB64('');
    setFatherAvatarSizeKb(null);
    setMotherAvatarB64('');
    setMotherAvatarSizeKb(null);
    setSiblingFullName('');
    setSiblingBirthYear('');
    setSiblingPhone('');
    setSiblingSpouseName('');
    setSiblingAvatarB64('');
    setSiblingAvatarSizeKb(null);
    setSiblingParentName('');
  }, [isOpen, person, household, initialMode]);

  if (!isOpen) return null;

  // Image compression handlers
  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (b64: string) => void,
    sizeSetter: (kb: number | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await compressAvatar(file, 300, 0.75);
      setter(res.dataUrl);
      sizeSetter(res.sizeKb);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error processing avatar');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleAvatarUpload(e, setAvatarB64, setAvatarSizeKb);
  };

  const handleFamilyPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await compressFamilyPhoto(file, 1280, 0.75);
      setFamilyPhotoB64(res.dataUrl);
      setPhotoSizeKb(res.sizeKb);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error processing family photo');
    } finally {
      setLoading(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'edit_person') {
        if (!fullName.trim()) throw new Error(t.fullName + ' is required.');
        await onMutate('upsert_person', {
          id: person?.id,
          household_id: person?.household_id || household?.id,
          full_name: fullName.trim(),
          nickname_or_maiden: nicknameOrMaiden.trim(),
          phone_e164: phoneE164.trim(),
          birth_year: birthYear.trim(),
          death_year: deathYear.trim(),
          is_living: isLiving ? 1 : 0,
          avatar_b64: avatarB64,
        });
      } else if (mode === 'edit_household') {
        if (!familyName.trim()) throw new Error(t.newFamilyName + ' is required.');
        await onMutate('upsert_household', {
          id: household?.id,
          family_name: familyName.trim(),
          branch_color: branchColor,
          address_line: addressLine.trim(),
          city: city.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
          family_photo_b64: familyPhotoB64,
        });
      } else if (mode === 'add_child') {
        if (!childFullName.trim()) throw new Error(t.childName + ' is required.');
        const parentId = person?.id;
        if (!parentId) throw new Error('Parent person reference is required.');

        await onMutate('add_child_household', {
          parentPersonId: parentId,
          familyName: `${childFullName.trim()} Family`,
          childFullName: childFullName.trim(),
          childAvatarB64: childAvatarB64 || undefined,
          spouseFullName: childSpouseName.trim() || undefined,
          birthYear: childBirthYear.trim() || undefined,
          branchColor: household?.branch_color,
          city: household?.city,
          country: household?.country,
        });
      } else if (mode === 'add_spouse') {
        if (!spouseFullName.trim()) throw new Error(t.spouseName + ' is required.');
        const targetPersonId = person?.id;
        if (!targetPersonId) throw new Error('Person reference is required.');

        await onMutate('add_spouse', {
          personId: targetPersonId,
          spouseFullName: spouseFullName.trim(),
          birthYear: spouseBirthYear.trim(),
          phoneE164: spousePhone.trim(),
          avatarB64: spouseAvatarB64 || undefined,
        });
      } else if (mode === 'add_ancestor') {
        if (!ancestorFather.trim() && !ancestorMother.trim()) {
          throw new Error('Please provide at least one ancestor name (father or mother).');
        }
        const targetPersonId = person?.id;
        if (!targetPersonId) throw new Error('Person reference is required.');

        await onMutate('add_ancestors_above', {
          personId: targetPersonId,
          fatherName: ancestorFather.trim() || undefined,
          fatherAvatarB64: fatherAvatarB64 || undefined,
          motherName: ancestorMother.trim() || undefined,
          motherAvatarB64: motherAvatarB64 || undefined,
          familyName:
            ancestorFamilyName.trim() ||
            `${ancestorFather.trim() || ancestorMother.trim()} Household`,
          branchColor: '#1E293B',
        });
      } else if (mode === 'add_sibling') {
        if (!siblingFullName.trim()) throw new Error((t.siblingName || 'Sibling name') + ' is required.');
        const targetPersonId = person?.id;
        if (!targetPersonId) throw new Error('Person reference is required.');

        await onMutate('add_sibling', {
          personId: targetPersonId,
          siblingFullName: siblingFullName.trim(),
          birthYear: siblingBirthYear.trim(),
          phoneE164: siblingPhone.trim(),
          spouseFullName: siblingSpouseName.trim() || undefined,
          avatarB64: siblingAvatarB64 || undefined,
          parentName: siblingParentName.trim() || undefined,
          city: household?.city,
          country: household?.country,
        });
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  // Claim Profile Action
  const handleClaimProfile = async () => {
    if (!person) return;
    setError(null);
    setLoading(true);
    try {
      await onMutate('claim_profile', { personId: person.id });
      if (onProfileClaimed) {
        onProfileClaimed({ ...person, claimed_device_id: deviceId });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  // Role Promotion / Demotion Action
  const handleToggleRole = async () => {
    if (!person) return;
    const targetRole = person.role === 'branch_admin' ? 'member' : 'branch_admin';
    setError(null);
    setLoading(true);
    try {
      await onMutate('set_role', {
        targetPersonId: person.id,
        role: targetRole,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  // Delete Node Action
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setError(null);
    setLoading(true);
    try {
      if (confirmDelete === 'person' && person) {
        await onMutate('delete_person', { personId: person.id });
      } else if (confirmDelete === 'household' && household) {
        await onMutate('delete_household', { householdId: household.id });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorOccurred);
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  const isClaimedByMe = person?.claimed_device_id === deviceId;
  const isUnclaimed = !person?.claimed_device_id;
  const canManageRole = userRole === 'super_admin' || userRole === 'branch_admin';

  const colorPresets = [
    '#0F172A', '#1E40AF', '#065F46', '#854D0E',
    '#991B1B', '#6B21A8', '#9D174D', '#155E75',
    '#334155', '#4338CA', '#047857', '#B45309',
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-base">
              {mode === 'edit_person' && t.editProfile}
              {mode === 'edit_household' && t.editHousehold}
              {mode === 'add_child' && t.addChildHousehold}
              {mode === 'add_spouse' && t.addSpouse}
              {mode === 'add_sibling' && (t.addSiblingTitle || t.addSibling)}
              {mode === 'add_ancestor' && t.addAncestorsAbove}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs if editing */}
        {(mode === 'edit_person' || mode === 'edit_household') && household && (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            {person && (
              <button
                type="button"
                onClick={() => setMode('edit_person')}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  mode === 'edit_person'
                    ? 'bg-white text-slate-900 border-b-2 border-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t.editProfile}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('edit_household')}
              className={`flex-1 py-2.5 text-center transition-colors ${
                mode === 'edit_household'
                  ? 'bg-white text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.editHousehold}
            </button>
          </div>
        )}

        {error && (
          <div className="m-5 mb-0 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
            {error}
          </div>
        )}

        {/* Delete Confirmation Warning */}
        {confirmDelete ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <h4 className="font-bold text-rose-900 text-sm">{t.confirmDeleteTitle}</h4>
              <p className="text-xs text-rose-700 mt-1">
                {confirmDelete === 'person' ? t.confirmDeletePersonMsg : t.confirmDeleteHouseholdMsg}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
              >
                {loading ? t.loading : t.deletePerson}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[78dvh] overflow-y-auto">
            {/* 1. EDIT PERSON MODE */}
            {mode === 'edit_person' && (
              <>
                {/* Claim Profile Banner */}
                {isUnclaimed && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-amber-900">{t.unclaimedProfile}</p>
                      <p className="text-[11px] text-amber-700">{t.claimProfileSubtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClaimProfile}
                      disabled={loading}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {t.claimThisProfile}
                    </button>
                  </div>
                )}

                {isClaimedByMe && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t.profileClaimed}</span>
                  </div>
                )}

                {/* Avatar upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    {t.personalPhoto}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                      {avatarB64 ? (
                        <img src={avatarB64} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.uploadPhoto}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFile}
                            className="hidden"
                          />
                        </label>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Camera className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.takePhoto}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={handleAvatarFile}
                            className="hidden"
                          />
                        </label>
                        {avatarB64 && (
                          <button
                            type="button"
                            onClick={() => {
                              setAvatarB64('');
                              setAvatarSizeKb(null);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          >
                            {t.removePhoto}
                          </button>
                        )}
                      </div>
                      {avatarSizeKb !== null && (
                        <p className="text-[11px] text-slate-500">
                          {t.compressedSizeLabel} <strong className="text-slate-800">{avatarSizeKb} KB</strong> (WebP)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.fullName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.maidenOrNickname}
                  </label>
                  <input
                    type="text"
                    value={nicknameOrMaiden}
                    onChange={(e) => setNicknameOrMaiden(e.target.value)}
                    placeholder={t.nicknamePlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.phoneNumber}
                  </label>
                  <input
                    type="tel"
                    value={phoneE164}
                    onChange={(e) => setPhoneE164(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {t.birthYear}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))}
                      placeholder={t.birthYearPlaceholder}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {t.deathYear}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={deathYear}
                      onChange={(e) => setDeathYear(e.target.value.replace(/\D/g, ''))}
                      placeholder={t.deathYearPlaceholder}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isLiving"
                    checked={isLiving}
                    onChange={(e) => setIsLiving(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <label htmlFor="isLiving" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    {t.isLivingCheck}
                  </label>
                </div>

                {/* Role Promotion Button */}
                {person && canManageRole && person.role !== 'super_admin' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        {t.roleLabel} {person.role === 'branch_admin' ? t.branchAdminBadge : t.memberBadge}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleRole}
                      disabled={loading}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {person.role === 'branch_admin' ? (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                          {t.demoteToMember}
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                          {t.promoteBranchAdmin}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* 2. EDIT HOUSEHOLD MODE */}
            {mode === 'edit_household' && (
              <>
                {/* Family Photo Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    {t.familyPhoto}
                  </label>
                  <div className="space-y-2">
                    {familyPhotoB64 ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                        <img
                          src={familyPhotoB64}
                          alt="Family Group"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFamilyPhotoB64('');
                            setPhotoSizeKb(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-slate-950/70 text-white rounded-lg hover:bg-slate-950 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                        <Camera className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">{t.uploadPhoto}</span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          {t.compressedSizeLabel} 1280px WebP
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFamilyPhotoFile}
                          className="hidden"
                        />
                      </label>
                    )}

                    {photoSizeKb !== null && (
                      <p className="text-[11px] text-slate-500">
                        {t.compressedSizeLabel} <strong className="text-slate-800">{photoSizeKb} KB</strong> (WebP)
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.newFamilyName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder={t.newFamilyPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.branchColorLabel}
                  </label>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBranchColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          branchColor === color ? 'scale-120 border-slate-900 shadow-xs' : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={branchColor}
                      onChange={(e) => setBranchColor(e.target.value)}
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0 ml-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.addressLine}
                  </label>
                  <input
                    type="text"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder={t.addressPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {t.cityLabel}
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {t.postalCode}
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {t.countryLabel}
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 3. ADD CHILD / NEW FAMILY MODE */}
            {mode === 'add_child' && (
              <>
                <p className="text-xs text-slate-500">
                  {t.addChildNotice.replace('{name}', person?.full_name || 'parent')}
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.childName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={childFullName}
                    onChange={(e) => setChildFullName(e.target.value)}
                    placeholder={t.childPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Child Photo Upload & Camera */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    {t.personalPhoto} {t.optionalLabel}
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {childAvatarB64 ? (
                        <img src={childAvatarB64} alt="Child preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.uploadPhoto}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleAvatarUpload(e, setChildAvatarB64, setChildAvatarSizeKb)}
                            className="hidden"
                          />
                        </label>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Camera className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.takePhoto}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={(e) => handleAvatarUpload(e, setChildAvatarB64, setChildAvatarSizeKb)}
                            className="hidden"
                          />
                        </label>
                        {childAvatarB64 && (
                          <button
                            type="button"
                            onClick={() => {
                              setChildAvatarB64('');
                              setChildAvatarSizeKb(null);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          >
                            {t.removePhoto}
                          </button>
                        )}
                      </div>
                      {childAvatarSizeKb !== null && (
                        <p className="text-[11px] text-slate-500">
                          {t.compressedSizeLabel} <strong className="text-slate-800">{childAvatarSizeKb} KB</strong> (WebP)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.spouseName} {t.optionalLabel}
                  </label>
                  <input
                    type="text"
                    value={childSpouseName}
                    onChange={(e) => setChildSpouseName(e.target.value)}
                    placeholder={t.spousePlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.birthYear} {t.optionalLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={childBirthYear}
                    onChange={(e) => setChildBirthYear(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.birthYearPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </>
            )}

            {/* 4. ADD SPOUSE MODE */}
            {mode === 'add_spouse' && (
              <>
                <p className="text-xs text-slate-500">
                  {t.addSpouseNotice.replace('{name}', person?.full_name || household?.family_name || '')}
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.spouseName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={spouseFullName}
                    onChange={(e) => setSpouseFullName(e.target.value)}
                    placeholder={t.spousePlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Spouse Photo Upload & Camera */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    {t.personalPhoto} {t.optionalLabel}
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {spouseAvatarB64 ? (
                        <img src={spouseAvatarB64} alt="Spouse preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.uploadPhoto}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleAvatarUpload(e, setSpouseAvatarB64, setSpouseAvatarSizeKb)}
                            className="hidden"
                          />
                        </label>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Camera className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.takePhoto}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={(e) => handleAvatarUpload(e, setSpouseAvatarB64, setSpouseAvatarSizeKb)}
                            className="hidden"
                          />
                        </label>
                        {spouseAvatarB64 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSpouseAvatarB64('');
                              setSpouseAvatarSizeKb(null);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          >
                            {t.removePhoto}
                          </button>
                        )}
                      </div>
                      {spouseAvatarSizeKb !== null && (
                        <p className="text-[11px] text-slate-500">
                          {t.compressedSizeLabel} <strong className="text-slate-800">{spouseAvatarSizeKb} KB</strong> (WebP)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {t.birthYear}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={spouseBirthYear}
                      onChange={(e) => setSpouseBirthYear(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {t.phoneNumber}
                    </label>
                    <input
                      type="tel"
                      value={spousePhone}
                      onChange={(e) => setSpousePhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 5. ADD ANCESTORS ABOVE MODE */}
            {mode === 'add_ancestor' && (
              <>
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600">
                  {t.addAncestorNotice.replace('{name}', person?.full_name || '')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.ancestorFather}
                  </label>
                  <input
                    type="text"
                    value={ancestorFather}
                    onChange={(e) => setAncestorFather(e.target.value)}
                    placeholder={t.fatherPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {ancestorFather.trim() && (
                    <div className="flex items-center gap-2 mt-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                        <Upload className="w-3 h-3 text-slate-500" />
                        <span>{t.uploadPhoto}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleAvatarUpload(e, setFatherAvatarB64, setFatherAvatarSizeKb)}
                          className="hidden"
                        />
                      </label>
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                        <Camera className="w-3 h-3 text-slate-500" />
                        <span>{t.takePhoto}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={(e) => handleAvatarUpload(e, setFatherAvatarB64, setFatherAvatarSizeKb)}
                          className="hidden"
                        />
                      </label>
                      {fatherAvatarB64 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFatherAvatarB64('');
                            setFatherAvatarSizeKb(null);
                          }}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          {t.removePhoto}
                        </button>
                      )}
                      {fatherAvatarSizeKb !== null && (
                        <span className="text-[11px] text-slate-400">({fatherAvatarSizeKb} KB)</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.ancestorMother}
                  </label>
                  <input
                    type="text"
                    value={ancestorMother}
                    onChange={(e) => setAncestorMother(e.target.value)}
                    placeholder={t.motherPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {ancestorMother.trim() && (
                    <div className="flex items-center gap-2 mt-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                        <Upload className="w-3 h-3 text-slate-500" />
                        <span>{t.uploadPhoto}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleAvatarUpload(e, setMotherAvatarB64, setMotherAvatarSizeKb)}
                          className="hidden"
                        />
                      </label>
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                        <Camera className="w-3 h-3 text-slate-500" />
                        <span>{t.takePhoto}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={(e) => handleAvatarUpload(e, setMotherAvatarB64, setMotherAvatarSizeKb)}
                          className="hidden"
                        />
                      </label>
                      {motherAvatarB64 && (
                        <button
                          type="button"
                          onClick={() => {
                            setMotherAvatarB64('');
                            setMotherAvatarSizeKb(null);
                          }}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          {t.removePhoto}
                        </button>
                      )}
                      {motherAvatarSizeKb !== null && (
                        <span className="text-[11px] text-slate-400">({motherAvatarSizeKb} KB)</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.newFamilyName}
                  </label>
                  <input
                    type="text"
                    value={ancestorFamilyName}
                    onChange={(e) => setAncestorFamilyName(e.target.value)}
                    placeholder={t.newFamilyPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </>
            )}

            {/* 6. ADD SIBLING MODE */}
            {mode === 'add_sibling' && (
              <>
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600">
                  {t.addSiblingNotice}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.siblingName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={siblingFullName}
                    onChange={(e) => setSiblingFullName(e.target.value)}
                    placeholder={t.siblingPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Sibling Photo Upload & Camera */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    {t.personalPhoto} {t.optionalLabel}
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {siblingAvatarB64 ? (
                        <img src={siblingAvatarB64} alt="Sibling preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.uploadPhoto}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleAvatarUpload(e, setSiblingAvatarB64, setSiblingAvatarSizeKb)}
                            className="hidden"
                          />
                        </label>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Camera className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.takePhoto}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={(e) => handleAvatarUpload(e, setSiblingAvatarB64, setSiblingAvatarSizeKb)}
                            className="hidden"
                          />
                        </label>
                        {siblingAvatarB64 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSiblingAvatarB64('');
                              setSiblingAvatarSizeKb(null);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          >
                            {t.removePhoto}
                          </button>
                        )}
                      </div>
                      {siblingAvatarSizeKb !== null && (
                        <p className="text-[11px] text-slate-500">
                          {t.compressedSizeLabel} <strong className="text-slate-800">{siblingAvatarSizeKb} KB</strong> (WebP)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {t.birthYear}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={siblingBirthYear}
                      onChange={(e) => setSiblingBirthYear(e.target.value.replace(/\D/g, ''))}
                      placeholder={t.birthYearPlaceholder}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {t.phoneNumber}
                    </label>
                    <input
                      type="tel"
                      value={siblingPhone}
                      onChange={(e) => setSiblingPhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.spouseName} {t.optionalLabel}
                  </label>
                  <input
                    type="text"
                    value={siblingSpouseName}
                    onChange={(e) => setSiblingSpouseName(e.target.value)}
                    placeholder={t.spousePlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t.optionalParentsNotice}
                  </label>
                  <input
                    type="text"
                    value={siblingParentName}
                    onChange={(e) => setSiblingParentName(e.target.value)}
                    placeholder={t.optionalParentsPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </>
            )}

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                {/* Delete button (if allowed) */}
                {mode === 'edit_person' && person && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete('person')}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.deletePerson}</span>
                  </button>
                )}

                {mode === 'edit_household' && household && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete('household')}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.deleteHousehold}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? t.saving : t.saveChanges}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
