import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { detectImageType, type ImageExtension } from "./image-type";

export const UPLOADS_ROUTE = "/uploads/";
export const UPLOAD_NAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

export async function saveImage(data: Uint8Array, extension: ImageExtension) {
  const name = `${randomUUID()}.${extension}`;
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(join(uploadsDir(), name), data);
  return UPLOADS_ROUTE + name;
}

export async function deleteUpload(publicPath: string) {
  const name = basename(publicPath);
  if (!UPLOAD_NAME_PATTERN.test(name)) return;
  // Already gone is fine: the goal is that the file does not exist.
  await unlink(join(uploadsDir(), name)).catch(() => {});
}
