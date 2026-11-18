// /icon/192.png and /icon/512.png, linked by the web app manifest.
export default defineEventHandler((event) => {
  const side = Number(getRouterParam(event, "name")?.replace(/\.png$/, ""));
  if (!APP_ICON_SIDES.includes(side)) throw createError({ statusCode: 404 });
  return sendStoreIcon(event, side);
});
