import React from 'react';
import { X, ArrowLeftRight, GitCompare, ArrowRight } from 'lucide-react';
import type { Person, Household } from '../types/family';
import type { KinshipResult } from '../utils/kinshipCalculator';
import type { TranslationDictionary } from '../locales/translations';

interface KinshipModalProps {
  personA: Person | null;
  personB: Person | null;
  result: KinshipResult | null;
  households: Household[];
  t: TranslationDictionary;
  onClose: () => void;
  onSwap: () => void;
}

export const KinshipModal: React.FC<KinshipModalProps> = ({
  personA,
  personB,
  result,
  households,
  t,
  onClose,
  onSwap,
}) => {
  if (!personA || !personB || !result) return null;

  const getColor = (p: Person) => {
    const h = households.find((item) => item.id === p.household_id);
    return h?.branch_color || '#0F172A';
  };

  const description = t.kinshipDescriptionTemplate
    .replace('{target}', personB.full_name)
    .replace('{source}', personA.full_name)
    .replace('{relation}', result.label);

  return (
    <div
      className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <GitCompare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">{t.kinshipResultTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75dvh] overflow-y-auto">
          {/* Two Portraits + Relationship Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between gap-2">
              {/* Person A */}
              <div className="flex-1 flex flex-col items-center text-center min-w-0">
                <div
                  className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-xs"
                  style={{ border: `3px solid ${getColor(personA)}` }}
                >
                  {personA.avatar_b64 ? (
                    <img src={personA.avatar_b64} alt={personA.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-extrabold text-slate-600">
                      {personA.full_name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-2 leading-tight">
                  {personA.full_name}
                </p>
              </div>

              {/* Arrow + Swap */}
              <div className="flex flex-col items-center gap-1 shrink-0 px-1">
                <button
                  type="button"
                  onClick={onSwap}
                  title={t.kinshipSwapBtn}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Person B */}
              <div className="flex-1 flex flex-col items-center text-center min-w-0">
                <div
                  className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-xs"
                  style={{ border: `3px solid ${getColor(personB)}` }}
                >
                  {personB.avatar_b64 ? (
                    <img src={personB.avatar_b64} alt={personB.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-extrabold text-slate-600">
                      {personB.full_name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-2 leading-tight">
                  {personB.full_name}
                </p>
              </div>
            </div>

            {/* Big Relationship Highlight */}
            <div className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 text-center space-y-1 shadow-sm">
              <p className="text-sm sm:text-base font-extrabold tracking-tight">{result.label}</p>
              <p className="text-xs text-slate-300 leading-snug">{description}</p>
            </div>
          </div>

          {/* Visual Connection Path */}
          {result.path.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  {t.kinshipPathTitle}
                </h4>
                <button
                  type="button"
                  onClick={onSwap}
                  className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>{t.kinshipSwapBtn}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                {result.path.map((step, idx) => (
                  <React.Fragment key={`${step.id}-${idx}`}>
                    <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-1 pr-2.5 py-1 shadow-2xs">
                      <div
                        className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0"
                        style={{ border: `2px solid ${getColor(step)}` }}
                      >
                        {step.avatar_b64 ? (
                          <img src={step.avatar_b64} alt={step.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-bold text-slate-600">
                            {step.full_name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 max-w-[120px] truncate">
                        {step.full_name}
                      </span>
                    </div>

                    {idx < result.path.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
