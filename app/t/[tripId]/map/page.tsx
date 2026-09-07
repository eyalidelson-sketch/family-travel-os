import { notFound } from "next/navigation";
import { repo } from "@/lib/repo";
import { groupIntoCityBlocks } from "@/lib/trip-blocks";
import { getCoverPhotos } from "@/lib/enrichment/service";
import { buildRouteWaypoints, type RouteWaypoint } from "@/lib/map/waypoints";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/translations";
import { TabBar } from "@/components/nav/TabBar";
import { RouteMapClient } from "@/components/map/RouteMapClient";
import type { LeafletRouteStopVM, RouteMapConnectorVM } from "@/components/map/LeafletRouteMap";
import type { Place } from "@/lib/types";

/**
 * Interactive Route Map, now on a REAL world map (Leaflet + OpenStreetMap
 * tiles, no API key — see components/map/LeafletRouteMap.tsx) instead of the
 * old abstract SVG canvas. groupIntoCityBlocks (lib/trip-blocks.ts) gives the
 * same city/hotel-stay grouping the Full Trip tab renders as collapsible
 * sections, and buildRouteWaypoints (lib/map/waypoints.ts) interleaves each
 * block's own city/hotel anchor with the notable attraction/neighborhood
 * places its own itinerary items mention.
 *
 * A real map can only honestly plot a REAL lat/lng — unlike the old abstract
 * canvas, an interpolated/approximate position would read as a lie once
 * drawn on top of actual terrain — so waypoints without coordinates are
 * dropped here rather than passed through. Most non-curated places do have
 * coordinates today via the gazetteer + geocoding pipeline; any that don't
 * simply don't get a pin, and if that ends up being every waypoint the page
 * shows routeMapNoCoordinates instead of a blank map canvas.
 */
export default async function TripRouteMapPage({ params }: { params: { tripId: string } }) {
  const bundle = await repo.getTripBundle(params.tripId);
  if (!bundle) notFound();

  const locale = getLocale();
  const blocks = groupIntoCityBlocks(bundle.days);
  const waypoints = buildRouteWaypoints(blocks);

  const waypointPlaces = waypoints.map((w) => w.place).filter((p): p is Place => Boolean(p));
  const coverPhotos = await getCoverPhotos(waypointPlaces);

  // Keep each kept waypoint's ORIGINAL index alongside it — the connector
  // logic below needs to know whether two waypoints that end up adjacent
  // after filtering were also adjacent before it, so it never fabricates a
  // "connection" across a gap that used to contain an intermediate stop.
  const geocoded: { wp: RouteWaypoint; originalIndex: number }[] = waypoints
    .map((wp, originalIndex) => ({ wp, originalIndex }))
    .filter(({ wp }) => typeof wp.lat === "number" && typeof wp.lng === "number");

  const stops: LeafletRouteStopVM[] = geocoded.map(({ wp }) => ({
    key: wp.key,
    placeId: wp.placeId,
    cityName: wp.cityName,
    country: wp.country,
    startDate: wp.startDate,
    endDate: wp.endDate,
    photoUrl: wp.placeId ? coverPhotos.get(wp.placeId) : undefined,
    lat: wp.lat as number,
    lng: wp.lng as number
  }));

  // Interactive Transport Connectors: only a gap that crosses from one
  // CityBlock into the next (a waypoint's blockIndex changing) is a real
  // between-city leg, so only those gaps look for a transport record — per
  // the parsing pipeline's own convention it's expected as arrival transport
  // on the destination block's first day (see lib/ai/anthropicParser.ts's
  // SYSTEM_PROMPT), falling back to departure transport on the origin
  // block's last day for itineraries that recorded it the other way around.
  // A gap between two waypoints in the SAME block (the city anchor to one of
  // its own highlights, or one highlight to the next) is local sightseeing
  // movement with no booked leg behind it, so it deliberately gets
  // `undefined` — LeafletRouteMap already renders that as a plain,
  // unclickable dot rather than a transport icon. On top of that original
  // rule, a gap between two KEPT stops that weren't originally adjacent
  // (an ungeocoded waypoint sat between them and got filtered out above)
  // also gets `undefined` — skipping over an unplotted stop means this gap
  // no longer corresponds to a single real leg, so it would be dishonest to
  // attribute one specific transport record to it.
  const connectors: (RouteMapConnectorVM | undefined)[] = geocoded.slice(1).map((to, idx) => {
    const from = geocoded[idx]!;
    if (to.originalIndex !== from.originalIndex + 1) return undefined;

    const toWp = to.wp;
    const fromWp = from.wp;
    if (toWp.blockIndex === fromWp.blockIndex) return undefined;

    const fromBlock = blocks[fromWp.blockIndex]!;
    const toBlock = blocks[toWp.blockIndex]!;
    const arrivalDay = toBlock.days[0];
    const departureDay = fromBlock.days[fromBlock.days.length - 1];
    const fromArrival = arrivalDay?.transport?.[0];
    const candidate = fromArrival ?? departureDay?.transport?.[0];
    const candidateDay = fromArrival ? arrivalDay : departureDay;
    if (!candidate) return undefined;
    return {
      key: candidate.id,
      mode: candidate.mode,
      fromCityName: fromBlock.cityName,
      toCityName: toBlock.cityName,
      departTime: candidate.departTime,
      arriveTime: candidate.arriveTime,
      departDate: candidateDay?.date,
      carrier: candidate.carrier,
      referenceNumber: candidate.referenceNumber
    };
  });

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 backdrop-blur">
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{bundle.trip.name}</p>
        <h1 className="mt-0.5 font-display text-[19px] font-semibold text-ink">{t(locale, "routeMapTitle")}</h1>
        <p className="mt-0.5 text-[12.5px] text-inkFaint">{t(locale, "routeMapSubtitle")}</p>
      </header>

      <div className="px-2 pt-4">
        {stops.length > 0 ? (
          <RouteMapClient tripId={bundle.trip.id} locale={locale} stops={stops} connectors={connectors} />
        ) : waypoints.length > 0 ? (
          <p className="px-3 py-10 text-center text-[13.5px] text-inkFaint">{t(locale, "routeMapNoCoordinates")}</p>
        ) : (
          <p className="px-3 py-10 text-center text-[13.5px] text-inkFaint">{t(locale, "routeMapEmpty")}</p>
        )}
      </div>

      <TabBar tripId={bundle.trip.id} active="map" />
    </main>
  );
}
