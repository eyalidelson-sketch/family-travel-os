// Shared text-cleanup helpers for the offline (no-Claude-key) parsing path.
// The table-to-text conversion in lib/parsing/extractText.ts wraps every
// table row in `[table]`/`[/table]` markers and per-day summary tables use a
// "LABEL / value" cell shape (e.g. "OVERNIGHT / La Vista Daisetsuzan"). The
// heuristic parser (lib/ai/heuristicParser.ts) now understands that shape
// structurally and never hands these tokens to a place/day name in the first
// place — but this stays as a small, cheap defense-in-depth layer wherever a
// name reaches a photo-search query, in case anything upstream (a future
// parser, a hand-typed paste that happens to include these tokens) doesn't.

const STRUCTURAL_NOISE = /\[\/?table\]/gi;
const LABEL_NOISE = /\b(OVERNIGHT|TRANSPORT|DAY TYPE)\b\s*[/:-]?\s*/gi;

/** Strips `[table]`/`[/table]` markers and "LABEL / " prefixes, collapsing whitespace. */
export function stripStructuralNoise(text: string): string {
  return text
    .replace(STRUCTURAL_NOISE, " ")
    .replace(LABEL_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Last-resort cleanup before a name is used as a photo-search query
 * (lib/enrichment/photos.ts) — strips the same structural noise, plus a
 * leading placeholder dash ("—" for "no hotel that night") and stray pipe
 * characters, so a malformed name never gets sent to Unsplash/Google Places
 * verbatim.
 */
export function sanitizeQueryName(name: string): string {
  return stripStructuralNoise(name)
    .replace(/\|/g, " ")
    .replace(/^[-—\s]+|[-—\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
