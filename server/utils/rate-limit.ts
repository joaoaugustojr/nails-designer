import type { H3Event } from "h3";

const windows = new Map<string, { expiresAt: number; count: number }>();

// ponytail: in-memory fixed window per IP, enough for one app process; move it to the database if the app ever runs on several.
export function enforceRateLimit(
  event: H3Event,
  name: string,
  { limit, windowMinutes }: { limit: number; windowMinutes: number },
) {
  const key = `${name}:${getRequestIP(event, { xForwardedFor: true }) ?? "unknown"}`;
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.expiresAt <= now) {
    for (const [staleKey, window] of windows) {
      if (window.expiresAt <= now) windows.delete(staleKey);
    }
    windows.set(key, { expiresAt: now + windowMinutes * 60_000, count: 1 });
    return;
  }

  current.count += 1;
  if (current.count > limit) {
    throw createError({ statusCode: 429, statusMessage: "Too many requests" });
  }
}
