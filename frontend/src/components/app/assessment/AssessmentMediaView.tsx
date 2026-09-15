/**
 * Renders assessment media (images, diagrams) with captions, credits,
 * keyboard-accessible enlargement and long descriptions.
 *
 * Only URLs supplied by the backend are used; generated text is never allowed
 * to hotlink an arbitrary third-party image.
 */
import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/provider";
import type { AssessmentMedia } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";

export function AssessmentMediaView({
  media,
  className,
  description,
}: {
  media: AssessmentMedia;
  className?: string | undefined;
  description?: string | undefined;
}) {
  const { t } = useI18n();
  const [showLongDescription, setShowLongDescription] = useState(false);
  const longDescription = description ?? media.longDescription;

  return (
    <figure className={cn("my-2", className)}>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group relative block w-full overflow-hidden rounded-[16px] border border-border bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("assessment.media.enlarge")}
          >
            <img
              src={media.url}
              alt={media.altText}
              width={media.width}
              height={media.height}
              loading="lazy"
              className="h-auto w-full object-contain"
            />
            <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-card/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="text-[16px]">
            {media.caption ?? t("assessment.media.enlarged")}
          </DialogTitle>
          <img
            src={media.url}
            alt={media.altText}
            className="max-h-[70vh] w-full rounded-[14px] object-contain"
          />
        </DialogContent>
      </Dialog>

      {(media.caption || media.credit || media.license) && (
        <figcaption className="mt-1.5 text-[13px] text-muted-foreground">
          {media.caption}
          {media.credit && <span className="ml-1.5">· {media.credit}</span>}
          {media.license && <span className="ml-1.5">· {media.license}</span>}
        </figcaption>
      )}

      {longDescription && (
        <div className="mt-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={showLongDescription}
            onClick={() => setShowLongDescription((open) => !open)}
          >
            {showLongDescription
              ? t("assessment.media.hideDescription")
              : t("assessment.media.showDescription")}
          </Button>
          {showLongDescription && (
            <p className="mt-1 rounded-[14px] bg-surface-2 p-3 text-[14px] leading-[1.6]">
              {longDescription}
            </p>
          )}
        </div>
      )}
    </figure>
  );
}
