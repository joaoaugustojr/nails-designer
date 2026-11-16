export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token") ?? "";
  const [booking, store] = await Promise.all([findBookingByToken(token), getStoreProfile()]);
  const { origin } = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });

  setResponseHeaders(event, {
    "content-type": "text/calendar; charset=utf-8",
    "content-disposition": 'attachment; filename="agendamento.ics"',
  });
  return calendarFile({
    uid: `${booking.token}@booking`,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    summary: `${booking.serviceName} · ${store.name}`,
    location: store.address,
    description: `Para ver ou desmarcar o agendamento: ${origin}/bookings/${booking.token}`,
  });
});
