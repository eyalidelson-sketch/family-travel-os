"use client";

import { AlertTriangle, Hotel, Trash2, TrainFront, Utensils, MapPin, StickyNote } from "lucide-react";
import type { ParsedDay, ParsedItem, ParsedTrip } from "@/lib/parsing-types";
import { Button } from "@/components/ui/Button";
import { tileForItemType, tileForName } from "@/lib/providers/photos";

function ItemIcon({ type }: { type: ParsedItem["type"] }) {
  const cls = "text-white";
  if (type === "meal") return <Utensils size={13} className={cls} />;
  if (type === "transport") return <TrainFront size={13} className={cls} />;
  if (type === "note") return <StickyNote size={13} className={cls} />;
  return <MapPin size={13} className={cls} />;
}

/**
 * No real Place exists yet at this stage — just a raw name string — so this
 * prefers the real photo the server already looked up by name
 * (lib/parsing/attachPhotos.ts, Automatic Real-Photo & Detail Resolution
 * applied before confirm) and only falls back to the deterministic
 * gradient tile when that lookup didn't find anything (no API keys
 * configured, or the name didn't resolve to a real photo).
 */
function itemThumb(item: ParsedItem): string {
  if (item.photoUrl) return item.photoUrl;
  const seed = item.placeName?.trim().toLowerCase() || item.title;
  return tileForItemType(seed, item.type);
}

function updateDay(trip: ParsedTrip, dayIndex: number, updater: (d: ParsedDay) => ParsedDay): ParsedTrip {
  const days = trip.days.slice();
  days[dayIndex] = updater(days[dayIndex]!);
  return { ...trip, days };
}

