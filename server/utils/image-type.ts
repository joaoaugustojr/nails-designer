export const IMAGE_CONTENT_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type ImageExtension = keyof typeof IMAGE_CONTENT_TYPES;

const startsWith = (data: Uint8Array, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => data[offset + index] === byte);

// Trusts the file's bytes, never the client's filename or Content-Type.
export function detectImageType(data: Uint8Array): ImageExtension | null {
  if (startsWith(data, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(data, [0x52, 0x49, 0x46, 0x46]) && startsWith(data, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "webp";
  }
  return null;
}
