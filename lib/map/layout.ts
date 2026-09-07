// Geometry for the Trip Route Map (Feature 2 of the Combined Pass). No map
// tile library or API key involved on purpose: this sandbox can't install a
// new npm dependency (no registry access — see the README), a live tile
// provider would need its own API key on top of the "free, zero-config"
// ethos of the enrichment feature this ships alongside, and — most
// importantly — the vast majority of places resolved from a real imported
// itinerary (see lib/providers/places.ts's KNOWN_PLACES: only a handful of
// curated demo cities/attractions carry real lat/lng) have no coordinates at
// all, so "real map tiles" wouldn't even render meaningfully better for the
// primary use case this was built for.
//
// Instead: a small hybrid layout algorithm that degrades gracefully —
//   1. Stops with real lat/lng are projected (equirectangular) and keep their
//      true relative geography.
//   2. Stops without coordinates, but with at least one geocoded neighbor
//      somewhere in the sequence, are placed by linear interpolation (between
//      two known neighbors) or extrapolation (past the first/last known
//      neighbor) along the route's index order — so an ungeocoded city
//      between two geocoded ones still lands roughly on the line between
//      them, and one past the last geocoded city continues in the same
//      direction rather than snapping back to the origin.
//   3. If NO stop in the whole trip has coordinates (a fully novel imported
//      itinerary with no curated matches at all), the route falls back to a
//      gentle top-to-bottom wave — still a coherent, readable "journey" shape,
//      just an honestly stylized one rather than a fabricated map.
//
// Either way the output is the same shape: normalized {x, y} points inside a
// single SVG viewBox that components/map/RouteMap.tsx draws a path through.

export interface RouteMapStopInput {
  key: string;
  cityName: string;
  country?: string;
  lat?: number;
  lng?: number;
  startDate: string;
  endDate: string;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface LaidOutStop extends RouteMapStopInput {
  point: LayoutPoint;
  /** true when this point comes from a real, geocoded lat/lng — false when it was interpolated/extrapolated/zigzagged. Surfaced so the UI can be honest about which pins are approximate. */
  isRealLocation: boolean;
}

export interface RouteLayout {
  stops: LaidOutStop[];
  width: number;
  height: number;
  /** true if at least one stop in the trip had real coordinates to anchor the layout to. */
  hasAnyRealLocation: boolean;
}

const PAD = 14;
const CANVAS_WIDTH = 100;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 1400;
const HEIGHT_PER_STOP = 90;
const HEIGHT_BASE = 60;

function heightForStopCount(count: number): number {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, HEIGHT_BASE + count * HEIGHT_PER_STOP));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Fills in every `null` entry in `points` (in place order) by linear
 * interpolation between the nearest known neighbors on either side, or by
 * extrapolating along the last known direction when a gap runs off the start
 * or end of the sequence. Operates in whatever coordinate space `points`
 * already uses (raw projected degrees, or final canvas units) — the caller
 * decides when to call this.
 */
function fillMissing(points: (LayoutPoint | null)[], defaultStep: LayoutPoint): LayoutPoint[] {
  const n = points.length;
  const knownIdx = points.reduce<number[]>((acc, p, i) => {
    if (p) acc.push(i);
    return acc;
  }, []);

  if (knownIdx.length === 0) {
    // Nothing to anchor to at all — caller should have used the zigzag path
    // instead, but stay defensive rather than throwing.
    return points.map((_, i) => ({ x: defaultStep.x * i, y: defaultStep.y * i }));
  }

  const result: LayoutPoint[] = new Array(n);
  for (const i of knownIdx) result[i] = points[i]!;

  // Interpolate every gap strictly between two known indices.
  for (let k = 0; k < knownIdx.length - 1; k++) {
    const a = knownIdx[k]!;
    const b = knownIdx[k + 1]!;
    for (let i = a + 1; i < b; i++) {
      const t = (i - a) / (b - a);
      result[i] = { x: lerp(result[a]!.x, result[b]!.x, t), y: lerp(result[a]!.y, result[b]!.y, t) };
    }
  }

  // Extrapolate before the first known point, continuing the direction of
  // the first known segment (or a default downward step if there's only one
  // known point in the whole trip).
  const first = knownIdx[0]!;
  if (first > 0) {
    const dir =
      knownIdx.length > 1
        ? (() => {
            const second = knownIdx[1]!;
            const span = second - first;
            return { x: (result[second]!.x - result[first]!.x) / span, y: (result[second]!.y - result[first]!.y) / span };
          })()
        : defaultStep;
    for (let i = first - 1; i >= 0; i--) {
      const dist = first - i;
      result[i] = { x: result[first]!.x - dir.x * dist, y: result[first]!.y - dir.y * dist };
    }
  }

  // Extrapolate past the last known point, same idea in the forward direction.
  const last = knownIdx[knownIdx.length - 1]!;
  if (last < n - 1) {
    const dir =
      knownIdx.length > 1
        ? (() => {
            const secondLast = knownIdx[knownIdx.length - 2]!;
            const span = last - secondLast;
            return { x: (result[last]!.x - result[secondLast]!.x) / span, y: (result[last]!.y - result[secondLast]!.y) / span };
          })()
        : defaultStep;
    for (let i = last + 1; i < n; i++) {
      const dist = i - last;
      result[i] = { x: result[last]!.x + dir.x * dist, y: result[last]!.y + dir.y * dist };
    }
  }

  return result;
}

