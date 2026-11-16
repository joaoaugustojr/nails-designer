import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join } from "node:path";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, "name") ?? "";
  // The strict name pattern is what keeps this route from serving any other file.
  if (!UPLOAD_NAME_PATTERN.test(name)) throw createError({ statusCode: 404 });

  const path = join(uploadsDir(), name);
  const file = await stat(path).catch(() => null);
  if (!file) throw createError({ statusCode: 404 });

  const extension = extname(name).slice(1) as ImageExtension;
  setResponseHeaders(event, {
    "content-type": IMAGE_CONTENT_TYPES[extension],
    "content-length": file.size,
    // File names are random and never reused, so they can be cached forever.
    "cache-control": `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
    "x-content-type-options": "nosniff",
  });
  return sendStream(event, createReadStream(path));
});
