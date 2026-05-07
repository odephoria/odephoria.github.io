import { Fragment } from "react";

interface Props {
  content: string;
  className?: string;
}

// Inline: bold, italic, code — safe against infinite loops
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  let safety = 0;

  while (remaining.length > 0 && safety++ < 2000) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/s);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<Fragment key={key++}>{boldMatch[1]}</Fragment>);
      parts.push(<strong key={key++} className="font-semibold text-foreground">{boldMatch[2]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text*  (only single star, not double)
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/s);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(<Fragment key={key++}>{italicMatch[1]}</Fragment>);
      parts.push(<em key={key++}>{italicMatch[2]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/s);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<Fragment key={key++}>{codeMatch[1]}</Fragment>);
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[0.85em] border border-border">
          {codeMatch[2]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // No more patterns — output the rest
    parts.push(<Fragment key={key++}>{remaining}</Fragment>);
    break;
  }

  return parts;
}

// True markdown block-level starters (require a trailing space or specific syntax)
// NOTE: lines beginning with ** are NOT list/header starters — they are bold inline text
const BLOCK_STARTER = /^#{1,6} |^[*-] |^> |^\d+\. |^```/;

function parseBlocks(content: string): React.ReactNode[] {
  if (!content) return [];
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Code fence ────────────────────────────────────────────
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <pre key={key++} className="my-3 p-3 rounded-lg bg-muted border border-border overflow-x-auto">
          <code className="font-mono text-sm text-foreground whitespace-pre">{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────
    if (/^[-=]{3,}$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-4 border-border" />);
      i++;
      continue;
    }

    // ── Headers ───────────────────────────────────────────────
    const h3 = line.match(/^### (.+)/);
    if (h3) {
      blocks.push(<h3 key={key++} className="text-base font-semibold mt-4 mb-1.5 text-foreground">{parseInline(h3[1])}</h3>);
      i++; continue;
    }
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      blocks.push(<h2 key={key++} className="text-lg font-semibold mt-5 mb-2 text-foreground border-b border-border pb-1">{parseInline(h2[1])}</h2>);
      i++; continue;
    }
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      blocks.push(<h1 key={key++} className="text-xl font-bold mt-5 mb-2 text-foreground">{parseInline(h1[1])}</h1>);
      i++; continue;
    }

    // ── Unordered list  (- item  OR  * item  — must have space) ──
    if (/^[*-] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[*-] /.test(lines[i])) {
        const text = lines[i].replace(/^[*-] /, "");
        items.push(<li key={i} className="ml-1">{parseInline(text)}</li>);
        i++;
      }
      blocks.push(<ul key={key++} className="list-disc list-inside space-y-1 my-2 text-foreground">{items}</ul>);
      continue;
    }

    // ── Ordered list ─────────────────────────────────────────
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      let n = 1;
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const text = lines[i].replace(/^\d+\. /, "");
        items.push(<li key={i} value={n++} className="ml-1">{parseInline(text)}</li>);
        i++;
      }
      blocks.push(<ol key={key++} className="list-decimal list-inside space-y-1 my-2 text-foreground">{items}</ol>);
      continue;
    }

    // ── Blockquote ────────────────────────────────────────────
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="border-l-4 border-primary/40 pl-3 my-3 text-muted-foreground italic">
          {quoteLines.map((l, idx) => <Fragment key={idx}>{parseInline(l)}</Fragment>)}
        </blockquote>
      );
      continue;
    }

    // ── Empty line ────────────────────────────────────────────
    if (line.trim() === "") {
      i++;
      continue;
    }

    // ── Paragraph ─────────────────────────────────────────────
    // Collect consecutive lines that are NOT block-level starters
    // IMPORTANT: lines starting with ** (bold) are regular paragraph text
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !BLOCK_STARTER.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    if (paragraphLines.length > 0) {
      blocks.push(
        <p key={key++} className="leading-relaxed my-1.5 text-foreground">
          {parseInline(paragraphLines.join(" "))}
        </p>
      );
      continue;
    }

    // ── Safety fallback ──────────────────────────────────────
    // This line did not match any handler and is not a paragraph start.
    // Render it as-is and advance to prevent any infinite loop.
    if (line.trim()) {
      blocks.push(
        <p key={key++} className="leading-relaxed my-1.5 text-foreground">
          {parseInline(line)}
        </p>
      );
    }
    i++;
  }

  return blocks;
}

export function MarkdownRenderer({ content, className = "" }: Props) {
  try {
    const blocks = parseBlocks(content ?? "");
    return (
      <div className={`text-sm leading-relaxed ${className}`}>
        {blocks.map((block, i) => <Fragment key={i}>{block}</Fragment>)}
      </div>
    );
  } catch {
    // Last-resort fallback — never let the renderer crash the page
    return <div className={`text-sm leading-relaxed whitespace-pre-wrap ${className}`}>{content}</div>;
  }
}
