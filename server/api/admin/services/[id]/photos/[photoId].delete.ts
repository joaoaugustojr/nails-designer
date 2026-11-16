export default defineEventHandler(async (event) => {
  await deleteServicePhoto(readIdParam(event), readIdParam(event, "photoId"));
  return { ok: true };
});
