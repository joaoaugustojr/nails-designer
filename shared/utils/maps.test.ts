import { describe, expect, it } from "vitest";

import { storeSchema } from "../schemas/store";
import { directionsUrl, mapUrl } from "./maps";

const parseLocation = (mapLocation: string) => storeSchema.shape.mapLocation.safeParse(mapLocation);

describe("map location", () => {
  it("accepts coordinates as Google Maps copies them and stores them without spaces", () => {
    expect(parseLocation(" -18.147734303136723, -47.91295333577 ")).toEqual({
      success: true,
      data: "-18.147734303136723,-47.91295333577",
    });
    expect(parseLocation("").success).toBe(true);
  });

  it("rejects text and out-of-range numbers", () => {
    expect(parseLocation("Catalão, GO").success).toBe(false);
    expect(parseLocation("-118.1, -47.9").success).toBe(false);
  });

  it("points the links at the exact spot when there is one, else at the address", () => {
    const address = "Av. Joaquim C. de Souza, 482";
    expect(mapUrl({ address, mapLocation: "-18.1477,-47.9129" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=-18.1477%2C-47.9129",
    );
    expect(directionsUrl({ address, mapLocation: null })).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
    );
    expect(mapUrl({ address: null, mapLocation: null })).toBeNull();
  });
});
