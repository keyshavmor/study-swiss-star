import { Link } from "@tanstack/react-router";
import {
  Archive,
  FileAudio,
  FileImage,
  FileText,
  Filter,
  Globe,
  Link2,
  MoreHorizontal,
  Search,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MaterialFile } from "@/lib/mock/materials";
import { LEARNING_GOALS, MATERIALS } from "@/lib/mock/materials";
import { cn } from "@/lib/utils";

const SECTIONS = [
  "Learning Material",
  "Syllabus",
  "Learning Goals",
  "Grading Criteria",
  "Online Sources",
  "Archived Material",
] as const;

function fileIcon(type: MaterialFile["type"]) {
  if (type === "PNG" || type === "JPEG" || type === "SVG") return FileImage;
  if (type === "Audio") return FileAudio;
  if (type === "Web link") return Globe;
  return FileText;
}

function statusTone(status: MaterialFile["status"]) {
  switch (status) {
    case "Indexed":
      return "bg-chart-3/12 text-chart-3";
    case "Processing":
      return "bg-primary/12 text-primary";
    case "Needs review":
      return "bg-chart-4/15 text-chart-4";
    default:
      return "bg-destructive/12 text-destructive";
  }
}

export function MaterialFileCard({ file }: { file: MaterialFile }) {
  const Icon = fileIcon(file.type);
  return (
    <div className="rounded-[16px] border border-border bg-surface p-3 transition-colors duration-200 hover:border-border-strong">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium">{file.name}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {file.type}
            {file.pages ? ` · ${file.pages} pages` : ""} · {file.uploaded}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11.5px] font-medium",
                statusTone(file.status),
              )}
            >
              {file.status}
            </span>
            {file.warning && (
              <span className="rounded-full bg-chart-4/12 px-2 py-0.5 text-[11.5px] text-chart-4">
                {file.warning}
              </span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${file.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Preview</DropdownMenuItem>
            <DropdownMenuItem>Re-index</DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
            <DropdownMenuItem>Remove</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function MaterialsPanel({ className }: { className?: string }) {
  return (
    <aside className={cn("app-card flex flex-col gap-4 p-5", className)}>
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight">Notes and Materials</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {MATERIALS.length} items · prototype content
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm">
          <Upload className="h-4 w-4" />
          Upload Material
        </Button>
        <Button size="sm" variant="secondary">
          <Link2 className="h-4 w-4" />
          Add Web Link
        </Button>
        <Button size="sm" variant="ghost">
          <Search className="h-4 w-4" />
          Search
        </Button>
        <Button size="sm" variant="ghost">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        {SECTIONS.map((section) => {
          const files = MATERIALS.filter((m) => m.section === section);
          return (
            <section key={section}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                  {section}
                </h3>
                <Badge variant="secondary" className="text-[11px]">
                  {section === "Learning Goals" ? LEARNING_GOALS.length : files.length}
                </Badge>
              </div>

              {section === "Learning Goals" ? (
                <ul className="space-y-1.5">
                  {LEARNING_GOALS.map((goal) => (
                    <li
                      key={goal}
                      className="rounded-[14px] bg-surface-2 px-3 py-2 text-[13.5px] text-muted-foreground"
                    >
                      {goal}
                    </li>
                  ))}
                </ul>
              ) : files.length === 0 ? (
                <p className="rounded-[14px] bg-surface-2 px-3 py-3 text-[13.5px] text-muted-foreground">
                  Nothing here yet — upload material to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <MaterialFileCard key={file.id} file={file} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Link
        to="/help"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-primary hover:underline"
      >
        <Archive className="h-4 w-4" />
        How material indexing works
      </Link>
    </aside>
  );
}
