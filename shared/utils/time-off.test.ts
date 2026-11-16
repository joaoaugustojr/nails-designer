import { describe, expect, it } from "vitest";

import { zonedToUtc } from "./time";
import { describeTimeOff, formatLeadTime } from "./time-off";

const TZ = "America/Sao_Paulo";
const at = (date: string, time: number) => zonedToUtc(date, time, TZ);

describe("formatLeadTime", () => {
  it.each([
    [0, "Sem mínimo"],
    [30, "30 min"],
    [120, "2h"],
    [720, "12h"],
    [1440, "1 dia"],
    [2880, "2 dias"],
  ])("formats %i minutes as %s", (minutes, label) => {
    expect(formatLeadTime(minutes)).toBe(label);
  });
});

describe("describeTimeOff", () => {
  it("describes a block inside one day", () => {
    expect(describeTimeOff(at("2026-11-19", 840), at("2026-11-19", 960), TZ)).toBe(
      "Qui, 19 nov · 14:00 às 16:00",
    );
  });

  it("describes a single whole day", () => {
    expect(describeTimeOff(at("2026-11-20", 0), at("2026-11-21", 0), TZ)).toBe(
      "Sex, 20 nov · dia inteiro",
    );
  });

  it("describes whole days across months", () => {
    expect(describeTimeOff(at("2026-12-30", 0), at("2027-01-03", 0), TZ)).toBe(
      "30 dez a 2 jan · dias inteiros",
    );
  });

  it("describes several whole days", () => {
    expect(describeTimeOff(at("2026-12-24", 0), at("2026-12-27", 0), TZ)).toBe(
      "24 a 26 dez · dias inteiros",
    );
  });
});
