// Real, free, no-API-key content source: Wikipedia's public REST/Action
// APIs. No registration, no key, no billing account — this is what actually
// closes the gap the other two photo sources (Google Places, Unsplash) and
// Claude enrichment leave behind when NONE of them are configured: instead
// of a category-derived generic sentence and a placeholder tile, a real
// place gets its real Wikipedia photo and its real opening paragraph, the
// same "just ask about the place" result a person would get by searching
// it themselves — with zero setup.
//
// Two calls, both public and unauthenticated:
//   1. The classic search API finds the best-matching article TITLE for a
//      loose query — a place name like "Shirogane Blue Pond" or "La Vista
//      Daisetsuzan" essentially never matches a Wikipedia title exactly, so
//      an exact-title lookup alone would miss almost everything.
//   2. The REST summary endpoint returns that article's lead paragraph
//      (`extract`) and a real photo (`thumbnail`/`originalimage`) in one
//      response.
// Never throws — any failure (no matching article, a disambiguation page,
// a network error, a hotel/restaurant with no Wikipedia article at all —
// the common case) returns null so callers fall back to the next source,
// exactly like googlePlaces.ts and unsplash.ts already do.

export interface WikipediaSummary {
  title: string;
  extract: string;
  thumbnailUrl?: string;
  pageUrl?: string;
}

interface WikiSearchResponse {
  query?: { search?: Array<{ title?: string }> };
}

interface WikiSummaryResponse {
  title?: string;
  extract?: string;
  type?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

const REVALIDATE_SECONDS = 60 * 60 * 24 * 7; // a week — Wikipedia articles don't change fast enough to need our 30-day enrichment TTL to be the only cache

async function findBestArticleTitle(query: string, lang: string): Promise<string | null> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=1&srsearch=${encodeURIComponent(query)}&origin=*`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    const data = (await res.json()) as WikiSearchResponse;
    return data.query?.search?.[0]?.title ?? null;
  } catch (err) {
    console.error(`Wikipedia search failed for "${query}" (${lang}):`, err);
    return null;
  }
}

/**
 * `query` should be the place's own name, optionally with a city appended
 * for disambiguation help (Wikipedia's search is full-text/fuzzy, so extra
 * context words improve ranking without needing an exact match). `lang` is
 * a Wikipedia language edition code ("en", "he", ...) — pass "he" to try
 * for genuine Hebrew source content instead of translating the English
 * extract, same "Automatic Bilingual Generation" spirit as the Claude path.
 */
export async function fetchWikipediaSummary(query: string, lang: "en" | "he" = "en"): Promise<WikipediaSummary | null> {
  const title = await findBestArticleTitle(query, lang);
  if (!title) return null;

  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    const data = (await res.json()) as WikiSummaryResponse;
    // A disambiguation page's "extract" is just a "X may refer to:" list —
    // not real content about any specific place — so treat it as no match
    // rather than showing that list as a description.
    if (data.type === "disambiguation") return null;
    if (!data.extract) return null;
    return {
      title: data.title ?? title,
      extract: data.extract,
      thumbnailUrl: data.originalimage?.source ?? data.thumbnail?.source,
      pageUrl: data.content_urls?.desktop?.page
    };
  } catch (err) {
    console.error(`Wikipedia summary fetch failed for "${title}" (${lang}):`, err);
    return null;
  }
}
