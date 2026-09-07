"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { askAboutPlaceAction } from "@/lib/actions/place";

const SUGGESTIONS = ["Is this good for kids?", "What should we know before going?", "How do we get here from the hotel?"];

export function AskAboutPlace({ tripId, placeId }: { tripId: string; placeId: string }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [thread, setThread] = useState<{ question: string; answer: string }[]>([]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setQuestion("");
    try {
      const result = await askAboutPlaceAction(tripId, placeId, trimmed);
      setThread((t) => [...t, { question: trimmed, answer: result.answer }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-inkFaint">
        <Sparkles size={13} className="text-accent" /> Ask about this place
      </p>

      {thread.length > 0 && (
        <div className="mb-3 flex flex-col gap-3">
          {thread.map((qa, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-3.5">
              <p className="mb-1.5 text-[13px] font-bold text-ink">{qa.question}</p>
              <p className="text-[13.5px] leading-relaxed text-inkSoft">{qa.answer}</p>
            </div>
          ))}
        </div>
      )}

      {thread.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={loading}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-inkSoft hover:bg-surface2"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a quick question…"
          className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-inkFaint/70 focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent text-accentInk disabled:opacity-50"
          aria-label="Ask"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        </button>
      </form>
    </div>
  );
}
