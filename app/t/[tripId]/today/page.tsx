import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { repo } from "@/lib/repo";
import { getCoverPhotos } from "@/lib/enrichment/service";
import { isOrganizerForTrip } from "@/lib/session";
import { computeNowNext, findCurrentDay, formatDayHeader, getDayByOffset, type TripMode } from "@/lib/time";
import { countryFlag } from "@/lib/format";
import { getLocale } from "@/lib/i18n/locale";
import { t, dayOfLabel } from "@/lib/i18n/translations";
import { LiveRefresher } from "@/components/today/LiveRefresher";
import { ModeBanner, NextCard, NowCard } from "@/components/today/Hero";
import { ItemRow, TonightCard, TravelCard } from "@/components/today/Timeline";
import { EditableItemList } from "@/components/edit/EditableItemList";
import { DayControls } from "@/components/edit/DayControls";
import { TabBar } from "@/components/nav/TabBar";
import { FamilyTools } from "@/components/today/FamilyTools";
import type { DayWithItems } from "@/lib/types";

function sortedItems(day: DayWithItems) {
  return day.items.slice().sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return a.orderIndex - b.orderIndex;
  });
}

export default async function TodayPage({
  params,
  searchParams
}: {
  params: { tripId: string };
  searchParams: { day?: string; edit?: string };
}) {
  const [bundle, isOrganizer] = await Promise.all([repo.getTripBundle(params.tripId), isOrganizerForTrip(params.tripId)]);
  if (!bundle) notFound();

  const current = findCurrentDay(bundle);
  const selectedDay = (searchParams.day && bundle.days.find((d) => d.id === searchParams.day)) || current.day;
  const isViewingToday = selectedDay.id === current.day.id;
  const editMode = isOrganizer && searchParams.edit === "1";
  const dayQuery = `day=${selectedDay.id}`;

  const viewedMode: TripMode = isViewingToday
    ? current.mode
    : selectedDay.dayIndex < current.day.dayIndex
      ? "after"
      : "before";

  const locale = getLocale();
  const nowNext = computeNowNext(selectedDay, isViewingToday ? current.mode : "before");
  const { weekday, monthDay } = formatDayHeader(selectedDay, locale);
  const prevDay = getDayByOffset(bundle, selectedDay.id, -1);
  const nextDay = getDayByOffset(bundle, selectedDay.id, 1);
  const items = sortedItems(selectedDay);
  const showHero = isViewingToday && current.mode === "active";

  // Real photos (Google Places/Unsplash, when configured) for every place shown
  // on this day — one batched, deduped, cached lookup rather than one per card.
  // Cards fall back to their own deterministic tile for anything missing here.
  const placesInView = [...items.map((i) => i.place), selectedDay.hotel?.place].filter(
    (p): p is NonNullable<typeof p> => Boolean(p)
  );
  const covers = await getCoverPhotos(placesInView);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md pb-14">
      <LiveRefresher />

      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
              {countryFlag(selectedDay.city?.country)} {(selectedDay.city?.city ?? selectedDay.city?.canonicalName ?? "").toUpperCase()}
            </p>
            <h1 className="mt-0.5 font-display text-[19px] font-semibold text-ink">
              {weekday} · {monthDay}
            </h1>
          </div>
          <p className="ltr-nums text-[12px] font-medium text-inkFaint">{dayOfLabel(locale, selectedDay.dayIndex, bundle.days.length)}</p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Link
            href={prevDay ? `?day=${prevDay.id}${editMode ? "&edit=1" : ""}` : "#"}
            aria-disabled={!prevDay}
            className={`flex items-center gap-1 text-[13px] font-semibold ${prevDay ? "text-inkSoft hover:text-ink" : "pointer-events-none text-inkFaint/40"}`}
          >
            <ChevronLeft size={15} className="rtl:rotate-180" /> {t(locale, "yesterday")}
          </Link>
          <Link
            href={`/t/${bundle.trip.id}/today${editMode ? "?edit=1" : ""}`}
            className={`rounded-full px-3 py-1 text-[12px] font-bold uppercase ${isViewingToday ? "bg-ink text-bg" : "bg-surface2 text-inkSoft"}`}
          >
            {t(locale, "today")}
          </Link>
          <Link
            href={nextDay ? `?day=${nextDay.id}${editMode ? "&edit=1" : ""}` : "#"}
            aria-disabled={!nextDay}
            className={`flex items-center gap-1 text-[13px] font-semibold ${nextDay ? "text-inkSoft hover:text-ink" : "pointer-events-none text-inkFaint/40"}`}
          >
            {t(locale, "tomorrow")} <ChevronRight size={15} className="rtl:rotate-180" />
          </Link>
        </div>

        {isOrganizer && (
          <div className="mt-3 flex justify-end">
            <Link
              href={`?${dayQuery}${editMode ? "" : "&edit=1"}`}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${
                editMode ? "bg-accent text-accentInk" : "bg-surface2 text-inkSoft"
              }`}
            >
              <Pencil size={12} /> {editMode ? t(locale, "doneEditing") : t(locale, "editItinerary")}
            </Link>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-3.5 px-5 pt-4">
        {!editMode && <FamilyTools tripId={bundle.trip.id} />}

        {isViewingToday && viewedMode !== "active" && <ModeBanner kind={viewedMode as "before" | "after"} daysUntilStart={current.daysUntilStart} />}

        {!editMode && showHero && nowNext.now && (
          <NowCard entry={nowNext.now} tripId={bundle.trip.id} cover={nowNext.now.item.placeId ? covers.get(nowNext.now.item.placeId) : undefined} />
        )}
        {!editMode && showHero && nowNext.next && (
          <NextCard
            entry={nowNext.next}
            minutesUntil={nowNext.minutesUntilNext}
            tripId={bundle.trip.id}
            cover={nowNext.next.item.placeId ? covers.get(nowNext.next.item.placeId) : undefined}
          />
        )}
        {!editMode && showHero && !nowNext.now && !nowNext.next && (
          <div className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-[13px] text-inkSoft">{t(locale, "nothingScheduled")}</div>
        )}

        {!editMode && selectedDay.isTravelDay && selectedDay.transport && selectedDay.transport.length > 0 && <TravelCard transport={selectedDay.transport} />}

        {editMode && <DayControls tripId={bundle.trip.id} dayId={selectedDay.id} canDelete={bundle.days.length > 1} />}

        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-inkFaint">{editMode ? t(locale, "editThisDay") : t(locale, "todaySectionTitle")}</p>
          {editMode ? (
            <EditableItemList tripId={bundle.trip.id} dayId={selectedDay.id} items={items} />
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-inkFaint">{t(locale, "nothingPlanned")}</div>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isNow={showHero && nowNext.now?.item.id === item.id}
                  tripId={bundle.trip.id}
                  cover={item.placeId ? covers.get(item.placeId) : undefined}
                />
              ))}
            </ol>
          )}
        </section>

        {!editMode && selectedDay.hotel && (
          <TonightCard hotel={selectedDay.hotel} tripId={bundle.trip.id} cover={covers.get(selectedDay.hotel.place.id)} />
        )}
      </div>

      <TabBar tripId={bundle.trip.id} active="today" />
    </main>
  );
}
