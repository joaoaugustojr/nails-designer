export default defineEventHandler(async (event) => {
  await reorderServicePhotos(readIdParam(event), await readOrderBody(event));
  return { ok: true };
});
