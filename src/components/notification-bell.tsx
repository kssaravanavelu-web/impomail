import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, BellRing } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGmailMessages, type GmailMessageSummary } from "@/lib/gmail.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ensureNotificationWorker,
  notificationPermission,
  requestNotificationPermission,
  showMailNotification,
} from "@/lib/push-notify";

const SEEN_KEY = "impo-seen-notifications";

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(0, 300)));
  } catch {
    /* ignore */
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const announced = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const list = useServerFn(listGmailMessages);
  const [permission, setPermission] = useState<string>("default");

  useEffect(() => setSeen(readSeen()), []);

  // System notifications (home / lock screen) via the notification service worker.
  useEffect(() => {
    setPermission(notificationPermission());
    if (notificationPermission() === "granted") void ensureNotificationWorker();
  }, []);

  const enableSystemNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") toast.success("Device notifications enabled");
    else if (result === "denied") toast.error("Notifications are blocked in your browser settings");
  };

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list({ data: { q: "is:unread", maxResults: 15 } }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const items: GmailMessageSummary[] = useMemo(() => data ?? [], [data]);
  const unseen = useMemo(() => items.filter((m) => !seen.includes(m.id)), [items, seen]);

  // Toast for genuinely new mail (skip the very first load so we don't spam).
  useEffect(() => {
    if (!items.length) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      items.forEach((m) => announced.current.add(m.id));
      return;
    }
    const fresh = items.filter((m) => !announced.current.has(m.id) && !seen.includes(m.id));
    fresh.slice(0, 3).forEach((m) => {
      announced.current.add(m.id);
      toast(`New mail — ${m.category}`, { description: `${m.from}: ${m.subject}` });
      void showMailNotification({
        title: m.from || "New mail",
        body: m.subject || m.snippet,
        tag: m.id,
        url: `/message/${m.id}`,
      });
    });
    items.forEach((m) => announced.current.add(m.id));
  }, [items, seen]);

  // Close on outside click / Escape
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAllRead = () => {
    const ids = Array.from(new Set([...items.map((m) => m.id), ...seen]));
    setSeen(ids);
    writeSeen(ids);
  };

  const markOne = (id: string) => {
    const ids = Array.from(new Set([id, ...seen]));
    setSeen(ids);
    writeSeen(ids);
  };

  const count = unseen.length;

  return (
    <div className="relative" ref={wrapRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={count ? `Notifications, ${count} new` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-primary/20 bg-card/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          {permission !== "granted" && permission !== "unsupported" && (
            <button
              onClick={enableSystemNotifications}
              className="flex w-full items-center gap-2 border-b border-border/60 bg-primary/5 px-4 py-3 text-left text-xs text-primary transition hover:bg-primary/10"
            >
              <BellRing className="h-3.5 w-3.5 shrink-0" />
              Turn on device alerts to get new mail on your home & lock screen
            </button>
          )}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
            ) : (
              items.map((m) => {
                const isNew = !seen.includes(m.id);
                return (
                  <Link
                    key={m.id}
                    to="/message/$id"
                    params={{ id: m.id }}
                    onClick={() => {
                      markOne(m.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex gap-3 border-b border-border/40 px-4 py-3 transition-colors last:border-0 hover:bg-accent/50",
                      isNew && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", isNew ? "bg-primary" : "bg-transparent")}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{m.from}</span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-primary">{m.category}</span>
                      </span>
                      <span className="block truncate text-sm text-foreground/90">{m.subject}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.snippet}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}