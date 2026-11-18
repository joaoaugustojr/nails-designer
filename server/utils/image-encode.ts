import sharp from "sharp";

const MAX_IMAGE_SIDE = 1600;
const WEBP_QUALITY = 80;

// Re-encoding drops every metadata block (EXIF with the phone's GPS position included);
// rotate() first bakes the EXIF orientation into the pixels so photos keep standing up.
export function encodeWebp(data: Uint8Array) {
  return sharp(data)
    .rotate()
    .resize(MAX_IMAGE_SIDE, MAX_IMAGE_SIDE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

const PREVIEW_MAX_SIDE = 1200;
const JPEG_QUALITY = 80;

// Link previews (WhatsApp, Instagram) skip WebP images, so og:image gets a JPEG copy.
export function encodePreviewJpeg(input: string | Uint8Array) {
  return sharp(input)
    .resize(PREVIEW_MAX_SIDE, PREVIEW_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

// Square PNG for the site icons: browsers take a PNG under /favicon.ico, and link previews
// (WhatsApp) skip a WebP icon and fall back to /favicon.ico.
export function encodeIconPng(input: string | Uint8Array, side: number) {
  return sharp(input)
    .resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
