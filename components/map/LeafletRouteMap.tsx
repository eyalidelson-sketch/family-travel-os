"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import Link from "next/link";
import { X, ChevronRight, CalendarDays } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { t, type TranslationKey } from "@/lib/i18n/translations";
import { formatDateLong } from "@/lib/format";
import type { TransportMode } from "@/lib/types";

// A REAL, recognizable world map — actual coastlines and country borders
// under the route, not an abstract SVG canvas — built on Leaflet +
// OpenStreetMap tiles. Both are genuinely free with zero API key or account
// required (unlike Google Maps/Mapbox), so this stays true to the rest of
// the app's "no paid key needed" baseline. Every stop passed in here is
// required to carry a REAL lat/lng (see app/t/[tripId]/map/page.tsx, which
// filters lib/map/waypoints.ts's output down to geocoded stops before this
// component ever sees them) — plotting a guessed/interpolated position on
// top of real terrain would read as a lie in a way it never did on the old
// abstract canvas, so this component draws only real pins, full stop.
//
// This supersedes lib/map/layout.ts + components/map/RouteMap.tsx's custom
// equirectangular-projection canvas, which is no longer used by the Map
// tab — kept in the repo rather than deleted since lib/map/waypoints.ts's
// `RouteMapStopInput` type is still the shared contract both this file and
// that one build on.

export interface LeafletRouteStopVM {
  key: string;
  placeId?: string;
  cityName: string;
  country?: string;
  startDate: string;
  endDate: string;
  photoUrl?: string;
  lat: number;
  lng: number;
}

export interface RouteMapConnectorVM {
  key: string;
  mode: TransportMode;
  fromCityName: string;
  toCityName: string;
  departTime?: string;
  arriveTime?: string;
  departDate?: string;
  carrier?: string;
  referenceNumber?: string;
}

const MODE_EMOJI: Record<TransportMode, string> = {
  flight: "✈️",
  train: "🚆",
  car: "🚗",
  bus: "🚌",
  ferry: "⛴️",
  other: "🧭"
};

const MODE_LABEL_KEY: Record<TransportMode, TranslationKey> = {
  flight: "transportModeFlight",
  train: "transportModeTrain",
  car: "transportModeCar",
  bus: "transportModeBus",
  ferry: "transportModeFerry",
  other: "transportModeOther"
};

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

/** A quadratic-bezier "flight arc" sampled into a polyline, in plain lat/lng degree space — a deliberately simple approximation (matches the fidelity the old projected-canvas version already had), not a great-circle calculation. Direction alternates per segment index so consecutive curves don't all bow the same way. */
function bowedPath(a: [number, number], b: [number, number], segmentIndex: number, steps = 24): [number, number][] {
  const [aLat, aLng] = a;
  const [bLat, bLng] = b;
  const mLat = (aLat + bLat) / 2;
  const mLng = (aLng + bLng) / 2;
  const dLat = bLat - aLat;
  const dLng = bLng - aLng;
  const len = Math.hypot(dLat, dLng) || 1;
  const bend = Math.min(len * 0.15, 3) * (segmentIndex % 2 === 0 ? 1 : -1);
  const controlLat = mLat + (-dLng / len) * bend;
  const controlLng = mLng + (dLat / len) * bend;

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const tt = i / steps;
    const lat = (1 - tt) * (1 - tt) * aLat + 2 * (1 - tt) * tt * controlLat + tt * tt * bLat;
    const lng = (1 - tt) * (1 - tt) * aLng + 2 * (1 - tt) * tt * controlLng + tt * tt * bLng;
    points.push([lat, lng]);
  }
  return points;
}

