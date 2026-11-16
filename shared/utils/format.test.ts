import { describe, expect, it } from "vitest";

import { formatDuration } from "./duration";
import { centsToPriceInput, formatPrice, formatPriceShort, parsePrice } from "./money";
import { formatPhone, whatsappUrl } from "./phone";

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

  it("drops the cents of whole amounts in the short format", () => {
    expect(formatPriceShort(52000).replace(/\s/g, " ")).toBe("R$ 520");
    expect(formatPriceShort(4550).replace(/\s/g, " ")).toBe("R$ 45,50");
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

describe("formatPhone", () => {
  it.each([
    ["11912345678", "(11) 91234-5678"],
    ["1133334444", "(11) 3333-4444"],
    ["5511912345678", "+55 (11) 91234-5678"],
    ["123", "123"],
  ])("formats %s as %s", (digits, label) => {
    expect(formatPhone(digits)).toBe(label);
  });
});

describe("whatsappUrl", () => {
  it("adds Brazil's code to local numbers", () => {
    expect(whatsappUrl("11912345678")).toBe("https://wa.me/5511912345678");
    expect(whatsappUrl("5511912345678")).toBe("https://wa.me/5511912345678");
  });

  it("encodes a prefilled message", () => {
    expect(whatsappUrl("11912345678", "Olá, Maria!")).toBe(
      "https://wa.me/5511912345678?text=Ol%C3%A1%2C%20Maria!",
    );
  });
});
