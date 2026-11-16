import { describe, expect, it } from "vitest";

import { addDays, minutesToTime, timeToMinutes, utcToZoned, zonedToUtc } from "./time";

const SAO_PAULO = "America/Sao_Paulo";
const NEW_YORK = "America/New_York";

describe("clock conversions", () => {
  it("converts minutes and HH:MM both ways", () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(810)).toBe("13:30");
    expect(timeToMinutes("13:30")).toBe(810);
    expect(timeToMinutes("24:00")).toBeNull();
    expect(timeToMinutes("9:00")).toBeNull();
  });
});

describe("zonedToUtc", () => {
  it("applies the store's offset (São Paulo is UTC-3)", () => {
    expect(new Date(zonedToUtc("2026-11-17", 9 * 60, SAO_PAULO)).toISOString()).toBe(
      "2026-11-17T12:00:00.000Z",
    );
  });

  it("handles a time that falls on the next UTC day", () => {
    expect(new Date(zonedToUtc("2026-11-17", 22 * 60, SAO_PAULO)).toISOString()).toBe(
      "2026-11-18T01:00:00.000Z",
    );
  });

  it("follows daylight saving changes", () => {
    expect(new Date(zonedToUtc("2026-07-01", 9 * 60, NEW_YORK)).toISOString()).toBe(
      "2026-07-01T13:00:00.000Z",
    );
    expect(new Date(zonedToUtc("2026-12-01", 9 * 60, NEW_YORK)).toISOString()).toBe(
      "2026-12-01T14:00:00.000Z",
    );
  });

  it("round-trips through utcToZoned", () => {
    const instant = zonedToUtc("2026-12-24", 14 * 60 + 30, SAO_PAULO);
    expect(utcToZoned(instant, SAO_PAULO)).toEqual({ date: "2026-12-24", minutes: 870 });
  });
});

describe("addDays", () => {
  it("crosses months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
