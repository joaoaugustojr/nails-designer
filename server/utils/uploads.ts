import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { H3Event } from "h3";

import { detectImageType } from "./image-type";

export const UPLOAD_NAME_PATTERN = new RegExp(
  `^[0-9a-f-]{36}\\.(${Object.keys(IMAGE_CONTENT_TYPES).join("|")})$`,
);

export function uploadsDir() {
  return useRuntimeConfig().uploadsDir;
}

export function assertImage(data: Uint8Array): ImageExtension {
  if (data.byteLength > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: "Image too large" });
  }
  const extension = detectImageType(data);
  if (!extension) {
    throw createError({ statusCode: 415, statusMessage: "Unsupported image type" });
  }
  return extension;
}

export async function readImagePart(event: H3Event) {
  const parts = (await readMultipartFormData(event)) ?? [];
  const image = parts.find((part) => part.name === "image");
  if (!image) throw createError({ statusCode: 400, statusMessage: "No image" });
  return image.data;
}

export async function saveImage(data: Uint8Array, extension: ImageExtension) {
  const name = `${randomUUID()}.${extension}`;
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(join(uploadsDir(), name), data);
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
