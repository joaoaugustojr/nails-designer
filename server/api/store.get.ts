// Public store identity for every page (name, logo, accent color). No private settings here.
export default defineEventHandler(async () => {
  const db = await useDb();
  const store = await db.query.settings.findFirst({
    columns: { storeName: true, logoPath: true, accentColor: true },
  });
  return {
    name: store?.storeName ?? "",
    logoPath: store?.logoPath ?? null,
    accentColor: store?.accentColor ?? null,
  };
});
