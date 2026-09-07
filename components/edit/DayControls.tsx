"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { addDayAction, deleteDayAction } from "@/lib/actions/itinerary";

export function DayControls({ tripId, dayId, canDelete }: { tripId: string; dayId: string; canDelete: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addDay() {
    startTransition(async () => {
      const result = await addDayAction(tripId, dayId);
      if (result.error) setError(result.error);
      else if (result.dayId) router.push(`/t/${tripId}/today?day=${result.dayId}&edit=1`);
    });
  }

  function deleteDay() {
    startTransition(async () => {
      const result = await deleteDayAction(tripId, dayId);
      if (result.error) setError(result.error);
      else router.push(`/t/${tripId}/today?edit=1`);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {error && <p className="text-[11.5px] font-medium text-critical">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={addDay}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-inkSoft hover:bg-surface2 disabled:opacity-50"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add day after
        </button>
        {canDelete &&
          (confirming ? (
            <div className="flex items-center gap-1 rounded-lg bg-criticalSoft px-1.5 py-1">
              <button type="button" disabled={pending} onClick={deleteDay} className="px-1 text-[11.5px] font-bold text-critical">
                Delete this day?
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="flex h-5 w-5 items-center justify-center text-critical" aria-label="Cancel">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-inkSoft hover:bg-criticalSoft hover:text-critical"
            >
              <Trash2 size={12} /> Delete day
            </button>
          ))}
      </div>
    </div>
  );
}
