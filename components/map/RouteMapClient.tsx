"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/translations";
import type { LeafletRouteStopVM, RouteMapConnectorVM } from "./LeafletRouteMap";

/**
 * Client-boundary wrapper around LeafletRouteMap. Next.js App Router forbids
 * `dynamic(..., { ssr: false })` directly inside a Server Component (the map
 * page, app/t/[tripId]/map/page.tsx, is one) — Leaflet touches `window`/
 * `document` at import time and would crash during server rendering, so the
 * ssr:false import has to live in an intermediate "use client" component
 * like this one instead.
 *
 * The `loading` fallback can't call the `t()` helper with a real locale
 * (next/dynamic's loading component takes no props), so it reads the
 * locale straight off <html lang> at render time — set server-side by the
 * root layout — falling back to English if that ever comes back empty.
 */
function loadingLabel(): string {
  if (typeof document !== "undefined" && document.documentElement.lang === "he") {
    return t("he", "routeMapLoading");
  }
  return t("en", "routeMapLoading");
}

const LeafletRouteMap = dynamic(() => import("./LeafletRouteMap").then((m) => m.LeafletRouteMap), {
  ssr: false,
  loading: () => (
    <div
      className="flex w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface text-[13px] text-inkFaint"
      style={{ height: "70vh", minHeight: 380 }}
    >
      <span className="animate-pulse">{loadingLabel()}</span>
    </div>
  )
});

export function RouteMapClient({
  locale,
  tripId,
  stops,
  connectors
}: {
  locale: Locale;
  tripId: string;
  stops: LeafletRouteStopVM[];
  connectors: (RouteMapConnectorVM | undefined)[];
}) {
  return <LeafletRouteMap locale={locale} tripId={tripId} stops={stops} connectors={connectors} />;
}
