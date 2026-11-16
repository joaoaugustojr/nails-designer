export default defineEventHandler(async (event) => {
  await deleteService(readIdParam(event));
  return { ok: true };
});
