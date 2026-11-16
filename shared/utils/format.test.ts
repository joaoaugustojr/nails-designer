import { describe, expect, it } from "vitest";

import { formatDuration } from "./duration";
import { centsToPriceInput, formatPrice, parsePrice } from "./money";

describe("parsePrice", () => {
  it.each([
    ["45", 4500],
    ["45,5", 4550],
    ["45,50", 4550],
    ["1.234,56", 123456],
    ["R$ 45,00", 4500],
    ["45.50", 4550],
    ["0", 0],
  ])("reads %s as %i cents", (input, cents) => {
    expect(parsePrice(input)).toBe(cents);
  });

  it.each(["", "abc", "45,555", "-10", "4,5,6"])("rejects %s", (input) => {
    expect(parsePrice(input)).toBeNull();
  });
});

describe("price formatting", () => {
  it("formats cents as reais", () => {
    expect(formatPrice(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });

  it("round-trips the form input", () => {
    expect(parsePrice(centsToPriceInput(4550))).toBe(4550);
  });
});

describe("formatDuration", () => {
  it.each([
    [45, "45 min"],
    [60, "1h"],
    [90, "1h30"],
    [150, "2h30"],
    [135, "2h15"],
  ])("formats %i minutes as %s", (minutes, label) => {
    expect(formatDuration(minutes)).toBe(label);
  });
});
