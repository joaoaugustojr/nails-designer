import { describe, expect, it } from "vitest";

import { buildDayTimeline } from "./day-timeline";

const span = (start: string, end: string) => {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return { startMinute: minutes(start), endMinute: minutes(end) };
};

const summary = (items: { kind: string; startMinute: number; endMinute: number }[]) =>
  items.map((item) => `${item.kind} ${item.startMinute}-${item.endMinute}`);

describe("buildDayTimeline", () => {
  it("shows the whole working day as free when nothing is booked", () => {
    expect(summary(buildDayTimeline([span("09:00", "18:00")], [], []))).toEqual(["free 540-1080"]);
  });

  it("fills the gaps around bookings and blocks", () => {
    const items = buildDayTimeline(
      [span("09:00", "18:00")],
      [span("09:00", "10:00"), span("13:30", "14:15")],
      [span("12:30", "13:30")],
    );
    expect(summary(items)).toEqual([
      "booking 540-600",
      "free 600-750",
      "blocked 750-810",
      "booking 810-855",
      "free 855-1080",
    ]);
  });

  it("shows the break between two working ranges", () => {
    const items = buildDayTimeline([span("13:30", "18:00"), span("09:00", "12:30")], [], []);
    expect(summary(items)).toEqual(["free 540-750", "break 750-810", "free 810-1080"]);
  });

  it("leaves no free time when bookings overlap or run past closing", () => {
    const items = buildDayTimeline(
      [span("09:00", "11:00")],
      [span("09:00", "10:30"), span("10:00", "11:30")],
      [],
    );
    expect(summary(items)).toEqual(["booking 540-630", "booking 600-690"]);
  });

  it("keeps bookings made outside working hours", () => {
    expect(summary(buildDayTimeline([], [span("19:00", "20:00")], []))).toEqual([
      "booking 1140-1200",
    ]);
  });

  it("keeps the booking data", () => {
    const [item] = buildDayTimeline([], [{ ...span("09:00", "10:00"), clientName: "Maria" }], []);
    expect(item).toMatchObject({ kind: "booking", clientName: "Maria" });
  });
});
