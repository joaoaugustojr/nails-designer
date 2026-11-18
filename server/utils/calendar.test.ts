import { describe, expect, it } from "vitest";

import { calendarFile, googleCalendarUrl } from "./calendar";

const event = {
  uid: "abc@booking",
  startsAt: new Date("2026-11-18T17:00:00Z"),
  endsAt: new Date("2026-11-18T18:00:00Z"),
  summary: "Esmaltação em gel, Aline Prata",
  location: "Rua das Flores, 123; Centro",
  description: "Para ver ou desmarcar:\nhttps://example.com/bookings/abc",
};

describe("calendarFile", () => {
  it("writes one UTC event with CRLF line endings", () => {
    const file = calendarFile(event, new Date("2026-11-17T12:00:00Z"));
    expect(file.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(file.split("\r\n")).toEqual(
      expect.arrayContaining([
        "UID:abc@booking",
        "DTSTAMP:20261117T120000Z",
        "DTSTART:20261118T170000Z",
        "DTEND:20261118T180000Z",
      ]),
    );
  });

  it("escapes commas, semicolons and line breaks", () => {
    const file = calendarFile(event);
    expect(file).toContain("SUMMARY:Esmaltação em gel\\, Aline Prata");
    expect(file).toContain("LOCATION:Rua das Flores\\, 123\\; Centro");
    expect(file.replace(/\r\n /g, "")).toContain(
      "DESCRIPTION:Para ver ou desmarcar:\\nhttps://example.com/bookings/abc",
    );
  });

  it("folds long lines at 75 bytes without splitting accented letters", () => {
    const file = calendarFile({ ...event, description: "ç".repeat(100), location: null });
    const lines = file.split("\r\n");
    const encoder = new TextEncoder();
    expect(lines.every((line) => encoder.encode(line).length <= 75)).toBe(true);
    expect(file.replace(/\r\n /g, "")).toContain(`DESCRIPTION:${"ç".repeat(100)}`);
    expect(file).not.toContain("LOCATION");
  });
});

describe("googleCalendarUrl", () => {
  it("prefills a Google Calendar event in UTC", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20261118T170000Z/20261118T180000Z");
    expect(url.searchParams.get("text")).toBe(event.summary);
    expect(url.searchParams.get("location")).toBe(event.location);
    expect(url.searchParams.get("details")).toBe(event.description);
  });
});
