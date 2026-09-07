// Real-photo source #2 (fallback): Unsplash's Search Photos endpoint. Needs
// UNSPLASH_ACCESS_KEY (a free developer account gets one in a couple of
// minutes at unsplash.com/developers). Returns null — never throws — on any
// missing key, network failure, or empty result, so callers can always fall
// back to the next source without special-casing errors.
//
// Note: Unsplash's API guidelines ask that a production integration ping
// their download-tracking endpoint when a photo is actually used, and credit
// the photographer. This demo shows a plain "Photos via Unsplash" caption
// (see PhotoGallery) but does not implement the download-tracking ping —
// worth adding before shipping this to real users at any volume.

export interface UnsplashPhoto {
  url: string;
  alt: string;
}

interface UnsplashSearchResponse {
  results?: Array<{
    urls?: { regular?: string; small?: string };
    alt_description?: string | null;
  }>;
}

export async function fetchUnsplashPhotos(query: string, count = 3): Promise<UnsplashPhoto[] | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&content_filter=high`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      // Our own enrichment cache (30 days) is the real TTL; this just avoids
      // hammering Unsplash if the fetch cache layer also sees this request.
      next: { revalidate: 60 * 60 * 24 }
    });
    if (!res.ok) {
      console.error(`Unsplash search failed (${res.status}) for "${query}"`);
      return null;
    }
    const data = (await res.json()) as UnsplashSearchResponse;
    const results = data.results ?? [];
    const photos = results
      .map((r) => ({ url: r.urls?.regular ?? r.urls?.small ?? "", alt: r.alt_description || query }))
      .filter((p): p is UnsplashPhoto => Boolean(p.url));
    return photos.length > 0 ? photos : null;
  } catch (err) {
    console.error(`Unsplash photo search threw for "${query}":`, err);
    return null;
  }
}
