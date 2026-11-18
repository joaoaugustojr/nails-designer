import { and, eq } from "drizzle-orm";
import webpush, { WebPushError } from "web-push";
import { z } from "zod";

import type { WaitlistPeriod } from "../../shared/schemas/waitlist";
import { formatBookingTime } from "../../shared/utils/dates";
import { utcToZoned } from "../../shared/utils/time";
import { formatWaitlistWish } from "../../shared/utils/waitlist";
import { pushSubscriptions } from "../db/schema";

const ONE_DAY_SECONDS = 60 * 60 * 24;
// The push service answers these for a subscription that no longer exists (app uninstalled,
// permission revoked): it is deleted instead of retried forever.
const GONE_STATUSES = [404, 410];

export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export type PanelPush = { title: string; body: string; url: string };

export async function savePushSubscription(
  userId: number,
  { endpoint, keys }: z.infer<typeof pushSubscriptionSchema>,
) {
  const db = await useDb();
  const values = { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth };
  await db
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
}

export async function deletePushSubscription(userId: number, endpoint: string) {
  const db = await useDb();
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

// Sends to every phone where a panel user turned notifications on. Callers do not await it:
// a failed notification must never undo or delay the booking that triggered it.
export async function pushToPanel(message: PanelPush) {
  const { vapidPrivateKey, siteUrl, public: publicConfig } = useRuntimeConfig();
  if (!vapidPrivateKey || !publicConfig.vapidPublicKey) return;

  const db = await useDb();
  const subscriptions = await db.select().from(pushSubscriptions);
  const options = {
    TTL: ONE_DAY_SECONDS,
    vapidDetails: {
      subject: siteUrl,
      publicKey: publicConfig.vapidPublicKey,
      privateKey: vapidPrivateKey,
    },
  };
  await Promise.all(
    subscriptions.map(async ({ id, endpoint, p256dh, auth }) => {
      try {
        await webpush.sendNotification(
          { endpoint, keys: { p256dh, auth } },
          JSON.stringify(message),
          options,
        );
      } catch (error) {
        if (error instanceof WebPushError && GONE_STATUSES.includes(error.statusCode)) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
          return;
        }
        console.error("Push notification failed:", error);
      }
    }),
  );
}

type PushBooking = { clientName: string; serviceName: string; startsAt: Date; endsAt: Date };

const BOOKING_PUSH_TITLES = {
  created: "Novo agendamento",
  cancelled: "Agendamento cancelado pela cliente",
  arriving: "Cliente chega em 30 minutos",
};

export function bookingPush(
  kind: keyof typeof BOOKING_PUSH_TITLES,
  booking: PushBooking,
  timezone: string,
): PanelPush {
  const start = utcToZoned(booking.startsAt.getTime(), timezone);
  const end = utcToZoned(booking.endsAt.getTime(), timezone);
  return {
    title: BOOKING_PUSH_TITLES[kind],
    body: `${booking.clientName} · ${booking.serviceName}\n${formatBookingTime(start.date, start.minutes, end.minutes)}`,
    url: "/admin",
  };
}

export function waitlistPush(request: {
  clientName: string;
  serviceName: string;
  dates: string[];
  periods: WaitlistPeriod[];
}): PanelPush {
  return {
    title: "Nova cliente na lista de espera",
    body: `${request.clientName} · ${request.serviceName}\n${formatWaitlistWish(request.dates, request.periods)}`,
    url: "/admin/clients",
  };
}
