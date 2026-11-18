import { basename } from "node:path";

// Lets the owner install the panel as an app ("Adicionar à tela inicial"); it opens on the
// agenda. Linked from the panel pages only, so the client site stays a plain site.
export default defineEventHandler(async (event) => {
  const { storeName, logoPath } = await readSettings();
  const version = logoPath ? `?v=${basename(logoPath)}` : "";

  setResponseHeader(event, "content-type", "application/manifest+json");
  return {
    name: storeName,
    short_name: storeName,
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    icons: logoPath
      ? APP_ICON_SIDES.map((side) => ({
          src: `/icon/${side}.png${version}`,
          sizes: `${side}x${side}`,
          type: "image/png",
        }))
      : [],
  };
});
