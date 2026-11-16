import { describe, expect, it } from "vitest";

import { detectImageType } from "./image-type";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

describe("detectImageType", () => {
  it("recognizes jpeg, png and webp by their signature", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(detectImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toBe("webp");
  });

  it("rejects anything else", () => {
    expect(detectImageType(bytes(...ascii("<svg")))).toBeNull();
    expect(detectImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")))).toBeNull();
    expect(detectImageType(bytes())).toBeNull();
  });
});
