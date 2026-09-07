"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ItineraryItem, ItineraryItemType, Place } from "@/lib/types";
import {
  addItineraryItemAction,
  deleteItineraryItemAction,
  moveItineraryItemAction,
  updateItineraryItemAction
} from "@/lib/actions/itinerary";

type Item = ItineraryItem & { place?: Place };

const TYPE_LABELS: Record<ItineraryItemType, string> = {
  activity: "Activity",
  meal: "Meal",
  transport: "Transport",
  note: "Note",
  free_time: "Free time"
};

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent";

function ItemForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel
}: {
  initial?: Partial<Item>;
  submitLabel: string;
  onSubmit: (fields: { title: string; type: ItineraryItemType; startTime: string; notes: string; placeName: string }) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<ItineraryItemType>(initial?.type ?? "activity");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [placeName, setPlaceName] = useState(initial?.place?.canonicalName ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({ title: title.trim(), type, startTime: startTime.trim(), notes: notes.trim(), placeName: placeName.trim() });
      }}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-accent/40 bg-accentSoft/20 p-3"
    >
      <div className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={inputCls} autoFocus />
        <input
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          placeholder="HH:mm"
          className={`${inputCls} w-20 flex-none font-mono`}
        />
      </div>
      <div className="flex gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as ItineraryItemType)} className={`${inputCls} flex-none w-32`}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="Place (optional)" className={inputCls} />
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={inputCls} />
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-inkFaint">
            Cancel
          </button>
        )}
        <button type="submit" className="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-bold text-accentInk">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function EditableItemList({ tripId, dayId, items }: { tripId: string; dayId: string; items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="rounded-lg bg-criticalSoft px-3 py-2 text-[12.5px] font-medium text-critical">{error}</p>
      )}

      {items.length === 0 && !adding && (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-[13px] text-inkFaint">Nothing planned yet.</p>
      )}

      {items.map((item, i) =>
        editingId === item.id ? (
          <ItemForm
            key={item.id}
            initial={item}
            submitLabel="Save"
            onCancel={() => setEditingId(null)}
            onSubmit={(fields) => {
              setEditingId(null);
              run(() =>
                updateItineraryItemAction(tripId, item.id, {
                  title: fields.title,
                  type: fields.type,
                  startTime: fields.startTime || null,
                  notes: fields.notes,
                  placeName: fields.placeName || null
                })
              );
            }}
          />
        ) : (
          <div key={item.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
            <span className="w-11 flex-none font-mono text-[12px] text-inkFaint">{item.startTime ?? "—"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-ink">{item.title}</p>
              <p className="text-[11px] text-inkFaint">{TYPE_LABELS[item.type]}</p>
            </div>
            <div className="flex flex-none items-center gap-0.5">
              <button
                type="button"
                disabled={pending || i === 0}
                onClick={() => run(() => moveItineraryItemAction(tripId, item.id, "up"))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-inkFaint hover:bg-surface2 disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp size={15} />
              </button>
              <button
                type="button"
                disabled={pending || i === items.length - 1}
                onClick={() => run(() => moveItineraryItemAction(tripId, item.id, "down"))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-inkFaint hover:bg-surface2 disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown size={15} />
              </button>
              <button
                type="button"
                onClick={() => setEditingId(item.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-inkFaint hover:bg-surface2"
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
              {confirmDeleteId === item.id ? (
                <div className="flex items-center gap-1 rounded-md bg-criticalSoft px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      run(() => deleteItineraryItemAction(tripId, item.id));
                    }}
                    className="px-1.5 py-1 text-[11px] font-bold text-critical"
                  >
                    Delete?
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex h-6 w-6 items-center justify-center text-critical"
                    aria-label="Cancel delete"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-inkFaint hover:bg-criticalSoft hover:text-critical"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        )
      )}

      {adding ? (
        <ItemForm
          submitLabel="Add"
          onCancel={() => setAdding(false)}
          onSubmit={(fields) => {
            setAdding(false);
            run(() =>
              addItineraryItemAction(tripId, dayId, {
                title: fields.title,
                type: fields.type,
                startTime: fields.startTime || undefined,
                notes: fields.notes || undefined,
                placeName: fields.placeName || undefined
              })
            );
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-[13px] font-semibold text-inkSoft hover:bg-surface2"
        >
          <Plus size={15} /> Add item
        </button>
      )}

      {pending && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-inkFaint">
          <Loader2 size={12} className="animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
}
