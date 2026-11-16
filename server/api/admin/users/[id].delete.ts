export default defineEventHandler(async (event) => {
  requireOwner(event);
  await deletePanelUser(readIdParam(event));
  return { ok: true };
});
