import { parseItinerary } from "@/lib/ai/parseItinerary";
import { PARSE_STAGE_ORDER, type ParseStage } from "@/lib/parsing-types";
import { sleep } from "@/lib/util";
import { detectUploadKind, extractTextFromUpload, MAX_UPLOAD_BYTES } from "@/lib/parsing/extractText";
import { attachRealPhotos } from "@/lib/parsing/attachPhotos";

export const runtime = "nodejs";

// Streams newline-delimited JSON progress events while the real parse runs
// concurrently, so the client can show granular stages ("Extracting
// dates…", "Identifying hotels…") instead of one opaque spinner. The visible
// stages are honest about the pipeline's real steps; the dwell time on each
// is a fixed minimum so a fast heuristic parse doesn't just flash past them.
const DISPLAY_STAGES: ParseStage[] = PARSE_STAGE_ORDER.filter((s) => s !== "done");
const MIN_STAGE_MS = 480;

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" }
  });
}

/**
 * Universal Trip Parsing (Text & File Import): accepts either raw pasted
 * text (JSON `{ text }`, the original Phase 1 shape) or an uploaded file
 * (`multipart/form-data` with a `file` field — PDF/DOCX/TXT). Either way,
 * everything below the initial text extraction is identical — both input
 * modes funnel into the exact same `parseItinerary()` call, so there is one
 * AI parsing engine behind both, not two.
 */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let text = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return errorResponse("No file was attached. Choose a PDF, DOCX, or TXT file.");
    }
    if (file.size === 0) {
      return errorResponse("That file looks empty.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return errorResponse("That file is too large — please upload something under 15MB.");
    }

    const kind = detectUploadKind(file.name, file.type);
    if (!kind) {
      return errorResponse("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      text = (await extractTextFromUpload(buffer, kind)).trim();
    } catch (err) {
      console.error("File text extraction failed:", err);
      return errorResponse(err instanceof Error ? err.message : "We couldn't read that file.", 422);
    }

    if (!text) {
      return errorResponse("We couldn't find any readable text in that file — it may be a scanned image. Try pasting the itinerary text instead.");
    }
  } else {
    const body = await req.json().catch(() => null);
    text = typeof body?.text === "string" ? body.text.trim() : "";
  }

  if (!text) {
    return errorResponse("No itinerary text provided.");
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      // The real-photo pre-fetch for the review screen (Automatic Real-Photo
      // & Detail Resolution, applied before confirm — see
      // lib/parsing/attachPhotos.ts) is chained onto the same promise as the
      // AI parse itself, so it overlaps with the cosmetic DISPLAY_STAGES
      // delay below exactly like the parse already did before this feature
      // existed — no extra perceived wait on top of what was already there.
      const parsePromise = parseItinerary(text).then(async ({ trip, engine, engineNote }) => {
        // engineNote is only set when the heuristic parser ran in a way the
        // organizer should actually know about (no ANTHROPIC_API_KEY, or
        // Claude was configured but failed/returned nothing usable). Surface
        // it as a warning only when the heuristic parser itself is already
        // flagging trouble (e.g. "we couldn't find any recognizable dates")
        // — a clean heuristic parse of simple pasted text still shows
        // nothing extra, so the zero-config demo path stays exactly as quiet
        // as it always was.
        if (engineNote && trip.warnings.length > 0) {
          trip.warnings = [engineNote, ...trip.warnings];
        }
        const enrichedTrip = await attachRealPhotos(trip).catch((err) => {
          console.error("Real-photo pre-fetch for the review screen failed entirely (non-fatal):", err);
          return trip;
        });
        return { trip: enrichedTrip, engine };
      });

      for (const stage of DISPLAY_STAGES) {
        send({ stage });
        await sleep(MIN_STAGE_MS);
      }

      try {
        const { trip, engine } = await parsePromise;
        send({ stage: "done", trip, engine });
      } catch (err) {
        console.error("Itinerary parsing failed entirely:", err);
        send({ stage: "error", message: "Something went wrong while reading that itinerary. Please try again." });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache"
    }
  });
}
