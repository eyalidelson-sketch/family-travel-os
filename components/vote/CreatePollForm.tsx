"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Vote, X } from "lucide-react";
import { createPollAction } from "@/lib/actions/vote";
import type { Locale } from "@/lib/i18n/locale";
import { t, optionNLabel } from "@/lib/i18n/translations";

export function CreatePollForm({ tripId, locale }: { tripId: string; locale: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-[13.5px] font-semibold text-inkSoft hover:bg-surface2"
      >
        <Vote size={15} /> {t(locale, "startFamilyVote")}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await createPollAction(tripId, question, options);
          if (result.error) setError(result.error);
          else {
            setError(null);
            setOpen(false);
            setQuestion("");
            setOptions(["", ""]);
            router.refresh();
          }
        });
      }}
      className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-accent/40 bg-accentSoft/20 p-4"
    >
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={t(locale, "pollQuestionPlaceholder")}
        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-accent"
        autoFocus
      />

      <div className="flex flex-col gap-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt}
              onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
              placeholder={optionNLabel(locale, i + 1)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-[13.5px] text-ink outline-none focus:border-accent"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-md text-inkFaint hover:bg-surface2"
                aria-label={t(locale, "removeOption")}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {options.length < 4 && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ""])}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-1.5 text-[12.5px] font-semibold text-inkSoft"
          >
            <Plus size={13} /> {t(locale, "addOption")}
          </button>
        )}
      </div>

      {error && <p className="text-[12px] font-medium text-critical">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-inkFaint">
          {t(locale, "cancel")}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-bold text-accentInk disabled:opacity-60"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : null} {t(locale, "startVote")}
        </button>
      </div>
    </form>
  );
}
