export default defineEventHandler(async (event) => {
  requireOwner(event);
  return replaceStoreLogo(await readImagePart(event));
});
