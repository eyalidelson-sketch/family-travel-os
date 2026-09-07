import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Compass, MapPin, Sparkles, Baby, Banknote, CalendarClock } from "lucide-react";
import { repo } from "@/lib/repo";
import { placeRepo } from "@/lib/repo/placeRepo";
import { getOrCreateEnrichment } from "@/lib/enrichment/service";
import { photosProvider, type PhotoTile } from "@/lib/providers/photos";
import { formatDateLong, formatDuration } from "@/lib/format";
import { getLocale } from "@/lib/i18n/locale";
import { t, nightsLabel, visitLengthLabel, checkInOutLabel } from "@/lib/i18n/translations";
import { localizeEnrichment } from "@/lib/i18n/localizeEnrichment";
import { PhotoGallery } from "@/components/place/PhotoGallery";
import { ShowDriverModal } from "@/components/today/ShowDriverModal";
import { AskAboutPlace } from "@/components/place/AskAboutPlace";

export default async function PlaceDetailPage({
  params,
  searchParams
}: {
  params: { tripId: string; placeId: string };
  searchParams: { from?: string };
}) {
  const locale = getLocale();
  const [bundle, place] = await Promise.all([repo.getTripBundle(params.tripId), placeRepo.getPlace(params.placeId)]);
  if (!bundle || !place) notFound();

  const [fetchedEnrichment, placeholderPhotos] = await Promise.all([getOrCreateEnrichment(place, locale), photosProvider.resolve(place)]);
  const enrichment = localizeEnrichment(fetchedEnrichment, place, locale);

  const hasRealPhotos = enrichment.photos.length > 0;
  // Automatic Bilingual Generation: prefer Claude's natural Hebrew
  // name/transliteration when viewing in Hebrew and one was generated —
  // Place.canonicalName itself (the verified fact) is never touched.
  const displayName = locale === "he" && enrichment.nameHe ? enrichment.nameHe : place.canonicalName;
  const photos: PhotoTile[] = hasRealPhotos
    ? enrichment.photos.map((url, i) => ({ url, alt: i === 0 ? displayName : `${displayName} — photo ${i + 1}` }))
    : placeholderPhotos;

  const hotelStay = bundle.days.map((d) => d.hotel).find((h) => h?.placeId === place.id);

  const references = bundle.days
    .flatMap((day) => day.items.filter((i) => i.placeId === place.id).map((item) => ({ day, item })))
    .sort((a, b) => a.day.date.localeCompare(b.day.date));

  const backHref =
    searchParams.from === "trip"
      ? `/t/${params.tripId}/trip`
      : searchParams.from === "map"
        ? `/t/${params.tripId}/map`
        : `/t/${params.tripId}/today`;
  const info = enrichment.practicalInfo;
  const visitLength = formatDuration(info?.estimatedVisitMinutes);
  const photoBadge = !hasRealPhotos
    ? t(locale, "illustrative")
    : enrichment.photoSource === "unsplash"
      ? t(locale, "photoViaUnsplash")
      : enrichment.photoSource === "wikipedia"
        ? t(locale, "photoViaWikipedia")
        : t(locale, "photoViaGoogle");

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md pb-14">
      <div className="relative">
        <PhotoGallery
          tiles={photos}
          name={displayName}
          subtitle={[place.city, place.country].filter(Boolean).join(", ")}
          badge={photoBadge}
        />
        <Link
          href={backHref}
          className="absolute top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur ltr:left-3 rtl:right-3"
          aria-label={t(locale, "back")}
        >
          <ChevronLeft size={20} className="rtl:rotate-180" />
        </Link>
      </div>

      <div className="flex flex-col gap-4 px-5 pt-5">
        {enrichment.description && <p className="text-[14.5px] leading-relaxed text-inkSoft">{enrichment.description}</p>}

        {hotelStay && (
          <div className="rounded-2xl bg-indigoSoft px-4 py-3.5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-indigo">{t(locale, "yourStay")}</p>
            <p className="ltr-nums text-[15px] font-bold text-ink">
              {formatDateLong(hotelStay.checkIn, locale)} – {formatDateLong(hotelStay.checkOut, locale)}
            </p>
            <p className="text-[12.5px] text-inkSoft">
              {nightsLabel(locale, Math.max(1, Math.round((new Date(hotelStay.checkOut).getTime() - new Date(hotelStay.checkIn).getTime()) / 86_400_000)))}
            </p>
          </div>
        )}

        {references.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-inkFaint">{t(locale, "onYourItinerary")}</p>
            <div className="flex flex-col gap-1.5">
              {references.map(({ day, item }) => (
                <Link
                  key={item.id}
                  href={`/t/${params.tripId}/today?day=${day.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 hover:bg-surface2"
                >
                  <span className="ltr-nums w-16 flex-none font-mono text-[12px] text-inkFaint">{item.startTime ?? formatDateLong(day.date, locale)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {info?.whatToDo && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-inkFaint">
              <Compass size={12} className="text-accent" /> {t(locale, "whatToDoHere")}
            </p>
            <p className="rounded-2xl border border-border bg-surface p-4 text-[13.5px] leading-relaxed text-ink shadow-card">{info.whatToDo}</p>
          </div>
        )}

        {(info?.nearestStation ||
          info?.checkIn ||
          info?.amenities?.length ||
          visitLength ||
          info?.openingHours ||
          info?.estimatedCost ||
          info?.familyAccessibility ||
          info?.familyTips) && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-inkFaint">
              <Sparkles size={12} className="text-accent" /> {t(locale, "usefulInformation")}
            </p>
            <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4 shadow-card">
              {info?.nearestStation && (
                <div className="flex items-start gap-2.5 text-[13.5px] text-ink">
                  <MapPin size={15} className="mt-0.5 flex-none text-inkFaint" />
                  <span>{info.nearestStation}</span>
                </div>
              )}
              {(info?.checkIn || info?.checkOut) && (
                <div className="flex items-start gap-2.5 text-[13.5px] text-ink">
                  <Clock size={15} className="mt-0.5 flex-none text-inkFaint" />
                  <span className="ltr-nums">{checkInOutLabel(locale, info?.checkIn, info?.checkOut)}</span>
                </div>
              )}
              {info?.openingHours && (
                <div className="flex items-start gap-2.5 text-[13.5px] text-ink">
                  <CalendarClock size={15} className="mt-0.5 flex-none text-inkFaint" />
                  <span>{info.openingHours}</span>
                </div>
              )}
              {visitLength && (
                <div className="flex items-start gap-2.5 text-[13.5px] text-ink">
                  <Clock size={15} className="mt-0.5 flex-none text-inkFaint" />
                  <span>{visitLengthLabel(locale, visitLength)}</span>
                </div>
              )}
              {info?.estimatedCost && (
                <div className="flex items-start gap-2.5 text-[13.5px] text-ink">
                  <Banknote size={15} className="mt-0.5 flex-none text-inkFaint" />
                  <span>{info.estimatedCost}</span>
                </div>
              )}
              {info?.familyAccessibility && (
                <div className="flex items-start gap-2.5 text-[13.5px] text-ink">
                  <Baby size={15} className="mt-0.5 flex-none text-inkFaint" />
                  <span>{info.familyAccessibility}</span>
                </div>
              )}
              {info?.amenities && info.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {info.amenities.map((a) => (
                    <span key={a} className="rounded-md bg-surface2 px-2 py-1 text-[12px] font-medium text-inkSoft">
                      {a}
                    </span>
                  ))}
                </div>
              )}
              {info?.familyTips && <p className="border-t border-border pt-2.5 text-[13px] text-inkSoft">{info.familyTips}</p>}
              <p className="pt-1 text-[10.5px] font-medium uppercase tracking-wide text-inkFaint/70">
                {enrichment.source === "ai_generated" ? t(locale, "identifiedAutomatically") : t(locale, "fromExternalSource")}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {typeof place.lat === "number" && typeof place.lng === "number" && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[13px] font-semibold text-inkSoft hover:bg-surface2"
            >
              <MapPin size={14} /> {t(locale, "directions")}
            </a>
          )}
          {place.addressLocalScript && <ShowDriverModal place={place} label={t(locale, "showLocalAddress")} />}
        </div>

        <div className="border-t border-border pt-4">
          <AskAboutPlace tripId={params.tripId} placeId={place.id} />
        </div>
      </div>
    </main>
  );
}
