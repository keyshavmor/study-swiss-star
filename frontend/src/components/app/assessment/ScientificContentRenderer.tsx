/**
 * The single rendering path for every piece of assessment content: prompts,
 * answer options, student answers, model answers, explanations and results.
 *
 * Only the approved structured schema is rendered. AI output is never treated
 * as HTML and `dangerouslySetInnerHTML` is used exclusively for KaTeX output
 * that this module generated itself from a LaTeX string.
 */
import katex from "katex";
import "katex/contrib/mhchem";
import "katex/dist/katex.min.css";
import { useMemo } from "react";
import Markdown from "react-markdown";
import type { ContentBlock, RichContent } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";

function renderLatex(latex: string, display: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      strict: "ignore",
      output: "html",
      trust: false,
    });
  } catch {
    return "";
  }
}

export function ScientificExpression({
  latex,
  display = false,
  className,
}: {
  latex: string;
  display?: boolean | undefined;
  className?: string | undefined;
}) {
  const html = useMemo(() => renderLatex(latex, display), [latex, display]);
  if (!html) {
    // Fall back to the literal source rather than rendering nothing.
    return <code className={cn("font-mono text-[13.5px]", className)}>{latex}</code>;
  }
  return (
    <span
      className={cn(display ? "block overflow-x-auto py-1 text-center" : "inline", className)}
      // KaTeX output generated locally in this module from a LaTeX string.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function styleClass(
  block: Extract<ContentBlock, { style?: unknown | undefined }>,
): string | undefined {
  const style = "style" in block ? block.style : undefined;
  if (!style) return undefined;
  return cn(style.italic && "italic", style.monospace && "font-mono");
}

function langOf(block: ContentBlock): string | undefined {
  return "style" in block && block.style?.lang ? block.style.lang : undefined;
}

function Block({
  block,
  renderMedia,
}: {
  block: ContentBlock;
  renderMedia?: MediaRenderer | undefined;
}) {
  switch (block.kind) {
    case "prose":
      return (
        <div
          lang={langOf(block)}
          className={cn(
            "assessment-prose text-[15px] leading-[1.65] [&_p]:mb-2 [&_p:last-child]:mb-0",
            styleClass(block),
          )}
        >
          <Markdown skipHtml>{block.text}</Markdown>
        </div>
      );
    case "math":
      return <ScientificExpression latex={block.latex} display={block.display ?? false} />;
    case "chemistry":
      return (
        <ScientificExpression
          latex={
            block.latex.startsWith("\\ce") || block.latex.startsWith("\\pu")
              ? block.latex
              : `\\ce{${block.latex}}`
          }
          display={block.display ?? false}
        />
      );
    case "table":
      return (
        <figure className="my-2 overflow-x-auto">
          {block.caption && (
            <figcaption className="mb-1.5 text-[13px] text-muted-foreground">
              {block.caption}
            </figcaption>
          )}
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="border border-border bg-surface-2 px-3 py-2 text-left font-semibold"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-border px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      );
    case "image":
      return <>{renderMedia?.(block.mediaId)}</>;
    case "diagram":
      return <>{renderMedia?.(block.mediaId, block.description)}</>;
    case "code":
      return (
        <pre className="my-2 overflow-x-auto rounded-[14px] bg-surface-2 p-3 text-[13.5px]">
          <code>{block.source}</code>
        </pre>
      );
    case "quotation":
      return (
        <blockquote
          lang={langOf(block)}
          className={cn(
            "my-2 border-l-2 border-border pl-3.5 text-[15px] leading-[1.7]",
            styleClass(block),
          )}
        >
          <p className="whitespace-pre-wrap">{block.text}</p>
          {block.attribution && (
            <footer className="mt-1 text-[13px] text-muted-foreground">{block.attribution}</footer>
          )}
        </blockquote>
      );
    case "poetry":
      return (
        <div lang={langOf(block)} className={cn("my-2 space-y-3", styleClass(block))}>
          {block.stanzas.map((lines, stanzaIndex) => (
            <p key={stanzaIndex} className="whitespace-pre-wrap text-[15px] leading-[1.8]">
              {lines.join("\n")}
            </p>
          ))}
        </div>
      );
  }
}

export type MediaRenderer = (mediaId: string, description?: string | undefined) => React.ReactNode;

export function ScientificContentRenderer({
  content,
  className,
  inline = false,
  renderMedia,
}: {
  content: RichContent;
  className?: string | undefined;
  inline?: boolean | undefined;
  renderMedia?: MediaRenderer | undefined;
}) {
  return (
    <div className={cn(inline ? "flex flex-wrap items-baseline gap-1" : "space-y-1.5", className)}>
      {content.map((block, index) => (
        <Block key={index} block={block} renderMedia={renderMedia} />
      ))}
    </div>
  );
}
