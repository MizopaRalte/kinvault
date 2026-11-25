import React, { useState, useMemo } from 'react';
import {
  Search,
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
  Edit2,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Trees,
} from 'lucide-react';
import type { Household, Person, Role } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';

interface DirectoryViewProps {
  households: Household[];
  persons: Person[];
  t: TranslationDictionary;
  activePersonId?: string;
  userRole?: Role;
  onLocateOnTree?: (person: Person) => void;
  onOpenMemberModal: (person?: Person, household?: Household, mode?: string) => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  households,
  persons,
  t,
  activePersonId,
  userRole: _userRole,
  onLocateOnTree,
  onOpenMemberModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Household map for quick lookup
  const householdMap = useMemo(() => {
    const map = new Map<string, Household>();
    for (const h of households) map.set(h.id, h);
    return map;
  }, [households]);

  // Extract distinct branch colors and cities
  const { branchColors, cities } = useMemo(() => {
    const colorSet = new Set<string>();
    const citySet = new Set<string>();

    for (const h of households) {
      if (h.branch_color) colorSet.add(h.branch_color);
      if (h.city?.trim()) citySet.add(h.city.trim());
    }

    return {
      branchColors: Array.from(colorSet),
      cities: Array.from(citySet).sort(),
    };
  }, [households]);

  // Filter persons
  const filteredPersons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return persons.filter((p) => {
      const household = p.household_id ? householdMap.get(p.household_id) : undefined;

      // Color filter
      if (selectedColor && household?.branch_color !== selectedColor) {
        return false;
      }

      // City filter
      if (selectedCity && household?.city?.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      // Search query filter
      if (!query) return true;

      const fullName = (p.full_name || '').toLowerCase();
      const nickname = (p.nickname_or_maiden || '').toLowerCase();
      const phone = (p.phone_e164 || '').toLowerCase();
      const birthYear = (p.birth_year || '').toLowerCase();
      const deathYear = (p.death_year || '').toLowerCase();
      const familyName = (household?.family_name || '').toLowerCase();
      const city = (household?.city || '').toLowerCase();
      const country = (household?.country || '').toLowerCase();
      const address = (household?.address_line || '').toLowerCase();
      const postalCode = (household?.postal_code || '').toLowerCase();

      return (
        fullName.includes(query) ||
        nickname.includes(query) ||
        phone.includes(query) ||
        birthYear.includes(query) ||
        deathYear.includes(query) ||
        familyName.includes(query) ||
        city.includes(query) ||
        country.includes(query) ||
        address.includes(query) ||
        postalCode.includes(query)
      );
    });
  }, [persons, householdMap, searchQuery, selectedColor, selectedCity]);

  // Helper to format full address for Google Maps query
  const formatAddress = (h?: Household): string => {
    if (!h) return '';
    return [h.address_line, h.city, h.postal_code, h.country].filter(Boolean).join(', ');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search and Filters Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-500 mr-1">{t.filterByBranch}:</span>

          <button
            type="button"
            onClick={() => setSelectedColor(null)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedColor === null
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.allBranches}
          </button>

          {branchColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(selectedColor === color ? null : color)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                selectedColor === color
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-mono text-[11px]">{color}</span>
            </button>
          ))}

          {cities.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
              <span className="font-semibold text-slate-500 mr-1">{t.filterByCity}:</span>

              <button
                type="button"
                onClick={() => setSelectedCity(null)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedCity === null
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.allCities}
              </button>

              {cities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(selectedCity === city ? null : city)}
                  className={`px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                    selectedCity === city
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {city}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Directory Grid */}
      {filteredPersons.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <p className="text-sm font-medium">{t.noMembersFound}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersons.map((person) => {
            const household = person.household_id ? householdMap.get(person.household_id) : undefined;
            const fullAddress = formatAddress(household);
            const digitsOnlyPhone = (person.phone_e164 || '').replace(/\D/g, '');
            const isSelf = person.id === activePersonId;
            const isSuperAdmin = person.role === 'super_admin';
            const isBranchAdmin = person.role === 'branch_admin';

            return (
              <div
                key={person.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                style={{
                  borderLeft: `5px solid ${household?.branch_color || '#0F172A'}`,
                }}
              >
                {/* Top Section */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {person.avatar_b64 ? (
                          <img
                            src={person.avatar_b64}
                            alt={person.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-base font-bold text-slate-600">
                            {person.full_name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            person.is_living ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={person.is_living ? t.living : t.deceased}
                        />
                      </div>

                      {/* Name & Household */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {person.full_name}
                          </h4>
                          {isSelf && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                              <UserCheck className="w-2.5 h-2.5" />
                              {t.claimedByYou}
                            </span>
                          )}
                        </div>

                        {person.nickname_or_maiden && (
                          <p className="text-xs text-slate-500 truncate">
                            ({person.nickname_or_maiden})
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-0.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: household?.branch_color || '#0F172A' }}
                          />
                          <span className="truncate">{household?.family_name || 'Family'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions: Show in Tree & Edit */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {onLocateOnTree && (
                        <button
                          type="button"
                          onClick={() => onLocateOnTree(person)}
                          title={t.locateOnTreeBtn}
                          aria-label={t.locateOnTreeBtn}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trees className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenMemberModal(person, household, 'edit_person')}
                        title={t.editProfile}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Badges / Dates / Address details */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {person.birth_year ? `${t.born} ${person.birth_year}` : ''}
                        {person.death_year ? ` • ${t.died} ${person.death_year}` : ''}
                      </span>
                      {isSuperAdmin && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <ShieldAlert className="w-3 h-3" />
                          {t.superAdminBadge}
                        </span>
                      )}
                      {isBranchAdmin && (
                        <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          {t.branchAdminBadge}
                        </span>
                      )}
                    </div>

                    {fullAddress && (
                      <div className="flex items-start gap-1.5 text-slate-500 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{fullAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reconnection 1-Tap Action Buttons */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                  {/* Call Button */}
                  {person.phone_e164 ? (
                    <a
                      href={`tel:${person.phone_e164}`}
                      className="py-2 px-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-700" />
                      <span>{t.call}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="py-2 px-2 bg-slate-50 text-slate-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-300" />
                      <span>{t.call}</span>
                    </button>
                  )}

                  {/* WhatsApp Button */}
                  {digitsOnlyPhone ? (
                    <a
                      href={`https://wa.me/${digitsOnlyPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.whatsApp}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="py-2 px-2 bg-slate-50 text-slate-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-slate-300" />
                      <span>{t.whatsApp}</span>
                    </button>
                  )}

                  {/* Google Maps Button */}
                  {fullAddress ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                      <span>{t.maps}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="py-2 px-2 bg-slate-50 text-slate-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                      <span>{t.maps}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
