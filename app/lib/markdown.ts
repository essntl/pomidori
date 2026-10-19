import type { JSONContent } from "@tiptap/react";

/**
 * Minimal Markdown <-> editor conversion. Used to migrate the old Markdown notes,
 * import .md files and export pages back to Markdown. Covers the syntax the old
 * editor's toolbar produced (headings, lists, tasks, quotes, code, rules, links, emphasis).
 */

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(src: string) {
  const codes: string[] = [];
  let s = src.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = escapeHtml(s);
  s = s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\s][^_]*)_/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[Number(i)])}</code>`);
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(3, heading[1].length);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${markdownToHtml(buf.join("\n"))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+\[[ xX]\]\s?/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+\[[ xX]\]\s?/.test(lines[i])) {
        const m = lines[i].match(/^\s*[-*+]\s+\[([ xX])\]\s?(.*)$/)!;
        const checked = m[1].toLowerCase() === "x";
        items.push(`<li data-type="taskItem" data-checked="${checked}"><p>${inline(m[2])}</p></li>`);
        i++;
      }
      out.push(`<ul data-type="taskList">${items.join("")}</ul>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i]) && !/^\s*[-*+]\s+\[[ xX]\]/.test(lines[i])) {
        items.push(`<li><p>${inline(lines[i].replace(/^\s*[-*+]\s+/, ""))}</p></li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(`<li><p>${inline(lines[i].replace(/^\s*\d+[.)]\s+/, ""))}</p></li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6}\s|```|>|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[i])
    ) {
      para.push(inline(lines[i++]));
    }
    out.push(`<p>${para.join("<br>")}</p>`);
  }

  return out.join("");
}

export function stripMarkdown(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~=\[\]()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function marks(text: string, nodeMarks: JSONContent["marks"]) {
  let t = text;
  for (const m of nodeMarks ?? []) {
    if (m.type === "bold") t = `**${t}**`;
    else if (m.type === "italic") t = `*${t}*`;
    else if (m.type === "strike") t = `~~${t}~~`;
    else if (m.type === "code") t = `\`${t}\``;
    else if (m.type === "highlight") t = `==${t}==`;
    else if (m.type === "link") t = `[${t}](${m.attrs?.href ?? ""})`;
  }
  return t;
}

function inlineMd(node: JSONContent): string {
  return (node.content ?? [])
    .map((c) => (c.type === "text" ? marks(c.text ?? "", c.marks) : c.type === "hardBreak" ? "  \n" : inlineMd(c)))
    .join("");
}

function blockMd(node: JSONContent, indent = ""): string {
  const children = node.content ?? [];
  switch (node.type) {
    case "doc":
      return children.map((c) => blockMd(c)).join("\n\n");
    case "paragraph":
      return indent + inlineMd(node);
    case "heading":
      return `${"#".repeat(node.attrs?.level ?? 1)} ${inlineMd(node)}`;
    case "blockquote":
      return children.map((c) => blockMd(c).replace(/^/gm, "> ")).join("\n>\n");
    case "callout":
      return children.map((c) => blockMd(c).replace(/^/gm, "> ")).join("\n>\n").replace(/^> /, "> 💡 ");
    case "codeBlock":
      return "```\n" + children.map((c) => c.text ?? "").join("") + "\n```";
    case "horizontalRule":
      return "---";
    case "bulletList":
    case "orderedList":
    case "taskList":
      return children
        .map((li, idx) => {
          const prefix =
            node.type === "orderedList"
              ? `${idx + 1}. `
              : node.type === "taskList"
                ? `- [${li.attrs?.checked ? "x" : " "}] `
                : "- ";
          const [first, ...rest] = li.content ?? [];
          const head = indent + prefix + (first ? inlineMd(first) : "");
          const tail = rest.map((r) => blockMd(r, indent + "  ")).join("\n");
          return tail ? `${head}\n${tail}` : head;
        })
        .join("\n");
    case "table":
      return children
        .map((row, r) => {
          const cells = (row.content ?? []).map((cell) =>
            (cell.content ?? []).map((p) => inlineMd(p)).join(" ").replace(/\|/g, "\\|"),
          );
          const line = `| ${cells.join(" | ")} |`;
          return r === 0 ? `${line}\n| ${cells.map(() => "---").join(" | ")} |` : line;
        })
        .join("\n");
    default:
      return children.map((c) => blockMd(c, indent)).join("\n");
  }
}

export function docToMarkdown(doc: JSONContent, title?: string) {
  const body = blockMd(doc);
  return title ? `# ${title}\n\n${body}\n` : `${body}\n`;
}
