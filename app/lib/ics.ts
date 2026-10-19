import type { CalEvent, Recurrence } from "./stores/events";
import { EVENT_COLORS } from "./stores/events";
import { uid } from "./id";

/** Hand-written iCalendar (RFC 5545) serializer/parser covering what the calendar stores. */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function utcStamp(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function dateStamp(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function unescapeText(s: string) {
  return s.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

const RRULE: Record<Exclude<Recurrence, "none">, string> = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY" };

export function eventsToIcs(events: CalEvent[]) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pomidori//Calendar//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@pomidori`, `DTSTAMP:${utcStamp(Date.now())}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateStamp(e.start)}`, `DTEND;VALUE=DATE:${dateStamp(e.end + 86_400_000)}`);
    } else {
      lines.push(`DTSTART:${utcStamp(e.start)}`, `DTEND:${utcStamp(e.end)}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.notes) lines.push(`DESCRIPTION:${escapeText(e.notes)}`);
    if (e.recurrence !== "none") lines.push(`RRULE:FREQ=${RRULE[e.recurrence]}`);
    lines.push(`X-POMIDORI-COLOR:${e.color}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n");
}

function parseIcsDate(value: string, params: string): { ms: number; allDay: boolean } {
  if (/VALUE=DATE(?!-)/.test(params) || /^\d{8}$/.test(value)) {
    return { ms: new Date(+value.slice(0, 4), +value.slice(4, 6) - 1, +value.slice(6, 8)).getTime(), allDay: true };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return { ms: Date.parse(value), allDay: false };
  const [, y, mo, d, h, mi, s, z] = m;
  const ms = z
    ? Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
    : new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime();
  return { ms, allDay: false };
}

export function icsToEvents(text: string): CalEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const events: CalEvent[] = [];
  let cur: Record<string, { value: string; params: string }> | null = null;
  for (const line of unfolded.split(/\r?\n/)) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT" && cur) {
      if (cur.DTSTART) {
        const start = parseIcsDate(cur.DTSTART.value, cur.DTSTART.params);
        const end = cur.DTEND ? parseIcsDate(cur.DTEND.value, cur.DTEND.params) : null;
        const freq = cur.RRULE?.value.match(/FREQ=(DAILY|WEEKLY|MONTHLY)/)?.[1];
        const endMs = end ? (start.allDay ? end.ms - 86_400_000 : end.ms) : start.allDay ? start.ms : start.ms + 3_600_000;
        events.push({
          id: uid(),
          title: unescapeText(cur.SUMMARY?.value ?? "Untitled"),
          notes: unescapeText(cur.DESCRIPTION?.value ?? ""),
          start: start.ms,
          end: Math.max(endMs, start.ms),
          allDay: start.allDay,
          color: cur["X-POMIDORI-COLOR"]?.value ?? EVENT_COLORS[3],
          recurrence: freq ? (freq.toLowerCase() as Recurrence) : "none",
        });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const [name, ...params] = line.slice(0, idx).split(";");
      cur[name.toUpperCase()] = { value: line.slice(idx + 1), params: params.join(";") };
    }
  }
  return events;
}
