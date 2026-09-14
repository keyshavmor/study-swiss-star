/** Alim application component for study, planning, profile, or navigation workflows. */
import { useRef, useState } from "react";
import { addDays, minutesOf, timeOf, todayIso, WEEKDAY_SHORT } from "@/lib/date-utils";
import type { Occurrence } from "@/lib/store/app-data";
import { CATEGORY_COLOR } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 56;
const SNAP_MINUTES = 15;

export interface MoveRequest {
  occurrence: Occurrence;
  date: string;
  start: string;
  end: string;
}

interface DragState {
  key: string;
  pointerId: number;
  originX: number;
  originY: number;
  dx: number;
  dy: number;
  moved: boolean;
}

/**
 * 24-hour weekly timetable. Columns are weekdays, rows are hours, and every
 * block can be dragged to another day or time.
 */
export function Timetable({
  weekStart,
  days = 7,
  occurrences,
  fromHour,
  toHour,
  onSelect,
  onMove,
  highlightEventId,
}: {
  weekStart: string;
  days?: number;
  occurrences: Occurrence[];
  fromHour: number;
  toHour: number;
  onSelect: (occurrence: Occurrence) => void;
  onMove: (request: MoveRequest) => void;
  highlightEventId?: string | undefined;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const today = todayIso();

  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const dayList = Array.from({ length: days }, (_, i) => addDays(weekStart, i));
  const totalHeight = hours.length * HOUR_HEIGHT;

  function columnWidth() {
    const el = gridRef.current;
    if (!el) return 1;
    return el.getBoundingClientRect().width / days;
  }

  function commit(occurrence: Occurrence, state: DragState) {
    // Read-only occurrences (e.g. Google Calendar) can never be moved.
    if (occurrence.event.readOnly) return;
    const dayDelta = Math.round(state.dx / columnWidth());
    const minuteDelta = Math.round(((state.dy / HOUR_HEIGHT) * 60) / SNAP_MINUTES) * SNAP_MINUTES;
    if (dayDelta === 0 && minuteDelta === 0) return;


    const duration = minutesOf(occurrence.end) - minutesOf(occurrence.start);
    const startMinutes = Math.max(
      0,
      Math.min(24 * 60 - duration, minutesOf(occurrence.start) + minuteDelta),
    );
    onMove({
      occurrence,
      date: addDays(occurrence.date, dayDelta),
      start: timeOf(startMinutes),
      end: timeOf(startMinutes + duration),
    });
  }

  return (
    <div className="app-card overflow-hidden p-0">
      <div className="grid grid-cols-[56px_minmax(0,1fr)]">
        <div className="border-b border-r border-border bg-surface-2" />
        <div
          className="grid border-b border-border bg-surface-2"
          style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
        >
          {dayList.map((iso) => (
            <div
              key={iso}
              className={cn(
                "border-l border-border px-2 py-2 text-center first:border-l-0",
                iso === today && "bg-primary/8",
              )}
            >
              <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                {WEEKDAY_SHORT[(new Date(`${iso}T12:00:00`).getDay() + 6) % 7]}
              </p>
              <p
                className={cn("tabular text-[15px] font-semibold", iso === today && "text-primary")}
              >
                {Number(iso.slice(8))}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-h-[68vh] overflow-y-auto">
        <div className="grid grid-cols-[56px_minmax(0,1fr)]">
          <div className="border-r border-border">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="tabular relative -top-2 pr-2 text-right text-[11.5px] text-muted-foreground"
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div
            ref={gridRef}
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))`,
              height: totalHeight,
            }}
          >
            {dayList.map((iso, dayIndex) => (
              <div
                key={iso}
                className={cn(
                  "relative border-l border-border first:border-l-0",
                  iso === today && "bg-primary/5",
                )}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b border-border/60"
                  />
                ))}

                {occurrences
                  .filter((o) => o.date === iso)
                  .map((o) => {
                    const key = `${o.event.id}:${o.originalDate}`;
                    const top = ((minutesOf(o.start) - fromHour * 60) / 60) * HOUR_HEIGHT;
                    const height = Math.max(
                      22,
                      ((minutesOf(o.end) - minutesOf(o.start)) / 60) * HOUR_HEIGHT - 3,
                    );
                    const colour = o.event.color ?? CATEGORY_COLOR[o.event.category];
                    const dragging = drag?.key === key;
                    const readOnly = o.event.readOnly === true;


                    return (
                      <button
                        key={key}
                        type="button"
                        style={{
                          top,
                          height,
                          left: 3,
                          right: 3,
                          borderLeftColor: colour,
                          backgroundColor: `${colour}1F`,
                          transform: dragging ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
                          zIndex: dragging ? 30 : 10,
                        }}
                        className={cn(
                          "absolute touch-none overflow-hidden rounded-[10px] border-l-[3px] px-2 py-1 text-left transition-shadow",
                          "hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.28)]",
                          dragging && "cursor-grabbing opacity-90 shadow-lg",
                          !dragging && (readOnly ? "cursor-pointer" : "cursor-grab"),
                          readOnly && "border-l-dashed",

                          highlightEventId === o.event.id &&
                            "ring-2 ring-primary ring-offset-1 ring-offset-surface",
                          o.event.done && "opacity-60",
                        )}
                        onPointerDown={(e) => {
                          if (readOnly) return;
                          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                          setDrag({
                            key,
                            pointerId: e.pointerId,
                            originX: e.clientX,
                            originY: e.clientY,
                            dx: 0,
                            dy: 0,
                            moved: false,
                          });
                        }}

                        onPointerMove={(e) => {
                          setDrag((d) => {
                            if (!d || d.key !== key) return d;
                            const dx = e.clientX - d.originX;
                            const dy = e.clientY - d.originY;
                            return {
                              ...d,
                              dx,
                              dy,
                              moved: d.moved || Math.abs(dx) > 4 || Math.abs(dy) > 4,
                            };
                          });
                        }}
                        onPointerUp={() => {
                          setDrag((d) => {
                            if (!d || d.key !== key) return null;
                            if (d.moved) commit(o, d);
                            else onSelect(o);
                            return null;
                          });
                        }}
                        onPointerCancel={() => setDrag(null)}
                      >
                        <span
                          className={cn(
                            "block truncate text-[12.5px] font-semibold leading-tight",
                            o.event.done && "line-through",
                          )}
                        >
                          {o.title}
                        </span>
                        {height > 34 && (
                          <span className="tabular block truncate text-[11.5px] text-muted-foreground">
                            {o.start}–{o.end}
                          </span>
                        )}
                        {height > 56 && o.event.location && (
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            {o.event.location}
                          </span>
                        )}
                      </button>
                    );
                  })}

                {iso === today && <NowLine fromHour={fromHour} toHour={toHour} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="border-t border-border bg-surface-2 px-4 py-2.5 text-[12.5px] text-muted-foreground">
        Drag a block to move it to another day or time. Times are shown in 24-hour format.
      </p>
    </div>
  );
}

function NowLine({ fromHour, toHour }: { fromHour: number; toHour: number }) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < fromHour * 60 || minutes > toHour * 60) return null;
  const top = ((minutes - fromHour * 60) / 60) * HOUR_HEIGHT;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top }}>
      <div className="h-px w-full bg-primary" />
      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary" />
    </div>
  );
}
