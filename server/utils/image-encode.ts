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
