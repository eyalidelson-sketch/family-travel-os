"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import { addItineraryItemAction } from "@/lib/actions/itinerary";
import type { Restaurant } from "@/lib/food/restaurants";

export function AddToTodayButton({
  tripId,
  dayId,
  restaurant,
  label = "Add to today",
  addedLabel = "Added to today"
}: {
  tripId: string;
  dayId: string;
  restaurant: Restaurant;
  label?: string;
  addedLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-goodSoft px-3 py-1.5 text-[12.5px] font-bold text-good">
        <Check size={13} /> {addedLabel}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await addItineraryItemAction(tripId, dayId, {
              type: "meal",
              title: `Dinner at ${restaurant.name}`,
              placeName: restaurant.name,
              notes: `${restaurant.cuisine} · found via Family Food Finder`
            });
            if (result.error) setError(result.error);
            else {
              setDone(true);
              router.refresh();
            }
          })
        }
        className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12.5px] font-bold text-accentInk disabled:opacity-60"
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} {label}
      </button>
      {error && <p className="max-w-[160px] text-right text-[11px] font-medium text-critical">{error}</p>}
    </div>
  );
}
