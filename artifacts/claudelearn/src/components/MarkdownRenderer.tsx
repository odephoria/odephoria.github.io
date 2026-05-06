import { Fragment } from "react";

interface Props {
  content: string;
  className?: string;
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/s);
    if (boldMatch && boldMatch.index === 0) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<strong key={key++} className="font-semibold text-foreground">{boldMatch[2]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*/s);
    if (italicMatch && italicMatch.index === 0) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
      parts.push(<em key={key++}>{italicMatch[2]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/s);
    if (codeMatch && codeMatch.index === 0) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[0.85em] border border-border">
          {codeMatch[2]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // No more patterns — output the rest
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return parts;
}

function parseBlocks(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence ```
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <pre key={key++} className="my-3 p-3 rounded-lg bg-muted border border-border overflow-x-auto">
          <code className="font-mono text-sm text-foreground">{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // HR ---
    if (line.trim().match(/^---+$/) || line.trim().match(/^===+$/)) {
      blocks.push(<hr key={key++} className="my-4 border-border" />);
      i++;
      continue;
    }

    // Headers
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h3) {
      blocks.push(<h3 key={key++} className="text-base font-semibold mt-4 mb-2 text-foreground">{parseInline(h3[1])}</h3>);
      i++; continue;
    }
    if (h2) {
      blocks.push(<h2 key={key++} className="text-lg font-semibold mt-5 mb-2 text-foreground border-b border-border pb-1">{parseInline(h2[1])}</h2>);
      i++; continue;
    }
    if (h1) {
      blocks.push(<h1 key={key++} className="text-xl font-bold mt-5 mb-3 text-foreground">{parseInline(h1[1])}</h1>);
      i++; continue;
    }

    // Unordered list
    if (line.match(/^[\-\*] /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[\-\*] /)) {
        const text = lines[i].replace(/^[\-\*] /, "");
        items.push(<li key={i} className="ml-1">{parseInline(text)}</li>);
        i++;
      }
      blocks.push(<ul key={key++} className="list-disc list-inside space-y-1 my-2 text-foreground">{items}</ul>);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = [];
      let n = 1;
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const text = lines[i].replace(/^\d+\. /, "");
        items.push(<li key={i} value={n++} className="ml-1">{parseInline(text)}</li>);
        i++;
      }
      blocks.push(<ol key={key++} className="list-decimal list-inside space-y-1 my-2 text-foreground">{items}</ol>);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="border-l-4 border-primary/40 pl-3 my-3 text-muted-foreground italic">
          {quoteLines.join(" ")}
        </blockquote>
      );
      continue;
    }

    // Empty line — skip (paragraph breaks are handled implicitly)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^[#\-\*>]|^\d+\. |^```/)
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
    }
  }

  return blocks;
}

export function MarkdownRenderer({ content, className = "" }: Props) {
  const blocks = parseBlocks(content);
  return (
    <div className={`text-sm leading-relaxed ${className}`}>
      {blocks.map((block, i) => <Fragment key={i}>{block}</Fragment>)}
    </div>
  );
}
