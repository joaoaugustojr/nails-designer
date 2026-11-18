import { describe, expect, it } from "vitest";

import { formatFullDay } from "./dates";
import { formatDuration } from "./duration";
import { centsToPriceInput, formatPrice, formatPriceShort, parsePrice } from "./money";
import { formatPhone, maskPhone, whatsappShareUrl, whatsappUrl } from "./phone";
import { initials, plural } from "./text";

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
    ["11 91234 5678", "(11) 91234-5678"],
    ["123", "123"],
  ])("formats %s as %s", (phone, label) => {
    expect(formatPhone(phone)).toBe(label);
  });
});

describe("maskPhone", () => {
  it.each([
    ["", ""],
    ["1", "(1"],
    ["11", "(11"],
    ["119", "(11) 9"],
    ["1191234", "(11) 9123-4"],
    ["1133334444", "(11) 3333-4444"],
    ["11912345678", "(11) 91234-5678"],
    ["119123456789", "(11) 91234-5678"],
    ["+55 11 91234-5678", "(11) 91234-5678"],
    ["(11) 9123-", "(11) 9123"],
    ["abc", ""],
  ])("masks %s as %s", (typed, masked) => {
    expect(maskPhone(typed)).toBe(masked);
  });
});

describe("whatsappShareUrl", () => {
  it("lets the sender pick the contact", () => {
    expect(whatsappShareUrl("Agende: https://x.com")).toBe(
      "https://wa.me/?text=Agende%3A%20https%3A%2F%2Fx.com",
    );
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

describe("text helpers", () => {
  it("takes the first letters of up to two words", () => {
    expect(initials("Maria Souza Lima")).toBe("MS");
    expect(initials("  ana ")).toBe("A");
    expect(initials("")).toBe("");
  });

  it("picks the singular only for one", () => {
    expect(plural(1, "cliente", "clientes")).toBe("1 cliente");
    expect(plural(0, "cliente", "clientes")).toBe("0 clientes");
    expect(plural(2, "cliente", "clientes")).toBe("2 clientes");
  });
});

describe("formatFullDay", () => {
  it("writes the weekday and the month in full, without the '-feira'", () => {
    expect(formatFullDay("2026-11-16")).toBe("Segunda, 16 de novembro");
    expect(formatFullDay("2026-11-21")).toBe("Sábado, 21 de novembro");
  });
});
