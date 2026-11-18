export default defineEventHandler(async (event) => {
  await deleteWaitlistRequest(readIdParam(event));
  return { ok: true };
});
