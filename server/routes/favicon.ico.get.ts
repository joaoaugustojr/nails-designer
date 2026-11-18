import { basename, join } from "node:path";

import { encodeIconPng } from "../utils/image-encode";

const ONE_HOUR_SECONDS = 60 * 60;

// The store's logo, so browsers and link previews that ask for /favicon.ico never get a
// framework default. Without a logo there is no icon.
export default defineEventHandler(async (event) => {
  const { logoPath } = await readSettings();
  const name = basename(logoPath ?? "");
  if (!UPLOAD_NAME_PATTERN.test(name)) throw createError({ statusCode: 404 });

  const png = await encodeIconPng(join(uploadsDir(), name)).catch(() => null);
  if (!png) throw createError({ statusCode: 404 });

  setResponseHeaders(event, {
    "content-type": "image/png",
    // The page links /favicon.ico?v=<logo>, so a new logo is a new URL; the hour only covers
    // clients that ask for the bare path.
    "cache-control": `public, max-age=${ONE_HOUR_SECONDS}`,
  });
  return png;
});
