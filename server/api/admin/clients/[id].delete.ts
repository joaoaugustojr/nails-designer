export default defineEventHandler(async (event) => {
  requireOwner(event);
  await removeClient(readIdParam(event));
  return { ok: true };
});
