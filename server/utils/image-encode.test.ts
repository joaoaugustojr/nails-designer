import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { encodeIconPng, encodePreviewJpeg, encodeWebp } from "./image-encode";

const phonePhoto = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#d9a" } })
    .jpeg()
    .withMetadata({ orientation: 6, exif: { IFD0: { Make: "Phone" } } })
    .toBuffer();

describe("encodeWebp", () => {
  it("strips metadata, applies the orientation and fits within 1600 px", async () => {
    const output = await sharp(await encodeWebp(await phonePhoto(4000, 3000))).metadata();

    expect(output.format).toBe("webp");
    expect([output.width, output.height]).toEqual([1200, 1600]);
    expect(output.exif).toBeUndefined();
    expect(output.orientation).toBeUndefined();
  });

  it("does not enlarge small images", async () => {
    const output = await sharp(await encodeWebp(await phonePhoto(400, 300))).metadata();

    expect([output.width, output.height]).toEqual([300, 400]);
  });
});

describe("encodePreviewJpeg", () => {
  it("turns an upload into a JPEG of at most 1200 px for link previews", async () => {
    const webp = await encodeWebp(await phonePhoto(4000, 3000));
    const output = await sharp(await encodePreviewJpeg(webp)).metadata();

    expect(output.format).toBe("jpeg");
    expect([output.width, output.height]).toEqual([900, 1200]);
  });
});

describe("encodeIconPng", () => {
  it("fits the logo in a 180 px square PNG", async () => {
    const webp = await encodeWebp(await phonePhoto(400, 300));
    const output = await sharp(await encodeIconPng(webp)).metadata();

    expect(output.format).toBe("png");
    expect([output.width, output.height]).toEqual([180, 180]);
  });
});
