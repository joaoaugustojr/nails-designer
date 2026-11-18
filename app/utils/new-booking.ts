import type { LocationQuery } from "vue-router";

const NEW_BOOKING_PATH = "/admin/bookings/new";
const PANEL_PATH = "/admin";

export type NewBookingPrefill = {
  date?: string;
  serviceId?: number;
  name?: string;
  phone?: string;
};

export function newBookingPath({ from, ...prefill }: NewBookingPrefill & { from: string }) {
  const query = new URLSearchParams({ from });
  for (const [key, value] of Object.entries(prefill)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return `${NEW_BOOKING_PATH}?${query}`;
}

export function readNewBookingQuery(query: LocationQuery) {
  const text = (key: string) => (typeof query[key] === "string" ? query[key] : undefined);
  const from = text("from");
  return {
    // Only panel pages: the link must never send the owner to another site.
    backTo: from?.startsWith(PANEL_PATH) ? from : PANEL_PATH,
    prefill: {
      date: text("date"),
      serviceId: Number(text("serviceId")) || undefined,
      name: text("name"),
      phone: text("phone"),
    } satisfies NewBookingPrefill,
  };
}
