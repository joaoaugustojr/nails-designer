import { basename, join } from "node:path";
import type { H3Event } from "h3";

import { encodeIconPng } from "./image-encode";

const ONE_HOUR_SECONDS = 60 * 60;
// The sizes Android asks a web app manifest for.
export const APP_ICON_SIDES = [192, 512];

// The store's logo as a square PNG. Pages and the manifest link it with ?v=<logo file name>,
// so a new logo is a new URL; the hour only covers clients that ask for the bare path.
// Without a logo there is no icon, never a framework default.
export async function sendStoreIcon(event: H3Event, side: number) {
  const { logoPath } = await readSettings();
  const name = basename(logoPath ?? "");
  if (!UPLOAD_NAME_PATTERN.test(name)) throw createError({ statusCode: 404 });

  const png = await encodeIconPng(join(uploadsDir(), name), side).catch(() => null);
  if (!png) throw createError({ statusCode: 404 });

  setResponseHeaders(event, {
    "content-type": "image/png",
    "cache-control": `public, max-age=${ONE_HOUR_SECONDS}`,
  });
  return png;
}
