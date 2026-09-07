"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileText, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ParsingProgress } from "./ParsingProgress";
import { ReviewItinerary } from "./ReviewItinerary";
import { TripCreated } from "./TripCreated";
import type { ParsedTrip } from "@/lib/parsing-types";
import type { ParseStage } from "@/lib/parsing-types";
import { createTripAction, type CreateTripResult } from "@/lib/actions";

const PLACEHOLDER = `September 14 – Arrive Tokyo
Staying Hilton Tokyo until September 19

September 15
Shibuya morning
Meiji Shrine
Dinner in Shinjuku

September 16
Tokyo Disneyland

September 19
Shinkansen Tokyo → Kyoto
Staying at Hotel Granvia Kyoto until September 24`;

type Step = "input" | "parsing" | "review" | "creating" | "created";
type InputMode = "paste" | "upload";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CreateFlow() {
  const [step, setStep] = useState<Step>("input");
  const [mode, setMode] = useState<InputMode>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [organizerName, setOrganizerName] = useState("");
  const [stage, setStage] = useState<ParseStage | null>(null);
  const [parsed, setParsed] = useState<ParsedTrip | null>(null);
  const [created, setCreated] = useState<CreateTripResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFormNotice, setShowFormNotice] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canParse = mode === "paste" ? Boolean(text.trim()) : Boolean(file);

  async function runParse() {
    if (!canParse) return;
    setError(null);
    setStep("parsing");
    setStage("extracting");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let res: Response;
      if (mode === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/parse-itinerary", { method: "POST", body: formData, signal: controller.signal });
      } else {
        res = await fetch("/api/parse-itinerary", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal
        });
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.error ?? "Something went wrong. Please try again.");
        setStep("input");
        return;
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.stage === "error") {
            setError(event.message ?? "Something went wrong.");
            setStep("input");
            return;
          }
          if (event.stage === "done") {
            setParsed(event.trip as ParsedTrip);
            setStep("review");
            return;
          }
          setStage(event.stage as ParseStage);
        }
      }
    } catch (err) {
      console.error(err);
      setError("We couldn't reach the parser. Please try again.");
      setStep("input");
    }
  }

  async function handleConfirm() {
    if (!parsed) return;
    setStep("creating");
    try {
      const result = await createTripAction(parsed, organizerName);
      setCreated(result);
      setStep("created");
    } catch (err) {
      console.error(err);
      setError("We couldn't create the trip. Please try again.");
      setStep("review");
    }
  }

  if (step === "parsing" || step === "creating") {
    return (
      <ParsingProgress
        currentStage={step === "creating" ? "done" : stage}
        title={step === "creating" ? "Creating your family trip" : undefined}
      />
    );
  }

  if (step === "review" && parsed) {
    return (
      <ReviewItinerary
        trip={parsed}
        onChange={setParsed}
        organizerName={organizerName}
        onOrganizerNameChange={setOrganizerName}
        onConfirm={handleConfirm}
        onBack={() => {
          setParsed(null);
          setStep("input");
        }}
        busy={false}
      />
    );
  }

  if (step === "created" && created) {
    return <TripCreated result={created} />;
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-10 pt-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-inkFaint hover:text-ink">
        <ChevronLeft size={16} /> Back
      </Link>

      <h1 className="mt-6 text-2xl font-semibold text-ink">Tell us about the trip</h1>
      <p className="mt-1 mb-5 text-[15px] text-inkSoft">
        Paste it as you'd text a friend, or upload the confirmation email/itinerary file you already have — dates, cities,
        hotels, whatever you've got.
      </p>

      <div className="mb-4 flex gap-1.5 rounded-xl bg-surface2 p-1">
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`flex-1 rounded-lg py-2 text-[13.5px] font-bold transition ${
            mode === "paste" ? "bg-surface text-ink shadow-card" : "text-inkFaint"
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex-1 rounded-lg py-2 text-[13.5px] font-bold transition ${
            mode === "upload" ? "bg-surface text-ink shadow-card" : "text-inkFaint"
          }`}
        >
          Upload a file
        </button>
      </div>

      {mode === "paste" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={12}
          className="w-full rounded-2xl border border-border bg-surface p-4 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-inkFaint/60 focus:border-accent"
        />
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface px-4 py-10 text-center hover:border-accent hover:bg-surface2"
            >
              <Upload size={22} className="text-inkFaint" />
              <span className="text-[14px] font-semibold text-ink">Tap to choose a file</span>
              <span className="text-[12.5px] text-inkFaint">PDF, Word (.docx), or plain text — up to 15MB</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accentSoft text-accent">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{file.name}</p>
                <p className="text-[12px] text-inkFaint">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="flex-none text-inkFaint hover:text-critical"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <p className="mt-2 text-[12px] text-inkFaint">
            PDF and Word files are parsed on the server (extracting the text, then handing it to the same AI parser as the
            paste option) — a scanned/image-only PDF won't have extractable text, so paste the itinerary text instead if
            upload comes back empty.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-medium text-critical">{error}</p>}

      {mode === "paste" && (
        <>
          <button
            type="button"
            onClick={() => setShowFormNotice(true)}
            className="mt-3 text-[13px] font-semibold text-inkFaint underline decoration-border underline-offset-4 hover:text-ink"
          >
            Fill a form instead
          </button>
          {showFormNotice && (
            <p className="mt-2 text-[13px] text-inkFaint">Structured form input is coming in a later phase — paste your itinerary as text for now.</p>
          )}
        </>
      )}

      <div className="mt-6">
        <Button size="lg" className="w-full" onClick={runParse} disabled={!canParse}>
          <Sparkles size={17} /> Parse my itinerary
        </Button>
      </div>
    </div>
  );
}
