"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Info, Loader2, X } from "lucide-react";
import type { TripCheckIssue } from "@/lib/tripcheck/analyze";
import { applyTripCheckFixAction, dismissTripCheckIssueAction } from "@/lib/actions/tripcheck";

const TYPE_LABELS: Record<TripCheckIssue["type"], string> = {
  heavy_day: "Heavy day",
  tight_transit: "Tight transit",
  backtrack: "Backtracking",
  missing_meal: "No meal scheduled"
};

export function IssueCard({ tripId, issue }: { tripId: string; issue: TripCheckIssue }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hidden) return null;

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else {
        setHidden(true);
        router.refresh();
      }
    });
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-card ${issue.severity === "warn" ? "border-warn/30 bg-warnSoft" : "border-border bg-surface"}`}>
      <div className="mb-1.5 flex items-center gap-2">
        {issue.severity === "warn" ? <AlertTriangle size={14} className="flex-none text-warn" /> : <Info size={14} className="flex-none text-inkFaint" />}
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-inkFaint">
          {issue.dayLabel} · {TYPE_LABELS[issue.type]}
        </span>
      </div>
      <p className="mb-1 text-[14.5px] font-bold text-ink">{issue.title}</p>
      <p className="mb-3 text-[13px] text-inkSoft">{issue.detail}</p>

      {error && <p className="mb-2 text-[12px] font-medium text-critical">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => applyTripCheckFixAction(tripId, issue))}
          className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-bold text-bg disabled:opacity-60"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {issue.fix.label}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => dismissTripCheckIssueAction(tripId, issue.id))}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-inkFaint hover:bg-surface2"
        >
          <X size={12} /> Dismiss
        </button>
      </div>
    </div>
  );
}