export function ReviewItinerary({
  trip,
  onChange,
  organizerName,
  onOrganizerNameChange,
  onConfirm,
  onBack,
  busy
}: {
  trip: ParsedTrip;
  onChange: (t: ParsedTrip) => void;
  organizerName: string;
  onOrganizerNameChange: (v: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  const flaggedCount = trip.days.reduce((n, d) => n + d.items.filter((i) => i.needsReview).length, 0);
  const coverSeed = trip.countries.join(",") || trip.name;
  const cover = trip.coverPhotoUrl ?? tileForName(coverSeed);

  return (
    <div className="mx-auto max-w-md pb-40">
      <div
        className="relative flex h-[220px] flex-col justify-end px-5 pb-5 pt-[calc(env(safe-area-inset-top)+16px)]"
        style={{ backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <p className="relative mb-1.5 text-xs font-bold uppercase tracking-widest text-white/80">Review before we create the trip</p>
        <input
          value={trip.name}
          onChange={(e) => onChange({ ...trip, name: e.target.value })}
          className="relative mb-1 w-full bg-transparent font-display text-[26px] font-semibold text-white outline-none placeholder:text-white/50"
        />
        <p className="relative text-sm text-white/80">
          {trip.startDate} → {trip.endDate} · {trip.days.length} days
        </p>
      </div>

      <div className="px-5 pt-5">
      {trip.warnings.length > 0 && (
        <div className="mb-5 flex flex-col gap-1.5 rounded-2xl border border-warn/30 bg-warnSoft px-4 py-3">
          {trip.warnings.map((w, i) => (
            <div key={i} className="flex gap-2 text-[13px] text-ink">
              <AlertTriangle size={15} className="mt-0.5 flex-none text-warn" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {flaggedCount > 0 && (
        <p className="mb-4 text-[13px] font-medium text-inkSoft">
          <span className="font-bold text-warn">{flaggedCount}</span> {flaggedCount === 1 ? "line needs" : "lines need"} a
          quick look below — everything else previewed with high confidence.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {trip.days.map((day, dayIndex) => (
          <div key={day.date} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
            <div
              className="relative flex h-16 items-center justify-between px-4"
              style={{ backgroundImage: `url(${day.photoUrl ?? tileForName(day.cityHint || day.date)})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
              <div className="relative">
                <p className="text-[13px] font-bold text-white">{day.date}</p>
                {day.cityHint && <p className="text-xs text-white/75">{day.cityHint}</p>}
              </div>
              {day.isTravelDay && (
                <span className="relative rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">Travel day</span>
              )}
            </div>

            <div className="p-4">

            {day.hotel && (
              <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-surface2 px-3 py-2 text-[13px] text-inkSoft">
                {day.hotel.photoUrl && (
                  <div
                    className="h-7 w-7 flex-none overflow-hidden rounded-lg"
                    style={{ backgroundImage: `url(${day.hotel.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
                  />
                )}
                <Hotel size={14} className="flex-none text-inkFaint" />
                <span className="font-semibold text-ink">{day.hotel.placeName}</span>
                <span className="text-inkFaint">· {day.hotel.checkIn} → {day.hotel.checkOut}</span>
              </div>
            )}

            {day.transport?.map((t, i) => (
              <div key={i} className="mb-2 flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2 text-[13px] text-inkSoft">
                <TrainFront size={14} className="flex-none text-inkFaint" />
                <span className="font-semibold text-ink capitalize">{t.mode}</span>
                <span className="text-inkFaint">
                  {t.fromPlaceName} → {t.toPlaceName}
                </span>
              </div>
            ))}

            {day.items.length === 0 && !day.hotel && !day.transport?.length && (
              <p className="py-1 text-[13px] text-inkFaint">Nothing planned yet.</p>
            )}

            <div className="flex flex-col gap-2">
              {day.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 ${
                    item.needsReview ? "bg-warnSoft ring-1 ring-warn/40" : "hover:bg-surface2"
                  }`}
                >
                  <div
                    className="relative mt-0.5 h-9 w-9 flex-none overflow-hidden rounded-lg"
                    style={{ backgroundImage: `url(${itemThumb(item)})`, backgroundSize: "cover", backgroundPosition: "center" }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                      <ItemIcon type={item.type} />
                    </span>
                  </div>
                  <input
                    type="time"
                    value={item.startTime ?? ""}
                    onChange={(e) =>
                      onChange(
                        updateDay(trip, dayIndex, (d) => {
                          const items = d.items.slice();
                          items[itemIndex] = { ...items[itemIndex]!, startTime: e.target.value || undefined };
                          return { ...d, items };
                        })
                      )
                    }
                    className="mt-1.5 w-[74px] flex-none bg-transparent font-mono text-[13px] text-inkFaint outline-none"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      value={item.title}
                      onChange={(e) =>
                        onChange(
                          updateDay(trip, dayIndex, (d) => {
                            const items = d.items.slice();
                            items[itemIndex] = { ...items[itemIndex]!, title: e.target.value };
                            return { ...d, items };
                          })
                        )
                      }
                      className="w-full bg-transparent py-1.5 text-[14px] font-medium text-ink outline-none"
                    />
                    {item.needsReview && (
                      <p className="px-0.5 pb-1 text-[11.5px] font-medium text-warn">
                        {item.reviewReason ?? "Please confirm — this was a guess."}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() =>
                      onChange(
                        updateDay(trip, dayIndex, (d) => ({
                          ...d,
                          items: d.items.filter((_, idx) => idx !== itemIndex)
                        }))
                      )
                    }
                    className="mt-1.5 flex-none text-inkFaint hover:text-critical"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-inkFaint">Your name (as organizer)</label>
          <input
            value={organizerName}
            onChange={(e) => onOrganizerNameChange(e.target.value)}
            placeholder="e.g. Danny"
            className="mb-3 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
          />
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={onBack} disabled={busy}>
              Start over
            </Button>
            <Button className="flex-1" onClick={onConfirm} disabled={busy || !organizerName.trim()}>
              {busy ? "Creating trip…" : "Create Family Trip"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
