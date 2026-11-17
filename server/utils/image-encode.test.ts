import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { encodeWebp } from "./image-encode";

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
