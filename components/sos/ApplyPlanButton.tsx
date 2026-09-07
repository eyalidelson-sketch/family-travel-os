"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { applySosPlanAction } from "@/lib/actions/sos";
import type { RescuePlan } from "@/lib/sos/plans";

export function ApplyPlanButton({ tripId, dayId, afterTime, plan }: { tripId: string; dayId: string; afterTime: string; plan: RescuePlan }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-goodSoft px-3.5 py-2 text-[13px] font-bold text-good">
        <Check size={14} /> Applied — check Today
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await applySosPlanAction(tripId, dayId, afterTime, plan.action);
            if (result.error) setError(result.error);
            else {
              setDone(true);
              router.refresh();
            }
          })
        }
        className="flex items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-[13.5px] font-bold text-bg disabled:opacity-60"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null} Apply this plan
      </button>
      {error && <p className="text-[11.5px] font-medium text-critical">{error}</p>}
    </div>
  );
}
