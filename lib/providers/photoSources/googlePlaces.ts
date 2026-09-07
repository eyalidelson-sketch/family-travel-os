// Real-photo source #1 (preferred): Google Places API (New) — Text Search to
// find the actual venue, then its photo references. Needs
// GOOGLE_PLACES_API_KEY with "Places API (New)" enabled on the project.
// Returns null — never throws — on any missing key, network failure, or no
// match, so callers can always fall back to Unsplash (and then the
// deterministic placeholder tile) without special-casing errors.
//
// The photo *media* endpoint requires the API key on every request and
// returns image bytes directly (not a stable public URL), so it must be
// called server-side — never put GOOGLE_PLACES_API_KEY in a NEXT_PUBLIC_
// variable or build an <img src> straight to it from client code. This
// module hands back opaque photo "names"; app/api/photo-proxy/route.ts is
// the only place the key is actually attached to an image request, so the
// browser only ever sees our own same-origin proxy URL.

export interface GooglePlacePhotoRef {
  /** Opaque resource name like "places/PLACE_ID/photos/PHOTO_ID" — pass to buildGooglePhotoProxyUrl, never expose directly. */
  name: string;
}

interface GoogleSearchTextResponse {
  places?: Array<{ photos?: Array<{ name?: string }> }>;
}

export async function searchGooglePlacePhotos(query: string, count = 3): Promise<GooglePlacePhotoRef[] | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.photos"
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
      next: { revalidate: 60 * 60 * 24 }
    });
    if (!res.ok) {
      console.error(`Google Places search failed (${res.status}) for "${query}"`);
      return null;
    }
    const data = (await res.json()) as GoogleSearchTextResponse;
    const photos = data.places?.[0]?.photos ?? [];
    const refs = photos.slice(0, count).filter((p): p is { name: string } => Boolean(p.name)).map((p) => ({ name: p.name }));
    return refs.length > 0 ? refs : null;
  } catch (err) {
    console.error(`Google Places photo search threw for "${query}":`, err);
    return null;
  }
}

export function buildGooglePhotoProxyUrl(photoName: string, maxWidthPx = 900): string {
  return `/api/photo-proxy?name=${encodeURIComponent(photoName)}&w=${maxWidthPx}`;
}