function photoPinIcon(stop: LeafletRouteStopVM): L.DivIcon {
  const size = 40;
  const inner = stop.photoUrl
    ? `<img src="${stop.photoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;" />`
    : `<div style="width:100%;height:100%;border-radius:9999px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent);font-size:15px;">${initials(stop.cityName)}</div>`;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:2.5px solid var(--accent);background:var(--bg);box-shadow:0 1px 4px rgba(0,0,0,0.35);padding:2px;overflow:hidden;">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function connectorIcon(mode: TransportMode | null): L.DivIcon {
  const size = 24;
  const glyph = mode ? MODE_EMOJI[mode] : "•";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:var(--surface);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:${mode ? 13 : 16}px;box-shadow:0 1px 3px rgba(0,0,0,0.25);">${glyph}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

export function LeafletRouteMap({
  locale,
  tripId,
  stops,
  connectors
}: {
  locale: Locale;
  tripId: string;
  stops: LeafletRouteStopVM[];
  /** One entry per gap between consecutive stops, or undefined when no transport record was found for that leg (or the two stops weren't originally adjacent — see the filtering comment in page.tsx). */
  connectors: (RouteMapConnectorVM | undefined)[];
}) {
  const [selectedStop, setSelectedStop] = useState<LeafletRouteStopVM | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<RouteMapConnectorVM | null>(null);

  const bounds = useMemo<L.LatLngBoundsExpression>(() => stops.map((s) => [s.lat, s.lng] as [number, number]), [stops]);

  const curves = useMemo(
    () =>
      stops.slice(1).map((stop, i) => {
        const a: [number, number] = [stops[i]!.lat, stops[i]!.lng];
        const b: [number, number] = [stop.lat, stop.lng];
        const path = bowedPath(a, b, i);
        return { path, mid: path[Math.floor(path.length / 2)]! };
      }),
    [stops]
  );

  if (stops.length === 0) return null;

  const single = stops.length === 1;

  // Two explicit branches rather than a conditional prop-spread: MapContainer's
  // props aren't a clean discriminated union (center/zoom vs bounds/boundsOptions),
  // so spreading a computed object risks TypeScript rejecting the merged shape.
  // This keeps each branch's props literal and unambiguous.
  const mapChildren = (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {curves.map((c, i) => (
        <Polyline key={`curve-${i}`} positions={c.path} pathOptions={{ color: "var(--accent)", weight: 3, opacity: 0.85 }} />
      ))}

      {curves.map((c, i) => {
        const connector = connectors[i];
        return (
          <Marker
            key={`connector-${i}`}
            position={c.mid}
            icon={connectorIcon(connector?.mode ?? null)}
            eventHandlers={connector ? { click: () => setSelectedConnector(connector) } : {}}
          />
        );
      })}

      {stops.map((stop) => (
        <Marker key={stop.key} position={[stop.lat, stop.lng]} icon={photoPinIcon(stop)} eventHandlers={{ click: () => setSelectedStop(stop) }} />
      ))}
    </>
  );

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border" style={{ height: "70vh", minHeight: 380 }}>
      {single ? (
        <MapContainer center={[stops[0]!.lat, stops[0]!.lng]} zoom={11} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
          {mapChildren}
        </MapContainer>
      ) : (
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [36, 36], maxZoom: 13 }}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          {mapChildren}
        </MapContainer>
      )}

      {selectedStop && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/30"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedStop(null)}
        >
          <div className="w-full rounded-t-3xl bg-bg p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-14 w-14 flex-none overflow-hidden rounded-full bg-accentSoft">
                  {selectedStop.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedStop.photoUrl} alt={selectedStop.cityName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-accent">{initials(selectedStop.cityName)}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-[17px] font-semibold text-ink">{selectedStop.cityName}</p>
                  {selectedStop.country && <p className="truncate text-[12.5px] text-inkFaint">{selectedStop.country}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStop(null)}
                aria-label={t(locale, "close")}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface2 text-inkSoft"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 text-[13px] text-ink">
              <CalendarDays size={15} className="flex-none text-inkFaint" />
              <span className="ltr-nums">
                {formatDateLong(selectedStop.startDate, locale)} – {formatDateLong(selectedStop.endDate, locale)}
              </span>
            </div>

            {selectedStop.placeId && (
              <Link
                href={`/t/${tripId}/place/${selectedStop.placeId}?from=map`}
                className="mt-4 flex items-center justify-between rounded-2xl bg-accent px-4 py-3 text-[14px] font-bold text-accentInk"
              >
                {t(locale, "viewFullDetails")}
                <ChevronRight size={17} className="rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>
      )}

      {selectedConnector && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/30"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedConnector(null)}
        >
          <div className="w-full rounded-t-3xl bg-bg p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl leading-none">{MODE_EMOJI[selectedConnector.mode]}</span>
                <div>
                  <p className="font-display text-[16px] font-semibold text-ink">{t(locale, MODE_LABEL_KEY[selectedConnector.mode])}</p>
                  <p className="truncate text-[12.5px] text-inkFaint">
                    {selectedConnector.fromCityName} → {selectedConnector.toCityName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConnector(null)}
                aria-label={t(locale, "close")}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface2 text-inkSoft"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              {(selectedConnector.departTime || selectedConnector.departDate) && (
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-inkFaint">{t(locale, "departure")}</span>
                  <span className="ltr-nums font-semibold text-ink">
                    {[selectedConnector.departDate ? formatDateLong(selectedConnector.departDate, locale) : null, selectedConnector.departTime]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )}
              {selectedConnector.arriveTime && (
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-inkFaint">{t(locale, "arrival")}</span>
                  <span className="ltr-nums font-semibold text-ink">{selectedConnector.arriveTime}</span>
                </div>
              )}
              {selectedConnector.carrier && (
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-inkFaint">{t(locale, "carrierLabel")}</span>
                  <span className="font-semibold text-ink">{selectedConnector.carrier}</span>
                </div>
              )}
              {selectedConnector.referenceNumber && (
                <div className="flex items-center justify-between border-t border-border pt-2 text-[13.5px]">
                  <span className="text-inkFaint">{t(locale, "confirmationNumber")}</span>
                  <span className="ltr-nums font-mono font-semibold text-ink">{selectedConnector.referenceNumber}</span>
                </div>
              )}
              {!selectedConnector.departTime &&
                !selectedConnector.departDate &&
                !selectedConnector.arriveTime &&
                !selectedConnector.carrier &&
                !selectedConnector.referenceNumber && <p className="text-[13px] text-inkFaint">{t(locale, "identifiedAutomatically")}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