function zigzagLayout(stops: RouteMapStopInput[]): RouteLayout {
  const height = heightForStopCount(stops.length);
  const usableH = height - PAD * 2;
  const step = stops.length > 1 ? usableH / (stops.length - 1) : 0;
  const laidOut: LaidOutStop[] = stops.map((stop, i) => {
    const y = stops.length > 1 ? PAD + i * step : height / 2;
    const x = CANVAS_WIDTH / 2 + 24 * Math.sin(i * 0.85);
    return { ...stop, point: { x, y }, isRealLocation: false };
  });
  return { stops: laidOut, width: CANVAS_WIDTH, height, hasAnyRealLocation: false };
}

/** Equirectangular projection: longitude maps directly to x, latitude flips onto y so north stays "up" in an SVG (where y grows downward). */
function project(lat: number, lng: number): LayoutPoint {
  return { x: lng, y: -lat };
}

function geoLayout(stops: RouteMapStopInput[]): RouteLayout {
  const rawPoints: (LayoutPoint | null)[] = stops.map((s) =>
    typeof s.lat === "number" && typeof s.lng === "number" ? project(s.lat, s.lng) : null
  );

  // A modest default step (in degree-ish units) for the edge case where only
  // one stop in the whole trip has real coordinates — there's no direction to
  // infer, so the rest just spread out vertically below/above it.
  const filled = fillMissing(rawPoints, { x: 0, y: 0.6 });

  const xs = filled.map((p) => p.x);
  const ys = filled.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bboxW = maxX - minX || 0.001;
  const bboxH = maxY - minY || 0.001;

  const height = heightForStopCount(stops.length);
  const usableW = CANVAS_WIDTH - PAD * 2;
  const usableH = height - PAD * 2;

  // Uniform scale (never stretched independently on x/y, so the route's real
  // shape is preserved) chosen to fit inside whichever of width/height is
  // tighter, then centered in the other axis.
  const scale = Math.min(usableW / bboxW, usableH / bboxH);
  const contentW = bboxW * scale;
  const contentH = bboxH * scale;
  const offsetX = PAD + (usableW - contentW) / 2;
  const offsetY = PAD + (usableH - contentH) / 2;

  const laidOut: LaidOutStop[] = stops.map((stop, i) => {
    const raw = filled[i]!;
    return {
      ...stop,
      point: { x: offsetX + (raw.x - minX) * scale, y: offsetY + (raw.y - minY) * scale },
      isRealLocation: rawPoints[i] !== null
    };
  });

  return { stops: laidOut, width: CANVAS_WIDTH, height, hasAnyRealLocation: true };
}

export function layoutRoute(stops: RouteMapStopInput[]): RouteLayout {
  if (stops.length === 0) return { stops: [], width: CANVAS_WIDTH, height: MIN_HEIGHT, hasAnyRealLocation: false };
  const anyKnown = stops.some((s) => typeof s.lat === "number" && typeof s.lng === "number");
  return anyKnown ? geoLayout(stops) : zigzagLayout(stops);
}

/** A control point for a quadratic Bézier between two consecutive stops, offset perpendicular to the segment for a gentle "flight arc" curve rather than a straight line. Direction alternates per segment index so consecutive curves don't all bow the same way. */
export function curveControlPoint(a: LayoutPoint, b: LayoutPoint, segmentIndex: number): LayoutPoint {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular unit vector, bend magnitude scaled to segment length so
  // short hops don't get an oversized bow and long ones don't look flat.
  const bend = Math.min(len * 0.18, 10) * (segmentIndex % 2 === 0 ? 1 : -1);
  const nx = (-dy / len) * bend;
  const ny = (dx / len) * bend;
  return { x: mx + nx, y: my + ny };
}

/** Point at t (0-1) along the quadratic Bézier a -> control -> b — used to place a transport icon at each curve's midpoint. */
export function pointOnQuadratic(a: LayoutPoint, control: LayoutPoint, b: LayoutPoint, t: number): LayoutPoint {
  const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * control.x + t * t * b.x;
  const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * control.y + t * t * b.y;
  return { x, y };
}
