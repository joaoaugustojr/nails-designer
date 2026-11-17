import { join } from "node:path";

import { encodePreviewJpeg } from "../../utils/image-encode";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// /preview/<upload name>.jpg: a JPEG copy of an upload for og:image. The URL ends in .jpg
// because some link-preview crawlers judge the format by the extension.
export default defineEventHandler(async (event) => {
  const name = (getRouterParam(event, "name") ?? "").replace(/\.jpg$/, "");
  if (!UPLOAD_NAME_PATTERN.test(name)) throw createError({ statusCode: 404 });

  const jpeg = await encodePreviewJpeg(join(uploadsDir(), name)).catch(() => null);
  if (!jpeg) throw createError({ statusCode: 404 });

  setResponseHeaders(event, {
    "content-type": "image/jpeg",
    // Upload names are random and never reused, so the copy never changes either.
    "cache-control": `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
  });
  return jpeg;
});
