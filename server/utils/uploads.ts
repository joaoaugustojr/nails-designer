import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { H3Event } from "h3";

import { encodeWebp } from "./image-encode";
import { detectImageType } from "./image-type";

export const UPLOAD_NAME_PATTERN = new RegExp(
  `^[0-9a-f-]{36}\\.(${Object.keys(IMAGE_CONTENT_TYPES).join("|")})$`,
);

export function uploadsDir() {
  return useRuntimeConfig().uploadsDir;
}

// Validates and re-encodes without writing, so callers can prepare every image of a
// request before saving any.
export async function prepareImage(data: Uint8Array) {
  if (data.byteLength > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: "Image too large" });
  }
  if (!detectImageType(data)) {
    throw createError({ statusCode: 415, statusMessage: "Unsupported image type" });
  }
  try {
    return await encodeWebp(data);
  } catch {
    throw createError({ statusCode: 415, statusMessage: "Unreadable image" });
  }
}

export async function readImagePart(event: H3Event) {
  const parts = (await readMultipartFormData(event)) ?? [];
  const image = parts.find((part) => part.name === "image");
  if (!image) throw createError({ statusCode: 400, statusMessage: "No image" });
  return image.data;
}

export async function saveImage(webp: Uint8Array) {
  const name = `${randomUUID()}.webp`;
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(join(uploadsDir(), name), webp);
  return `/uploads/${name}`;
}

// Runs after the database change is committed, so a failure must not fail the request:
// a leftover file only wastes space.
export async function deleteUpload(publicPath: string) {
  const name = basename(publicPath);
  if (!UPLOAD_NAME_PATTERN.test(name)) return;
  try {
    await unlink(join(uploadsDir(), name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Could not delete upload ${name}:`, error);
    }
  }
}
