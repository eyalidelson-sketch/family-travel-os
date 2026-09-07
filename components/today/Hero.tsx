import Link from "next/link";
import { Utensils, MapPin, TrainFront, StickyNote, ChevronRight } from "lucide-react";
import type { TimedItem } from "@/lib/time";
import { formatClock } from "@/lib/time";
import { ProvenanceDot } from "@/components/ui/Badge";
import { photosProvider, tileForItemType } from "@/lib/providers/photos";
import type { ItineraryItem, Place } from "@/lib/types";
import { getLocale } from "@/lib/i18n/locale";
import { t, minutesAwayLabel, daysUntilStartLabel } from "@/lib/i18n/translations";

function iconFor(type: string) {
  if (type === "meal") return <Utensils size={15} />;
  if (type === "transport") return <TrainFront size={15} />;
  if (type === "note") return <StickyNote size={15} />;
  return <MapPin size={15} />;
}

function coverFor(item: ItineraryItem & { place?: Place }, override?: string): string {
  if (override) return override;
  return item.place ? photosProvider.cover(item.place) : tileForItemType(item.id, item.type);
}

export function NowCard({ entry, tripId, cover: coverOverride }: { entry: TimedItem; tripId: string; cover?: string }) {
  const locale = getLocale();
  const cover = coverFor(entry.item, coverOverride);
  const body = (
    <div
      className="relative h-[176px] overflow-hidden rounded-3xl shadow-card"
      style={{ backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
      <div className="absolute inset-x-5 top-4 flex items-center justify-between">
        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-accentInk">{t(locale, "now")}</span>
        {entry.item.placeId && (
          <span className="flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
            {t(locale, "details")} <ChevronRight size={12} className="rtl:rotate-180" />
          </span>
        )}
      </div>
      <div className="absolute inset-x-5 bottom-4">
        <div className="mb-1.5 flex items-center gap-2 text-white/85">
          {iconFor(entry.item.type)}
          <span className="ltr-nums text-[12.5px] font-semibold">{formatClock(entry.start)}</span>
        </div>
        <p className="text-[22px] font-bold leading-tight text-white drop-shadow-sm">{entry.item.title}</p>
        {entry.item.place?.canonicalName && entry.item.place.canonicalName !== entry.item.title && (
          <p className="mt-1 text-[13px] text-white/70">{entry.item.place.canonicalName}</p>
        )}
      </div>
    </div>
  );

  if (entry.item.placeId) {
    return (
      <Link href={`/t/${tripId}/place/${entry.item.placeId}`} className="block active:scale-[0.98] transition">
        {body}
      </Link>
    );
  }
  return body;
}

export function NextCard({
  entry,
  minutesUntil,
  tripId,
  cover: coverOverride
}: {
  entry: TimedItem;
  minutesUntil: number | null;
  tripId: string;
  cover?: string;
}) {
  const locale = getLocale();
  const cover = coverFor(entry.item, coverOverride);
  const body = (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-card">
      <div
        className="h-12 w-12 flex-none overflow-hidden rounded-xl"
        style={{ backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-inkFaint">
          {t(locale, "next")} · <span className="ltr-nums">{formatClock(entry.start)}</span>
        </p>
        <div className="flex items-center gap-1.5">
          <span className="flex-none text-inkFaint">{iconFor(entry.item.type)}</span>
          <p className="truncate text-[14.5px] font-semibold text-ink">{entry.item.title}</p>
        </div>
      </div>
      {minutesUntil !== null && <span className="flex-none text-[12.5px] font-medium text-inkFaint">{minutesAwayLabel(locale, minutesUntil)}</span>}
    </div>
  );

  if (entry.item.placeId) {
    return (
      <Link href={`/t/${tripId}/place/${entry.item.placeId}`} className="block active:scale-[0.98] transition">
        {body}
      </Link>
    );
  }
  return body;
}

export function ModeBanner({ kind, daysUntilStart }: { kind: "before" | "after"; daysUntilStart?: number }) {
  const locale = getLocale();
  if (kind === "before") {
    return (
      <div className="rounded-2xl bg-indigoSoft px-4 py-3 text-[13px] font-semibold text-indigo">
        {daysUntilStart && daysUntilStart > 0 ? daysUntilStartLabel(locale, daysUntilStart) : t(locale, "tripStartsToday")}
      </div>
    );
  }
  return <div className="rounded-2xl bg-surface2 px-4 py-3 text-[13px] font-semibold text-inkSoft">{t(locale, "tripWrappedUp")}</div>;
}

export { ProvenanceDot };
