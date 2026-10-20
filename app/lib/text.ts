const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

/** Plain-text preview of rich text (HTML) or legacy plain notes. */
export function htmlToPlain(value: string) {
  if (!value) return "";
  if (!value.trimStart().startsWith("<")) return value;
  return value
    .replace(/<(br|\/p|\/li|\/h\d)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Older task notes were plain text; turn them into paragraphs so line breaks survive. */
export function notesToHtml(value: string) {
  if (!value) return "";
  if (value.trimStart().startsWith("<")) return value;
  return value
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}
