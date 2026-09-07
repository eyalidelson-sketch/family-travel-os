"use client";

import { useState } from "react";
import { Languages, MoonStar, Sun, X } from "lucide-react";
import type { Place } from "@/lib/types";

/**
 * The one screen in this app that is deliberately NOT theme-aware: shown to
 * a taxi driver or station attendant who has never seen the app, so it
 * always maximizes contrast rather than following the trip member's light/
 * dark preference. No network call happens when this opens — the address
 * was already rendered into the page, so it works the instant it's tapped,
 * connection or not.
 */
export function ShowDriverModal({
  place,
  label,
  triggerClassName
}: {
  place: Place;
  label?: string;
  /** Override the trigger's styling — e.g. when it sits on top of a photo instead of a plain card. */
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inverted, setInverted] = useState(false);

  if (!place.addressLocalScript) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[13px] font-semibold text-inkSoft hover:bg-surface2"
        }
      >
        <Languages size={14} />
        {label ?? "Show address"}
      </button>

      {open && (
        <div
          className={`fixed inset-0 z-50 flex flex-col ${inverted ? "bg-black text-white" : "bg-white text-black"}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
            <button
              type="button"
              onClick={() => setInverted((v) => !v)}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${inverted ? "bg-white/10" : "bg-black/5"}`}
              aria-label="Invert contrast"
            >
              {inverted ? <Sun size={20} /> : <MoonStar size={20} />}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${inverted ? "bg-white/10" : "bg-black/5"}`}
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className={`mb-3 text-sm font-bold uppercase tracking-widest ${inverted ? "text-white/50" : "text-black/45"}`}>
              {place.canonicalName}
            </p>
            <p className="font-display font-semibold leading-[1.15]" style={{ fontSize: "clamp(2.6rem, 11vw, 5.2rem)" }}>
              {place.addressLocalScript}
            </p>
            {place.addressTranslit && (
              <p className={`mt-6 text-base ${inverted ? "text-white/60" : "text-black/55"}`}>{place.addressTranslit}</p>
            )}
          </div>

          <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] text-center">
            <p className={`mb-4 text-xs ${inverted ? "text-white/40" : "text-black/40"}`}>No connection needed to show this.</p>
            {typeof place.lat === "number" && typeof place.lng === "number" && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-bold ${
                  inverted ? "bg-white text-black" : "bg-black text-white"
                }`}
              >
                Directions
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
