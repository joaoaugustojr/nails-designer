export default defineEventHandler(async (event) => {
  await deleteTimeOff(readIdParam(event));
  return { ok: true };
});
