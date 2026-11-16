export default defineEventHandler(async () => {
  const [store, services] = await Promise.all([getStoreProfile(), listCatalog()]);
  return { store, services };
});
