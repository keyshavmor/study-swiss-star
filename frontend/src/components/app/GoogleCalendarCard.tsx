/**
 * Planner side card for the read-only Google Calendar integration.
 *
 * Owns connection state, the provider token lifecycle and syncing for the
 * visible planner range. Calendar content never reaches telemetry.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Unlink } from "lucide-react";
import { GoogleCalendarLogo } from "@/components/app/BrandLogos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  captureProviderToken,
  clearGoogleAccess,
  connectGoogleCalendar,
  fetchGoogleCalendarEvents,
  googleOccurrences,
  GoogleCalendarAuthError,
  hasGoogleAccess,
  refreshProviderTokenFromSession,
} from "@/lib/google-calendar";
import { supabase } from "@/integrations/supabase/client";
import type { Occurrence } from "@/lib/store/app-data";
import { track, trackFailure } from "@/lib/telemetry";
import { toast } from "sonner";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export function GoogleCalendarCard({
  range,
  onOccurrences,
}: {
  range: { from: string; to: string };
  onOccurrences: (occurrences: Occurrence[]) => void;
}) {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const onOccurrencesRef = useRef(onOccurrences);
  onOccurrencesRef.current = onOccurrences;

  const sync = useCallback(
    async (from: string, to: string, options?: { silent?: boolean }) => {
      if (!hasGoogleAccess()) {
        setConnected(false);
        onOccurrencesRef.current([]);
        return;
      }
      setBusy(true);
      try {
        const events = await fetchGoogleCalendarEvents(from, to);
        onOccurrencesRef.current(googleOccurrences(events));
        setLastSync(new Date());
        setStatus(null);
        setConnected(true);
        track({
          event_name: "google_calendar_sync_succeeded",
          feature: "planner",
          properties: { event_count: events.length },
        });
      } catch (err) {
        onOccurrencesRef.current([]);
        trackFailure("google_calendar_sync_failed", err, { feature: "planner" });
        if (err instanceof GoogleCalendarAuthError) {
          setConnected(false);
          setStatus(
            "Google Calendar access is not available in this browser session. Connect again to sync.",
          );
        } else {
          setStatus(
            err instanceof Error ? err.message : "Google Calendar could not be reached just now.",
          );
        }
        if (!options?.silent) {
          toast.error("Google Calendar could not be synced.");
        }
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Pick up a provider token that arrived with the OAuth redirect.
  useEffect(() => {
    let cancelled = false;
    void refreshProviderTokenFromSession().then((captured) => {
      if (cancelled) return;
      setConnected(captured || hasGoogleAccess());
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (captureProviderToken(session)) setConnected(true);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  // Sync on load, whenever the visible range changes, and every five minutes.
  useEffect(() => {
    if (!connected) {
      onOccurrencesRef.current([]);
      return;
    }
    void sync(range.from, range.to, { silent: true });
    const timer = window.setInterval(() => {
      void sync(range.from, range.to, { silent: true });
    }, SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [connected, range.from, range.to, sync]);

  async function handleConnect() {
    setBusy(true);
    setStatus(null);
    track({ event_name: "google_calendar_connect_started", feature: "planner" });
    try {
      await connectGoogleCalendar(`${window.location.origin}/planner?google=connected`);
    } catch (err) {
      trackFailure("google_calendar_connect_failed", err, { feature: "planner" });
      setStatus(err instanceof Error ? err.message : "Google Calendar could not be connected.");
      setBusy(false);
    }
  }

  function handleDisconnect() {
    clearGoogleAccess();
    setConnected(false);
    setLastSync(null);
    setStatus("Google Calendar is disconnected in this browser.");
    onOccurrencesRef.current([]);
    track({ event_name: "google_calendar_disconnected", feature: "planner" });
  }

  return (
    <div className="app-card p-5">
      <div className="flex items-center gap-2.5">
        <GoogleCalendarLogo className="h-5 w-5" />
        <h2 className="text-[17px] font-semibold tracking-tight">Google Calendar</h2>
      </div>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Show your Google appointments next to your plan. Read-only: nothing in your Google Calendar
        is ever changed or deleted.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{connected ? "Connected" : "Not connected"}</Badge>
        {connected && (
          <span className="tabular text-[12.5px] text-muted-foreground">
            {busy
              ? "Syncing…"
              : lastSync
                ? `Last synced ${lastSync.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Not synced yet"}
          </span>
        )}
      </div>

      {status && (
        <p className="mt-3 rounded-[14px] bg-surface-2 p-3 text-[13px] text-muted-foreground">
          {status}
        </p>
      )}

      {connected ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void sync(range.from, range.to)}
          >
            <RefreshCw className="h-4 w-4" />
            Sync now
          </Button>
          <Button variant="ghost" onClick={handleDisconnect}>
            <Unlink className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      ) : (
        <Button className="mt-4 w-full" disabled={busy} onClick={() => void handleConnect()}>
          <GoogleCalendarLogo className="h-4 w-4" />
          Connect Google Calendar
        </Button>
      )}
    </div>
  );
}
