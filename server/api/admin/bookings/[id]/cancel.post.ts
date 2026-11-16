export default defineEventHandler(async (event) => {
  await cancelBooking(readIdParam(event));
  return { ok: true };
});
