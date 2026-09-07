"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, ChevronRight, MapPin, CalendarDays } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { t, type TranslationKey } from "@/lib/i18n/translations";
import { formatDateLong } from "@/lib/format";
import { curveControlPoint, pointOnQuadratic, type LayoutPoint } from "@/lib/map/layout";
import type { TransportMode } from "@/lib/types";

export interface RouteMapStopVM {
  key: string;
  placeId?: string;
  cityName: string;
  country?: string;
  startDate: string;
  endDate: string;
  photoUrl?: string;
  isRealLocation: boolean;
  point: LayoutPoint;
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

export function RouteMap({
  locale,
  tripId,
  width,
  height,
  stops,
  connectors
}: {
  locale: Locale;
  tripId: string;
  width: number;
  height: number;
  stops: RouteMapStopVM[];
  /** One entry per gap between consecutive stops, or undefined when no transport record was found for that leg. */
  connectors: (RouteMapConnectorVM | undefined)[];
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [selectedStop, setSelectedStop] = useState<RouteMapStopVM | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<RouteMapConnectorVM | null>(null);

  const segments = stops.slice(1).map((stop, i) => {
    const a = stops[i]!.point;
    const b = stop.point;
    const control = curveControlPoint(a, b, i);
    return { a, b, control };
  });

  const pathD = segments.length
    ? `M ${segments[0]!.a.x},${segments[0]!.a.y} ` + segments.map((s) => `Q ${s.control.x},${s.control.y} ${s.b.x},${s.b.y}`).join(" ")
    : "";

  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength();
      setPathLength(len);
      setDrawn(false);
      const raf = requestAnimationFrame(() => setDrawn(true));
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [pathD]);

  const pinRadius = 4.4;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" role="img" aria-label={t(locale, "routeMapTitle")}>
        {pathD && (
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke="currentColor"
            className="text-accent"
            strokeWidth={0.9}
            strokeLinecap="round"
            strokeDasharray={pathLength ?? undefined}
            strokeDashoffset={drawn ? 0 : pathLength ?? 0}
            style={{ transition: "stroke-dashoffset 1.6s ease-out" }}
          />
        )}

        {segments.map((seg, i) => {
          const connector = connectors[i];
          const mid = pointOnQuadratic(seg.a, seg.control, seg.b, 0.5);
          return (
            <g
              key={`connector-${i}`}
              transform={`translate(${mid.x}, ${mid.y})`}
              onClick={() => connector && setSelectedConnector(connector)}
              className={connector ? "cursor-pointer" : ""}
            >
              <circle r={connector ? 3.6 : 2.2} className="fill-surface stroke-border" strokeWidth={0.3} />
              <text textAnchor="middle" dominantBaseline="central" fontSize={connector ? 4 : 2.6}>
                {connector ? MODE_EMOJI[connector.mode] : "•"}
              </text>
            </g>
          );
        })}

        {stops.map((stop) => (
          <g key={stop.key} transform={`translate(${stop.point.x}, ${stop.point.y})`} onClick={() => setSelectedStop(stop)} className="cursor-pointer">
            <circle r={pinRadius + 0.9} className="fill-bg stroke-accent" strokeWidth={0.6} />
            {stop.photoUrl ? (
              <>
                <clipPath id={`clip-${stop.key}`}>
                  <circle r={pinRadius} />
                </clipPath>
                <image
                  href={stop.photoUrl}
                  x={-pinRadius}
                  y={-pinRadius}
                  width={pinRadius * 2}
                  height={pinRadius * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#clip-${stop.key})`}
                />
              </>
            ) : (
              <>
                <circle r={pinRadius} className="fill-accentSoft" />
                <text textAnchor="middle" dominantBaseline="central" fontSize={pinRadius * 1.4} className="fill-accent font-bold">
                  {initials(stop.cityName)}
                </text>
              </>
            )}
            {!stop.isRealLocation && (
              <circle cx={pinRadius * 0.68} cy={pinRadius * 0.68} r={1.1} className="fill-inkFaint stroke-bg" strokeWidth={0.35} />
            )}
          </g>
        ))}
      </svg>

      {selectedStop && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/30"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedStop(null)}
        >
          <div
            className="w-full rounded-t-3xl bg-bg p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
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

            {!selectedStop.isRealLocation && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[12px] text-inkFaint">
                <MapPin size={13} className="mt-0.5 flex-none" /> {t(locale, "approximateLocation")}
              </p>
            )}

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
          <div
            className="w-full rounded-t-3xl bg-bg p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
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
