/** Alim application component for study, planning, profile, or navigation workflows. */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function format(now: Date) {
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  return { time, date };
}

/**
 * Live 24-hour clock. Frontend-only — ticks from the device clock.
 */
export function LiveClock({
  className,
  showDate = true,
  align = "right",
}: {
  className?: string;
  showDate?: boolean;
  align?: "left" | "right";
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { time, date } = now ? format(now) : { time: "--:--", date: "" };

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col leading-tight",
        align === "right" ? "items-end text-right" : "items-start text-left",
        className,
      )}
      aria-label={`Current time ${time}`}
    >
      <span className="tabular text-[15px] font-medium tracking-tight">{time}</span>
      {showDate && date && (
        <span className="truncate text-[11.5px] text-muted-foreground">{date}</span>
      )}
    </div>
  );
}
