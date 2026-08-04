import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { initialsFor, SchoolLinkDialog } from "@/components/app/SchoolLinkDialog";
import { EmptyState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSubject } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import type { SchoolLink } from "@/lib/store/types";
import { LINK_CATEGORIES } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * "Important School Links" — a student-managed set of shortcut tiles.
 * Empty until the student adds something.
 */
export function SchoolLinksSection({ className }: { className?: string }) {
  const { links, removeLink, restoreLink, duplicateLink, reorderLinks, registerLinkOpen } =
    useAppData();
  const [editing, setEditing] = useState<SchoolLink | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const sorted = useMemo(() => [...links].sort((a, b) => a.order - b.order), [links]);
  const categories = useMemo(
    () => ["All", ...LINK_CATEGORIES.filter((c) => links.some((l) => l.category === c))],
    [links],
  );
  const visible = filter === "All" ? sorted : sorted.filter((l) => l.category === filter);

  function move(id: string, delta: number) {
    const ids = sorted.map((l) => l.id);
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]!);
    reorderLinks(ids);
  }

  return (
    <section className={cn("", className)} aria-labelledby="school-links-heading">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h2 id="school-links-heading" className="text-[19px] font-semibold tracking-tight">
            Important School Links
          </h2>
          <p className="text-[14px] text-muted-foreground">
            Your own shortcuts to school websites and platforms.
          </p>
        </div>
        <SchoolLinkDialog
          trigger={
            <Button variant="secondary" size="sm">
              <Plus className="h-4 w-4" />
              Add Link
            </Button>
          }
        />
      </div>

      {links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-5 w-5" />}
          heading="No school links yet"
          description="Add the websites you use most — timetable, learning platform, school email or library."
          action={
            <SchoolLinkDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Add your first link
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          {categories.length > 2 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors duration-200",
                    filter === c
                      ? "border-border-strong bg-surface text-foreground"
                      : "border-border text-muted-foreground hover:bg-hover",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((link) => {
              const subject = link.subjectSlug ? getSubject(link.subjectSlug) : undefined;
              return (
                <li
                  key={link.id}
                  className="app-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-4 transition-colors duration-200 hover:border-border-strong"
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-[15px] font-semibold text-white"
                    style={{ backgroundColor: link.accent }}
                    aria-hidden
                  >
                    {link.icon || initialsFor(link.name)}
                  </span>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={() => registerLinkOpen(link.id)}
                    className="min-w-0"
                  >
                    <span className="flex items-center gap-1.5 text-[15.5px] font-semibold tracking-tight">
                      <span className="truncate">{link.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                      {link.description || link.url.replace(/^https?:\/\//, "")}
                    </span>
                    <span className="mt-1 block text-[12.5px] text-muted-foreground">
                      {link.category}
                      {subject ? ` · ${subject.name}` : ""}
                      {link.opens > 0 ? ` · opened ${link.opens}×` : ""}
                    </span>
                  </a>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${link.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setTimeout(() => setEditing(link), 0)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => duplicateLink(link.id)}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => move(link.id, -1)}>
                        <ArrowUp className="h-4 w-4" />
                        Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => move(link.id, 1)}>
                        <ArrowDown className="h-4 w-4" />
                        Move down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => {
                          const snapshot = { ...link };
                          removeLink(link.id);
                          toast.success("Link deleted", {
                            action: { label: "Undo", onClick: () => restoreLink(snapshot) },
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {editing && (
        <SchoolLinkDialog
          key={editing.id}
          record={editing}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      )}
    </section>
  );
}
