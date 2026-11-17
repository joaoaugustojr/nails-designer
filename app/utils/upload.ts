// Same limit the server fits images into; anything larger is sent for nothing.
const MAX_IMAGE_SIDE = 1600;
const JPEG_QUALITY = 0.85;
const SMALL_ENOUGH_BYTES = 1024 * 1024;

function canvasBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY));
}

/**
 * Shrinks a phone photo before upload (a 4–8 MB photo becomes a few hundred KB), so it
 * reaches the server in a fraction of the time. The server still validates and re-encodes
 * whatever arrives. PNGs stay PNG to keep a logo's transparency. On any failure the
 * original file is sent.
 */
export async function shrinkImage(file: File): Promise<Blob> {
  try {
    // createImageBitmap applies the EXIF orientation, so photos keep standing up.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_ENOUGH_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const shrunk = await canvasBlob(canvas, file.type === "image/png" ? "image/png" : "image/jpeg");
    return shrunk && shrunk.size < file.size ? shrunk : file;
  } catch {
    return file;
  }
}
