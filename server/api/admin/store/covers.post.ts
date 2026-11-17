export default defineEventHandler(async (event) => {
  requireOwner(event);
  return addStoreCover(await readImagePart(event));
});
