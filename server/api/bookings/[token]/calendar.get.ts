// Apple devices add an inline .ics to Calendar natively; elsewhere (Android above all)
// a downloaded .ics has no app to open it, so those go to Google Calendar instead.
const APPLE_DEVICE = /iPhone|iPad|Macintosh/;

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token") ?? "";
  const [booking, store] = await Promise.all([findBookingByToken(token), getStoreProfile()]);
  const { origin } = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  const calendarEvent = {
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    summary: `${booking.serviceName} · ${store.name}`,
    location: store.address,
    description: `Para ver ou desmarcar o agendamento: ${origin}/bookings/${booking.token}`,
  };

  if (!APPLE_DEVICE.test(getRequestHeader(event, "user-agent") ?? "")) {
    return sendRedirect(event, googleCalendarUrl(calendarEvent));
  }

  setResponseHeaders(event, {
    "content-type": "text/calendar; charset=utf-8",
    "content-disposition": 'inline; filename="agendamento.ics"',
  });
  return calendarFile({ uid: `${booking.token}@booking`, ...calendarEvent });
});
