import React from "react";

interface Props {
  content: string;
  className?: string;
}

/**
 * Renders AI-generated markdown content with proper typography.
 * Handles: ## headings, - bullets, **bold**, paragraphs.
 * No external dependencies.
 */
export function ArticleContent({ content, className = "" }: Props) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className={`space-y-4 text-sm leading-7 text-slate-700 ${className}`}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // ## Heading
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="font-heading text-base font-bold text-slate-900 mt-6 mb-1 first:mt-0">
              {trimmed.slice(3)}
            </h3>
          );
        }

        // ### Subheading
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="font-semibold text-slate-800 mt-4 mb-1">
              {trimmed.slice(4)}
            </h4>
          );
        }

        // Bullet list block (lines starting with - or •)
        const lines = trimmed.split("\n");
        const isBulletBlock = lines.every((l) => l.trim().startsWith("- ") || l.trim().startsWith("• ") || !l.trim());
        if (isBulletBlock && lines.some((l) => l.trim().startsWith("- ") || l.trim().startsWith("• "))) {
          return (
            <ul key={i} className="space-y-1.5 pl-4">
              {lines
                .filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("• "))
                .map((l, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blue-400" />
                    <span>{renderInline(l.replace(/^[-•]\s+/, ""))}</span>
                  </li>
                ))}
            </ul>
          );
        }

        // Mixed block (some bullet lines, some regular)
        if (lines.length > 1) {
          return (
            <div key={i} className="space-y-1">
              {lines.map((line, j) => {
                const t = line.trim();
                if (!t) return null;
                if (t.startsWith("- ") || t.startsWith("• ")) {
                  return (
                    <div key={j} className="flex items-start gap-2">
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blue-400" />
                      <span>{renderInline(t.replace(/^[-•]\s+/, ""))}</span>
                    </div>
                  );
                }
                return <p key={j}>{renderInline(t)}</p>;
              })}
            </div>
          );
        }

        // Regular paragraph
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

/** Render inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={m.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={m.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={m.index} className="rounded bg-slate-100 px-1 text-xs font-mono">{token.slice(1, -1)}</code>);
    }
    last = m.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}
