export default defineEventHandler(async (event) => {
  enforceRateLimit(event, "booking-cancel", { limit: 10, windowMinutes: 10 });
  await cancelBookingByClient(getRouterParam(event, "token") ?? "");
  return { ok: true };
});
