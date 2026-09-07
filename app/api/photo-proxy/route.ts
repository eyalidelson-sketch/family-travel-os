import { NextRequest } from "next/server";

export const runtime = "nodejs";

// The only place GOOGLE_PLACES_API_KEY ever gets attached to a request. The
// browser is handed this route's own URL (see buildGooglePhotoProxyUrl) and
// never sees the key — this route fetches the actual image bytes from
// Google server-side and streams them straight through.
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  const width = req.nextUrl.searchParams.get("w") ?? "900";
  const key = process.env.GOOGLE_PLACES_API_KEY;

  if (!name || !key) {
    return new Response("Not found", { status: 404 });
  }
  // `name` is always a "places/.../photos/..." resource name we generated ourselves
  // (see searchGooglePlacePhotos) — reject anything else defensively.
  if (!/^places\/[^/]+\/photos\/[^/?#]+$/.test(name)) {
    return new Response("Invalid photo reference", { status: 400 });
  }

  try {
    const upstream = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=${encodeURIComponent(width)}&key=${key}`);
    if (!upstream.ok || !upstream.body) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(upstream.body, {
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=2592000, immutable"
      }
    });
  } catch (err) {
    console.error("Photo proxy fetch failed:", err);
    return new Response("Not found", { status: 404 });
  }
}
