export const IMAGE_CONTENT_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type ImageExtension = keyof typeof IMAGE_CONTENT_TYPES;

export const ACCEPTED_IMAGE_TYPES = Object.values(IMAGE_CONTENT_TYPES).join(",");
export const MAX_IMAGE_MEGABYTES = 8;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MEGABYTES * 1024 * 1024;
