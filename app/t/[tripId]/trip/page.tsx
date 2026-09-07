import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Hotel, MapPin, Utensils, TrainFront, StickyNote } from "lucide-react";
import { repo } from "@/lib/repo";
import { findCurrentDay } from "@/lib/time";
import { groupIntoCityBlocks } from "@/lib/trip-blocks";
import { countryFlag, formatDateLong } from "@/lib/format";
import { getLocale } from "@/lib/i18n/locale";
import { t, dayNLabel, daysCountLabel, moreCountLabel } from "@/lib/i18n/translations";
import { TabBar } from "@/components/nav/TabBar";
import type { ItineraryItemType } from "@/lib/types";

function iconFor(type: ItineraryItemType) {
  const cls = "text-inkFaint flex-none";
  if (type === "meal") return <Utensils size={13} className={cls} />;
  if (type === "transport") return <TrainFront size={13} className={cls} />;
  if (type === "note") return <StickyNote size={13} className={cls} />;
  return <MapPin size={13} className={cls} />;
}

export default async function FullTripPage({ params }: { params: { tripId: string } }) {
  const bundle = await repo.getTripBundle(params.tripId);
  if (!bundle) notFound();

  const locale = getLocale();
  const current = findCurrentDay(bundle);
  const blocks = groupIntoCityBlocks(bundle.days);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 backdrop-blur">
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{bundle.trip.name}</p>
        <h1 className="mt-0.5 font-display text-[19px] font-semibold text-ink">{t(locale, "fullTrip")}</h1>
        <p className="mt-0.5 text-[12.5px] text-inkFaint">
          {formatDateLong(bundle.trip.startDate, locale)} – {formatDateLong(bundle.trip.endDate, locale)} · {daysCountLabel(locale, bundle.days.length)}
        </p>
      </header>

      <div className="flex flex-col gap-2.5 px-5 pt-4">
        {blocks.map((block, i) => {
          const containsToday = block.days.some((d) => d.id === current.day.id);
          return (
            <details key={i} open={containsToday} className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <span className="text-xl leading-none">{countryFlag(block.country)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-bold text-ink">{block.cityName}</p>
                    {containsToday && <span className="flex-none rounded-full bg-accentSoft px-2 py-0.5 text-[10px] font-bold text-accent">{t(locale, "nowBadge")}</span>}
                  </div>
                  <p className="text-[12px] text-inkFaint">
                    {formatDateLong(block.startDate, locale)} – {formatDateLong(block.endDate, locale)} · {daysCountLabel(locale, block.days.length)}
                  </p>
                </div>
                <ChevronRight size={17} className="flex-none text-inkFaint transition group-open:rotate-90" />
              </summary>

              <div className="flex flex-col divide-y divide-border border-t border-border">
                {block.days.map((day) => (
                  <Link
                    key={day.id}
                    href={`/t/${bundle.trip.id}/today?day=${day.id}`}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-surface2 ${day.id === current.day.id ? "bg-accentSoft/30" : ""}`}
                  >
                    <div className="w-14 flex-none">
                      <p className="ltr-nums text-[11px] font-bold uppercase tracking-wide text-inkFaint">{dayNLabel(locale, day.dayIndex)}</p>
                      <p className="text-[11.5px] text-inkFaint">{formatDateLong(day.date, locale)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      {day.hotel && (
                        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-indigo">
                          <Hotel size={12} /> {day.hotel.place.canonicalName}
                        </p>
                      )}
                      {day.items.length === 0 ? (
                        <p className="text-[12.5px] text-inkFaint">{t(locale, "freeDay")}</p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {day.items.slice(0, 4).map((item) => (
                            <li key={item.id} className="flex items-center gap-1.5 truncate text-[12.5px] text-inkSoft">
                              {iconFor(item.type)}
                              <span className="truncate">{item.title}</span>
                            </li>
                          ))}
                          {day.items.length > 4 && <li className="text-[11.5px] text-inkFaint">{moreCountLabel(locale, day.items.length - 4)}</li>}
                        </ul>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      <TabBar tripId={bundle.trip.id} active="trip" />
    </main>
  );
}
