"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Plus, ThumbsDown, ThumbsUp, X } from "lucide-react";
import type { FoodPreference, FoodRestriction } from "@/lib/types";
import type { Locale } from "@/lib/i18n/locale";
import { t, type TranslationKey } from "@/lib/i18n/translations";
import {
  addFoodPreferenceAction,
  addFoodRestrictionAction,
  removeFoodPreferenceAction,
  removeFoodRestrictionAction
} from "@/lib/actions/profile";

const RESTRICTION_TYPES: { value: FoodRestriction["type"]; labelKey: TranslationKey }[] = [
  { value: "allergy", labelKey: "restrictionTypeAllergy" },
  { value: "medical", labelKey: "restrictionTypeMedical" },
  { value: "religious", labelKey: "restrictionTypeReligious" },
  { value: "diet", labelKey: "restrictionTypeDiet" }
];

const RESTRICTION_TYPE_LABEL: Record<FoodRestriction["type"], TranslationKey> = {
  allergy: "restrictionTypeAllergy",
  medical: "restrictionTypeMedical",
  religious: "restrictionTypeReligious",
  diet: "restrictionTypeDiet"
};

export function FoodProfileEditor({
  tripId,
  tripMemberId,
  restrictions,
  preferences,
  canEdit,
  locale
}: {
  tripId: string;
  tripMemberId: string;
  restrictions: FoodRestriction[];
  preferences: FoodPreference[];
  canEdit: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addingRestriction, setAddingRestriction] = useState(false);
  const [addingPreference, setAddingPreference] = useState(false);

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="rounded-lg bg-criticalSoft px-3 py-2 text-[12.5px] font-medium text-critical">{error}</p>}

      {/* Restrictions: a hard safety constraint, always visually distinct from soft preferences. */}
      <section>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-critical">
          <AlertTriangle size={13} /> {t(locale, "allergiesRestrictions")}
        </p>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-critical/25 bg-criticalSoft/40 p-3">
          {restrictions.length === 0 && !addingRestriction && (
            <p className="px-1 py-1 text-[12.5px] text-inkSoft">{t(locale, "noRestrictionsOnFile")}</p>
          )}
          {restrictions.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">{r.label}</p>
                <p className="text-[11px] uppercase tracking-wide text-inkFaint">{t(locale, RESTRICTION_TYPE_LABEL[r.type])}</p>
                {r.notes && <p className="text-[12px] text-inkFaint">{r.notes}</p>}
              </div>
              {canEdit && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => removeFoodRestrictionAction(tripId, tripMemberId, r.id))}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-inkFaint hover:bg-criticalSoft hover:text-critical"
                  aria-label={t(locale, "removeRestriction")}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}

          {canEdit &&
            (addingRestriction ? (
              <RestrictionForm
                locale={locale}
                onCancel={() => setAddingRestriction(false)}
                onSubmit={(fields) => {
                  setAddingRestriction(false);
                  run(() => addFoodRestrictionAction(tripId, tripMemberId, fields));
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingRestriction(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-critical/40 py-2 text-[12.5px] font-semibold text-critical"
              >
                <Plus size={14} /> {t(locale, "addRestriction")}
              </button>
            ))}
        </div>
      </section>

      {/* Preferences: soft signal only — never conflated with the restrictions above. */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-inkFaint">{t(locale, "foodPreferences")}</p>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface2/50 p-3">
          {preferences.length === 0 && !addingPreference && <p className="px-1 py-1 text-[12.5px] text-inkSoft">{t(locale, "noPreferencesYet")}</p>}
          {preferences.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 shadow-card">
              {p.category === "like" ? <ThumbsUp size={14} className="flex-none text-good" /> : <ThumbsDown size={14} className="flex-none text-inkFaint" />}
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{p.label}</p>
              {canEdit && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => removeFoodPreferenceAction(tripId, tripMemberId, p.id))}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-inkFaint hover:bg-surface2"
                  aria-label={t(locale, "removePreference")}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}

          {canEdit &&
            (addingPreference ? (
              <PreferenceForm
                locale={locale}
                onCancel={() => setAddingPreference(false)}
                onSubmit={(fields) => {
                  setAddingPreference(false);
                  run(() => addFoodPreferenceAction(tripId, tripMemberId, fields));
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingPreference(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-[12.5px] font-semibold text-inkSoft"
              >
                <Plus size={14} /> {t(locale, "addPreference")}
              </button>
            ))}
        </div>
      </section>

      {pending && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-inkFaint">
          <Loader2 size={12} className="animate-spin" /> {t(locale, "saving")}
        </p>
      )}
    </div>
  );
}

function RestrictionForm({
  locale,
  onSubmit,
  onCancel
}: {
  locale: Locale;
  onSubmit: (fields: Omit<FoodRestriction, "id" | "tripMemberId">) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<FoodRestriction["type"]>("allergy");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const inputCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        onSubmit({ type, label: label.trim(), notes: notes.trim() || undefined });
      }}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-critical/40 bg-surface p-3"
    >
      <div className="flex gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as FoodRestriction["type"])} className={`${inputCls} w-28 flex-none`}>
          {RESTRICTION_TYPES.map((rt) => (
            <option key={rt.value} value={rt.value}>
              {t(locale, rt.labelKey)}
            </option>
          ))}
        </select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Peanut allergy" className={inputCls} autoFocus />
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t(locale, "notesOptional")} className={inputCls} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-inkFaint">
          {t(locale, "cancel")}
        </button>
        <button type="submit" className="rounded-lg bg-critical px-3.5 py-1.5 text-[12.5px] font-bold text-white">
          {t(locale, "add")}
        </button>
      </div>
    </form>
  );
}

function PreferenceForm({
  locale,
  onSubmit,
  onCancel
}: {
  locale: Locale;
  onSubmit: (fields: Omit<FoodPreference, "id" | "tripMemberId">) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<FoodPreference["category"]>("like");
  const [label, setLabel] = useState("");
  const inputCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        onSubmit({ category, label: label.trim(), weight: 3 });
      }}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-surface p-3"
    >
      <div className="flex gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value as FoodPreference["category"])} className={`${inputCls} w-24 flex-none`}>
          <option value="like">{t(locale, "likes")}</option>
          <option value="dislike">{t(locale, "dislikes")}</option>
        </select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Ramen" className={inputCls} autoFocus />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-inkFaint">
          {t(locale, "cancel")}
        </button>
        <button type="submit" className="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-bold text-accentInk">
          {t(locale, "add")}
        </button>
      </div>
    </form>
  );
}
