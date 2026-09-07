"use client";

import { Check, Loader2 } from "lucide-react";
import { PARSE_STAGE_LABELS, PARSE_STAGE_ORDER, type ParseStage } from "@/lib/parsing-types";

const VISIBLE_STAGES = PARSE_STAGE_ORDER.filter((s) => s !== "done");

export function ParsingProgress({ currentStage, title }: { currentStage: ParseStage | null; title?: string }) {
  const currentIndex =
    currentStage === "done" ? VISIBLE_STAGES.length : currentStage ? VISIBLE_STAGES.indexOf(currentStage) : -1;

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-accentSoft text-accent">
        <Loader2 size={26} className="animate-spin" />
      </div>
      <h1 className="mb-8 text-xl font-semibold text-ink">{title ?? "Reading your itinerary"}</h1>
      <ul className="flex w-full max-w-xs flex-col gap-3.5 text-left">
        {VISIBLE_STAGES.map((stage, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <li key={stage} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${
                  isDone ? "bg-good text-white" : isCurrent ? "bg-accent text-accentInk" : "bg-surface2 text-inkFaint"
                }`}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : isCurrent ? <Loader2 size={12} className="animate-spin" /> : null}
              </span>
              <span className={`text-[15px] font-medium ${isCurrent ? "text-ink" : isDone ? "text-inkSoft" : "text-inkFaint"}`}>
                {PARSE_STAGE_LABELS[stage]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
