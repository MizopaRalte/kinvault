import React, { useMemo } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Edit2,
  Home,
  Plus,
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Focus,
  Camera,
  GitCompare,
} from 'lucide-react';
import type { Person, Household, Relationship } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';
import { calculateKinship } from '../utils/kinshipCalculator';

interface PersonDetailModalProps {
  person: Person | null;
  household?: Household;
  allPersons: Person[];
  allHouseholds: Household[];
  relationships: Relationship[];
  t: TranslationDictionary;
  deviceId: string;
  activePersonId?: string;
  onClose: () => void;
  onSelectPerson: (person: Person, household?: Household) => void;
  onOpenMemberModal: (person?: Person, household?: Household, initialMode?: string) => void;
  onFocusBranch?: (householdId: string) => void;
  onStartCompare?: (person: Person, household?: Household) => void;
  onPreviewPhoto?: (photoUrl: string) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  person,
  household,
  allPersons,
  allHouseholds,
  relationships,
  t,
  deviceId,
  activePersonId,
  onClose,
  onSelectPerson,
  onOpenMemberModal,
  onFocusBranch,
  onStartCompare,
  onPreviewPhoto,
}) => {
  const familyConnections = useMemo(() => {
    if (!person) return { parents: [], spouses: [], siblings: [], children: [] };

    const personMap = new Map<string, Person>();
    for (const p of allPersons) personMap.set(p.id, p);

    const parentIds = new Set<string>();
    const spouseIds = new Set<string>();
    const childIds = new Set<string>();

    for (const r of relationships) {
      if (r.rel_type === 'parent_child') {
        if (r.person_b_id === person.id) parentIds.add(r.person_a_id);
        if (r.person_a_id === person.id) childIds.add(r.person_b_id);
      } else if (r.rel_type === 'spouse') {
        if (r.person_a_id === person.id) spouseIds.add(r.person_b_id);
        if (r.person_b_id === person.id) spouseIds.add(r.person_a_id);
      }
    }

    // Siblings share at least one parent
    const siblingIds = new Set<string>();
    if (parentIds.size > 0) {
      for (const r of relationships) {
        if (
          r.rel_type === 'parent_child' &&
          parentIds.has(r.person_a_id) &&
          r.person_b_id !== person.id
        ) {
          siblingIds.add(r.person_b_id);
        }
      }
    }

    return {
      parents: Array.from(parentIds).map((id) => personMap.get(id)).filter((p): p is Person => !!p),
      spouses: Array.from(spouseIds).map((id) => personMap.get(id)).filter((p): p is Person => !!p),
      siblings: Array.from(siblingIds).map((id) => personMap.get(id)).filter((p): p is Person => !!p),
      children: Array.from(childIds).map((id) => personMap.get(id)).filter((p): p is Person => !!p),
    };
  }, [person, allPersons, relationships]);

  const relationToYou = useMemo(() => {
    if (!person || !activePersonId || activePersonId === person.id) return null;
    const res = calculateKinship(activePersonId, person.id, allPersons, relationships, t);
    return res.key === 'none' ? null : res;
  }, [person, activePersonId, allPersons, relationships, t]);

  if (!person) return null;

  const branchColor = household?.branch_color || '#0F172A';
  const isClaimedByMe = person.claimed_device_id === deviceId;
  const fullAddress = [
    household?.address_line,
    household?.city,
    household?.postal_code,
    household?.country,
  ]
    .filter(Boolean)
    .join(', ');

  const yearSpan = person.birth_year
    ? `${person.birth_year} – ${person.is_living ? t.present : person.death_year || '?'}`
    : person.is_living
    ? t.living
    : person.death_year || t.deceased;

  const cleanPhoneForWhatsApp = person.phone_e164?.replace(/[^\d]/g, '') || '';

  const jumpToPerson = (target: Person) => {
    const targetHousehold = allHouseholds.find((h) => h.id === target.household_id);
    onSelectPerson(target, targetHousehold);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Banner */}
        <div className="h-3 w-full" style={{ backgroundColor: branchColor }} />

        {/* Header & Close */}
        <div className="px-6 pt-4 pb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (person.avatar_b64 && onPreviewPhoto) onPreviewPhoto(person.avatar_b64);
              }}
              className={`w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform ${
                person.avatar_b64 ? 'cursor-pointer hover:scale-105' : 'cursor-default'
              }`}
              style={{ border: `4px solid ${branchColor}` }}
            >
              {person.avatar_b64 ? (
                <img
                  src={person.avatar_b64}
                  alt={person.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-extrabold text-slate-600">
                  {person.full_name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </button>

            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                {person.full_name}
              </h3>
              {person.nickname_or_maiden && (
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  ({person.nickname_or_maiden})
                </p>
              )}
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {yearSpan}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    person.is_living
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {person.is_living ? t.living : t.deceased}
                </span>
                {isClaimedByMe && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    <UserCheck className="w-2.5 h-2.5" />
                    {t.claimedByYou}
                  </span>
                )}
                {person.role === 'super_admin' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
                {person.role === 'branch_admin' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    {t.branchAdminBadge}
                  </span>
                )}
              </div>

              {relationToYou && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-[11px] font-bold">
                  <GitCompare className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>{t.relationToYou}: {relationToYou.label}</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-4 space-y-4 max-h-[70dvh] overflow-y-auto">
          {/* Contact & Address Information */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
            {/* Telephone */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    {t.phoneNumber}
                  </p>
                  <p className="text-xs font-mono font-semibold text-slate-800 truncate">
                    {person.phone_e164 || t.noPhone}
                  </p>
                </div>
              </div>

              {person.phone_e164 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${person.phone_e164}`}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <Phone className="w-3 h-3 text-slate-600" />
                    {t.call}
                  </a>
                  {cleanPhoneForWhatsApp && (
                    <a
                      href={`https://wa.me/${cleanPhoneForWhatsApp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      {t.whatsApp}
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200/70" />

            {/* Address */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    {t.addressLabel} {household?.family_name ? `• ${household.family_name}` : ''}
                  </p>
                  <p className="text-xs font-medium text-slate-800 leading-snug">
                    {fullAddress || t.noAddress}
                  </p>
                </div>
              </div>

              {fullAddress && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 flex items-center gap-1 transition-colors shrink-0"
                >
                  <MapPin className="w-3 h-3 text-slate-600" />
                  {t.maps}
                </a>
              )}
            </div>

            {household?.family_photo_b64 && onPreviewPhoto && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onPreviewPhoto(household.family_photo_b64!)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.familyPhoto}</span>
                </button>
              </div>
            )}
          </div>

          {/* Family Connections Navigation Chips */}
          {(familyConnections.parents.length > 0 ||
            familyConnections.spouses.length > 0 ||
            familyConnections.siblings.length > 0 ||
            familyConnections.children.length > 0) && (
            <div className="space-y-2.5">
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {t.statsRelationships}
              </h4>

              <div className="space-y-2 text-xs">
                {familyConnections.parents.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-semibold w-20 shrink-0 pt-1">
                      {t.parentsLabel}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {familyConnections.parents.map((rel) => (
                        <button
                          key={rel.id}
                          type="button"
                          onClick={() => jumpToPerson(rel)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          {rel.full_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {familyConnections.spouses.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-semibold w-20 shrink-0 pt-1">
                      {t.spouseLabel}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {familyConnections.spouses.map((rel) => (
                        <button
                          key={rel.id}
                          type="button"
                          onClick={() => jumpToPerson(rel)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-900 font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          {rel.full_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {familyConnections.siblings.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-semibold w-20 shrink-0 pt-1">
                      {t.siblingsLabel}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {familyConnections.siblings.map((rel) => (
                        <button
                          key={rel.id}
                          type="button"
                          onClick={() => jumpToPerson(rel)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          {rel.full_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {familyConnections.children.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-semibold w-20 shrink-0 pt-1">
                      {t.childrenLabel}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {familyConnections.children.map((rel) => (
                        <button
                          key={rel.id}
                          type="button"
                          onClick={() => jumpToPerson(rel)}
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-900 font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          {rel.full_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Relative Quick Buttons */}
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
              {t.treeTab}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMemberModal(person, household, 'add_ancestor');
                }}
                className="py-2 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.addAncestorsAbove.replace(/^\+\s*/, '')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMemberModal(person, household, 'add_spouse');
                }}
                className="py-2 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.addSpouse.replace(/^\+\s*/, '')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMemberModal(person, household, 'add_sibling');
                }}
                className="py-2 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.addSibling.replace(/^\+\s*/, '')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMemberModal(person, household, 'add_child');
                }}
                className="py-2 px-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.addChildHousehold.replace(/^\+\s*/, '')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Edit & Focus Actions */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMemberModal(person, household, 'edit_person');
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.editProfile}</span>
            </button>

            {household && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMemberModal(person, household, 'edit_household');
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">{t.addressLabel}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onStartCompare && (
              <button
                type="button"
                onClick={() => {
                  onStartCompare(person, household);
                  onClose();
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>{t.compareRelation}</span>
              </button>
            )}

            {household && onFocusBranch && (
              <button
                type="button"
                onClick={() => {
                  onFocusBranch(household.id);
                  onClose();
                }}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Focus className="w-3.5 h-3.5" />
                <span>{t.focusBranch}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
