import { Bell, Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { EventDetailDialog } from "@/components/app/EventDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildNotifications } from "@/lib/notifications";
import type { EventNotification, NotificationSection } from "@/lib/notifications";
import { useAppData } from "@/lib/store/app-data";
import { CATEGORY_COLOR } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SECTIONS: NotificationSection[] = ["Today", "Upcoming", "Earlier"];

/** Header bell with a clickable notification list. Prototype only. */
export function NotificationCenter() {
  const {
    events,
    readNotifications,
    dismissedNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
  } = useAppData();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EventNotification | null>(null);

  const notifications = useMemo(
    () => buildNotifications(events, dismissedNotifications),
    [events, dismissedNotifications],
  );
  const unread = notifications.filter((n) => !readNotifications.includes(n.key));

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell className="h-[19px] w-[19px]" />
            {unread.length > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unread.length > 9 ? "9+" : unread.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[360px] p-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-tight">Notifications</p>
              <p className="text-[12.5px] text-muted-foreground">
                {unread.length} unread · from your planner
              </p>
            </div>
            {unread.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllNotificationsRead(notifications.map((n) => n.key))}
              >
                Mark all read
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[14px] font-medium">You are all caught up</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Notifications appear when you add exams, classes or activities to your planner.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[420px]">
              <ul className="p-2">
                {SECTIONS.map((section) => {
                  const items = notifications.filter((n) => n.section === section);
                  if (items.length === 0) return null;
                  return (
                    <li key={section}>
                      <p className="px-2 pb-1 pt-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {section}
                      </p>
                      <ul className="space-y-1">
                        {items.map((n) => {
                          const isRead = readNotifications.includes(n.key);
                          return (
                            <li key={n.key}>
                              <div
                                className={cn(
                                  "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 rounded-[12px] px-2.5 py-2.5 transition-colors hover:bg-hover",
                                  !isRead && "bg-surface-2",
                                )}
                              >
                                <span
                                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: CATEGORY_COLOR[n.category] }}
                                />
                                <button
                                  type="button"
                                  className="min-w-0 text-left"
                                  onClick={() => {
                                    markNotificationRead(n.key);
                                    setOpen(false);
                                    setSelected(n);
                                  }}
                                >
                                  <p
                                    className={cn(
                                      "truncate text-[14px]",
                                      isRead ? "font-normal" : "font-semibold",
                                    )}
                                  >
                                    {n.title}
                                  </p>
                                  <p className="tabular truncate text-[12.5px] text-muted-foreground">
                                    {n.timestamp} · {n.summary}
                                  </p>
                                </button>
                                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                  {!isRead && (
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label="Mark as read"
                                      onClick={() => markNotificationRead(n.key)}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Dismiss notification"
                                    onClick={() => {
                                      dismissNotification(n.key);
                                      toast.success("Notification dismissed");
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}

          <div className="border-t border-border px-4 py-2.5">
            <Badge variant="secondary">Prototype · nothing is sent anywhere</Badge>
          </div>
        </PopoverContent>
      </Popover>

      {selected && (
        <EventDetailDialog
          key={selected.key}
          occurrence={selected.occurrence}
          notificationKey={selected.key}
          open
          onOpenChange={(next) => {
            if (!next) setSelected(null);
          }}
        />
      )}
    </>
  );
}
