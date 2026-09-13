/** Alim application component for study, planning, profile, or navigation workflows. */
import type { ContextSourceSnippet } from "@/lib/context-backend.types";

export function SourceSnippetList({ sources }: { sources: ContextSourceSnippet[] }) {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  return (
    <details className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-[13px]">
      <summary className="cursor-pointer font-semibold text-foreground">
        Sources ({sources.length})
      </summary>
      <div className="mt-3 space-y-3">
        {sources.map((source) => {
          const location = [
            source.section,
            source.chapter ? `Chapter ${source.chapter}` : null,
            source.page !== null ? `Page ${source.page}` : null,
          ]
            .filter(Boolean)
            .join(" · ");
          const content = (
            <>
              <p className="font-medium text-foreground">
                {source.material_name ?? "Course material"}
              </p>
              {location && <p className="mt-0.5 text-muted-foreground">{location}</p>}
              <p className="mt-1.5 line-clamp-3 text-muted-foreground">{source.snippet}</p>
            </>
          );
          return source.url ? (
            <a
              key={source.source_id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg p-2 transition-colors hover:bg-hover"
            >
              {content}
            </a>
          ) : (
            <div key={source.source_id} className="rounded-lg p-2">
              {content}
            </div>
          );
        })}
      </div>
    </details>
  );
}
