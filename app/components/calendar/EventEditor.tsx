"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { EVENT_COLORS, deleteEvent, saveEvent, type CalEvent, type Recurrence } from "@/app/lib/stores/events";
import { dayKey, fromDayKey, toTimeInput } from "@/app/lib/date";
import { cn } from "@/app/lib/cn";
import { Modal } from "../ui/Modal";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";

export type EventDraft = Omit<CalEvent, "id"> & { id?: string };

function combine(day: string, time: string) {
  const d = fromDayKey(day);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}

type Form = {
  id?: string;
  title: string;
  allDay: boolean;
  startDay: string;
  startTime: string;
  endDay: string;
  endTime: string;
  color: string;
  notes: string;
  recurrence: Recurrence;
};

function toForm(e: EventDraft): Form {
  return {
    id: e.id,
    title: e.title,
    allDay: e.allDay,
    startDay: dayKey(e.start),
    startTime: toTimeInput(new Date(e.start)),
    endDay: dayKey(e.end),
    endTime: toTimeInput(new Date(e.end)),
    color: e.color,
    notes: e.notes,
    recurrence: e.recurrence,
  };
}

/** Edit form; remounted (via key) for each event so the draft never goes stale. */
function EditorBody({ initial, onDone }: { initial: EventDraft; onDone: () => void }) {
  const [f, setF] = useState<Form>(() => toForm(initial));
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));

  const start = f.allDay ? fromDayKey(f.startDay).getTime() : combine(f.startDay, f.startTime);
  const end = f.allDay ? fromDayKey(f.endDay).getTime() : combine(f.endDay, f.endTime);
  const invalid = end < start;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (invalid) return;
    saveEvent({
      id: f.id,
      title: f.title.trim() || "Untitled event",
      allDay: f.allDay,
      start,
      end,
      color: f.color,
      notes: f.notes,
      recurrence: f.recurrence,
    });
    onDone();
  }

  return (
    <form id="event-form" onSubmit={submit} className="flex flex-col gap-4">
      <Input data-autofocus value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Event title" className="text-[17px] font-bold" />
      <div className="flex items-center justify-between rounded-control bg-surface-2 px-3.5 py-2">
        <span className="text-sm font-semibold text-fg">All day</span>
        <Switch label="All day" checked={f.allDay} onChange={(v) => set({ allDay: v })} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Field label="Starts">
          <Input type="date" value={f.startDay} onChange={(e) => e.target.value && set({ startDay: e.target.value, endDay: e.target.value > f.endDay ? e.target.value : f.endDay })} />
        </Field>
        {!f.allDay && (
          <Field label="&nbsp;">
            <Input type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} className="w-32" />
          </Field>
        )}
        <Field label="Ends" error={invalid ? "Ends before it starts" : undefined}>
          <Input type="date" value={f.endDay} onChange={(e) => e.target.value && set({ endDay: e.target.value })} />
        </Field>
        {!f.allDay && (
          <Field label="&nbsp;">
            <Input type="time" value={f.endTime} onChange={(e) => set({ endTime: e.target.value })} className="w-32" />
          </Field>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Repeat">
          <Select value={f.recurrence} onChange={(e) => set({ recurrence: e.target.value as Recurrence })}>
            <option value="none">Does not repeat</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </Select>
        </Field>
        <Field label="Colour">
          <div className="flex h-11 items-center gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                onClick={() => set({ color: c })}
                className={cn("size-7 rounded-full transition-transform", f.color === c && "scale-110 ring-2 ring-offset-2 ring-offset-[var(--surface-solid)]")}
                style={{ background: c, ["--tw-ring-color" as string]: c }}
              />
            ))}
          </div>
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Location, agenda, links…" className="min-h-20" />
      </Field>
      <button type="submit" hidden />
    </form>
  );
}

export function EventEditor({ draft, onClose }: { draft: EventDraft | null; onClose: () => void }) {
  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      title={draft?.id ? "Edit event" : "New event"}
      footer={
        <>
          {draft?.id && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                deleteEvent(draft.id!);
                onClose();
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="event-form">
            Save
          </Button>
        </>
      }
    >
      {draft && <EditorBody key={`${draft.id ?? "new"}-${draft.start}`} initial={draft} onDone={onClose} />}
    </Modal>
  );
}
