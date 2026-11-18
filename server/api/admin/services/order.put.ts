export default defineEventHandler(async (event) => {
  await reorderServices(await readOrderBody(event));
  return { ok: true };
});
