export default defineEventHandler(async (event) => {
  requireOwner(event);
  await deletePanelUser(await useDb(), readIdParam(event));
  return { ok: true };
});
