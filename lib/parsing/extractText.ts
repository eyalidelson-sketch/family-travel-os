// Text extraction for the "upload a file" input mode (Universal Trip
// Parsing, sub-feature 1). TXT needs nothing extra. PDF and DOCX need two
// small, widely-used parsing libraries — `pdf-parse` and `mammoth` — that
// are declared in package.json but, like every dependency in this project,
// have to actually be installed locally with `npm install` before this
// sandbox's edits take effect (see the README's "Universal Trip Parsing"
// section for exactly why: this environment's network egress can't reach
// the npm registry, so the packages can be declared here but not fetched
// here).
//
// Both libraries are loaded with a dynamic import specifically so a project
// that hasn't run `npm install` yet fails ONE upload attempt with a clear,
// actionable message — not the whole app, and not a cryptic Next.js
// module-resolution stack trace. Text-paste keeps working either way; this
// is purely additive.

export type UploadKind = "pdf" | "docx" | "txt";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // generous for a text itinerary, small enough to stay fast

export function detectUploadKind(filename: string, mimeType: string): UploadKind | null {
  const lower = filename.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    return "docx";
  }
  if (mimeType.startsWith("text/") || lower.endsWith(".txt")) return "txt";
  return null;
}

function isMissingModule(err: unknown, moduleName: string): boolean {
  const code = (err as { code?: string } | undefined)?.code;
  const message = err instanceof Error ? err.message : String(err);
  return code === "MODULE_NOT_FOUND" || message.includes(`Cannot find module '${moduleName}'`);
}

function setupNeededMessage(pkg: string, formatLabel: string): string {
  return (
    `${formatLabel} import needs one more local setup step: run "npm install" in your project ` +
    `(it adds the "${pkg}" package to node_modules), then try uploading again. Nothing else in ` +
    `the app is affected — pasting itinerary text still works right now without this step.`
  );
}

/**
 * Extracts plain text from an uploaded itinerary file. Whatever comes back
 * is handed to the exact same `parseItinerary()` used for pasted text
 * (app/api/parse-itinerary/route.ts) — file upload is a second way to get
 * text into the one AI parsing engine, not a second parsing pipeline.
 */
export async function extractTextFromUpload(buffer: Buffer, kind: UploadKind): Promise<string> {
  if (kind === "txt") {
    return buffer.toString("utf-8");
  }

  if (kind === "pdf") {
    const pdfParse = await import("pdf-parse")
      .then((mod) => mod.default)
      .catch((err: unknown) => {
        if (isMissingModule(err, "pdf-parse")) throw new Error(setupNeededMessage("pdf-parse", "PDF"));
        throw err;
      });
    try {
      const result = await pdfParse(buffer);
      return String(result.text ?? "");
    } catch (err) {
      console.error("pdf-parse failed to read the uploaded PDF:", err);
      throw new Error(
        "We couldn't read that PDF — it may be a scanned image rather than real text, or the file may be corrupted. Try pasting the itinerary text instead."
      );
    }
  }

  // docx
  const mammoth = await import("mammoth").catch((err: unknown) => {
    if (isMissingModule(err, "mammoth")) throw new Error(setupNeededMessage("mammoth", "Word document (.docx)"));
    throw err;
  });
  try {
    // Real-world itineraries exported from Word very often carry the actual
    // travel facts (hotels, flights, trains, rental cars — exactly what
    // "Parse Reservation Tables" needs) in tables, not prose. mammoth's
    // plain `extractRawText` flattens a table's cells into a run of words
    // with no row/column boundaries left at all, which makes even an LLM's
    // job needlessly hard — a "Date | Hotel | Provider | Booking No." table
    // comes out as an undifferentiated word salad. Converting to HTML first
    // keeps mammoth's own `<table><tr><td>` structure intact, and
    // `htmlToStructuredText` below turns each table back into plain,
    // unambiguous `label | value | value` rows before Claude ever sees it.
    const result = await mammoth.convertToHtml({ buffer });
    return htmlToStructuredText(result.value ?? "");
  } catch (err) {
    console.error("mammoth failed to read the uploaded DOCX:", err);
    throw new Error("We couldn't read that Word document. Try pasting the itinerary text instead.");
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** One `<table>...</table>` block -> plain `cell | cell | cell` rows, wrapped in [table]/[/table] markers so the AI parser can tell "this was a table" apart from an ordinary sentence even after everything else has been reduced to plain text. */
function tableToText(tableInnerHtml: string): string {
  const rowMatches = [...tableInnerHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const rows = rowMatches
    .map((rowMatch) => {
      const cellMatches = [...rowMatch[1]!.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
      return cellMatches.map((cellMatch) => stripTags(cellMatch[1]!)).join(" | ");
    })
    .filter((row) => row.trim().length > 0);
  if (rows.length === 0) return "";
  return `\n[table]\n${rows.join("\n")}\n[/table]\n`;
}

/**
 * Converts mammoth's HTML output into plain text for the AI parser, with one
 * deliberate exception: every `<table>` is rendered as explicit `cell | cell`
 * rows (see tableToText) instead of being flattened into unstructured prose,
 * since that structure is exactly what reservation-summary tables need to
 * stay parseable. Not a general-purpose HTML-to-text converter — just enough
 * of one for the plain, semantic HTML mammoth produces (paragraphs, headings,
 * lists, tables, no inline styling to worry about).
 */
function htmlToStructuredText(html: string): string {
  let text = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, inner: string) => tableToText(inner));

  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ");

  text = decodeHtmlEntities(text.replace(/<[^>]+>/g, ""));
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
