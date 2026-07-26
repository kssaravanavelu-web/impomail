const SW_URL = "/impo-notify-sw.js";

let registration: ServiceWorkerRegistration | null = null;

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

/** Registers the notification-only service worker (never an app-shell worker). */
export async function ensureNotificationWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (registration) return registration;
  try {
    registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    return registration;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      /* ignore */
    }
  }
  if (Notification.permission === "granted") await ensureNotificationWorker();
  return Notification.permission;
}

/**
 * Shows a system notification (home / lock screen on mobile) through the
 * service worker when available, falling back to a page notification.
 */
export async function showMailNotification(opts: {
  title: string;
  body: string;
  tag: string;
  url?: string;
}) {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const payload: NotificationOptions = {
    body: opts.body,
    tag: opts.tag,
    icon: "/impo-mail-logo.png",
    badge: "/impo-mail-logo.png",
    data: { url: opts.url ?? "/inbox" },
  };
  const reg = await ensureNotificationWorker();
  try {
    if (reg) {
      await reg.showNotification(opts.title, payload);
      return true;
    }
    new Notification(opts.title, payload);
    return true;
  } catch {
    return false;
  }
}