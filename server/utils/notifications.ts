import type { WaitlistPeriod } from "../../shared/schemas/waitlist";
import { formatBookingTime } from "../../shared/utils/dates";
import { firstName } from "../../shared/utils/text";
import { utcToZoned } from "../../shared/utils/time";
import { formatWaitlistWish } from "../../shared/utils/waitlist";

// Shaped like a WhatsApp template message: the text lives in the approved template,
// the app only fills its variables.
export type Notification = {
  to: string;
  template: "booking_confirmation" | "booking_cancelled" | "booking_reminder" | "waitlist_request";
  variables: Record<string, string>;
};

type BookingDetails = {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  token: string;
};

export function waitlistMessage(
  ownerPhone: string,
  request: { clientName: string; serviceName: string; dates: string[]; periods: WaitlistPeriod[] },
): Notification {
  return {
    to: ownerPhone,
    template: "waitlist_request",
    variables: {
      clientName: request.clientName,
      serviceName: request.serviceName,
      wish: formatWaitlistWish(request.dates, request.periods),
      link: `${useRuntimeConfig().siteUrl}/admin/clients`,
    },
  };
}

// Both templates carry the "my booking" link: after a cancellation that page offers a new booking.
export function bookingMessage(
  template: Notification["template"],
  booking: BookingDetails,
  store: { storeName: string; timezone: string },
): Notification {
  const start = utcToZoned(booking.startsAt.getTime(), store.timezone);
  const end = utcToZoned(booking.endsAt.getTime(), store.timezone);
  return {
    to: booking.clientPhone,
    template,
    variables: {
      clientFirstName: firstName(booking.clientName),
      storeName: store.storeName,
      serviceName: booking.serviceName,
      when: formatBookingTime(start.date, start.minutes, end.minutes),
      link: `${useRuntimeConfig().siteUrl}/bookings/${booking.token}`,
    },
  };
}

// Every message goes through here. Callers do not await it: a failed message must never
// undo or delay the booking or request that triggered it.
// ponytail: log channel only; the WhatsApp channel and its error handling land with the Cloud API.
export async function notify(notification: Notification) {
  console.info(
    `Notification ${notification.template} to ${notification.to}`,
    notification.variables,
  );
}
