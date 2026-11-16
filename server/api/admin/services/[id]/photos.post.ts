export default defineEventHandler(async (event) => {
  const id = readIdParam(event);
  const parts = (await readMultipartFormData(event)) ?? [];
  const images = parts.filter((part) => part.name === "photos").map((part) => part.data);
  if (!images.length) throw createError({ statusCode: 400, statusMessage: "No photos" });
  await addServicePhotos(id, images);
  return { ok: true };
});
