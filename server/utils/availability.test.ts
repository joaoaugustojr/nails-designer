import { describe, expect, it } from "vitest";

import { type AvailabilityInput, availableStartMinutes, isBookableDate } from "./availability";

const TIMEZONE = "America/Sao_Paulo";
const NOW = Date.parse("2026-11-17T09:00:00-03:00");
const DAY = "2026-11-18";

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const range = (start: string, end: string) => ({
  startMinute: minutes(start),
  endMinute: minutes(end),
});
const at = (date: string, time: string) => Date.parse(`${date}T${time}:00-03:00`);
const interval = (start: string, end: string, date = DAY) => ({
  startsAt: at(date, start),
  endsAt: at(date, end),
});
const times = (starts: number[]) =>
  starts.map(
    (start) =>
      `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
  );

function slots(overrides: Partial<AvailabilityInput> = {}) {
  return times(
    availableStartMinutes({
      date: DAY,
      durationMinutes: 60,
      workingRanges: [range("09:00", "12:00")],
      bookings: [],
      timeOff: [],
      rules: { slotStepMinutes: 30, gapMinutes: 0, minNoticeMinutes: 0, maxDaysAhead: 30 },
      timezone: TIMEZONE,
      now: NOW,
      ...overrides,
    }),
  );
}

const rules = (changes: Partial<AvailabilityInput["rules"]>) => ({
  slotStepMinutes: 30,
  gapMinutes: 0,
  minNoticeMinutes: 0,
  maxDaysAhead: 30,
  ...changes,
});

describe("availableStartMinutes", () => {
  it("offers every step where the whole service fits before closing", () => {
    expect(slots()).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(slots({ durationMinutes: 150 })).toEqual(["09:00", "09:30"]);
    expect(slots({ durationMinutes: 240 })).toEqual([]);
  });

  it("uses each working range and never crosses the break between them", () => {
    expect(slots({ workingRanges: [range("14:00", "16:00"), range("09:00", "10:30")] })).toEqual([
      "09:00",
      "09:30",
      "14:00",
      "14:30",
      "15:00",
    ]);
  });

  it("has nothing on a day without working hours", () => {
    expect(slots({ workingRanges: [] })).toEqual([]);
  });

  it("skips starts that would overlap a booking", () => {
    expect(slots({ bookings: [interval("10:00", "11:00")] })).toEqual(["09:00", "11:00"]);
  });

  it("keeps the gap free on both sides of a booking", () => {
    const busy = { bookings: [interval("10:00", "11:00")] };
    expect(slots({ ...busy, workingRanges: [range("08:00", "13:00")] })).toEqual([
      "08:00",
      "08:30",
      "09:00",
      "11:00",
      "11:30",
      "12:00",
    ]);
    expect(
      slots({
        ...busy,
        workingRanges: [range("08:00", "13:00")],
        rules: rules({ gapMinutes: 15 }),
      }),
    ).toEqual(["08:00", "08:30", "11:30", "12:00"]);
  });

  it("needs no gap around time off", () => {
    expect(
      slots({ timeOff: [interval("10:00", "11:00")], rules: rules({ gapMinutes: 30 }) }),
    ).toEqual(["09:00", "11:00"]);
  });

  it("closes the day for whole-day time off spanning several days", () => {
    expect(
      slots({
        timeOff: [{ startsAt: at("2026-11-17", "00:00"), endsAt: at("2026-11-20", "00:00") }],
      }),
    ).toEqual([]);
  });

  it("respects the minimum notice on the same day", () => {
    const today = "2026-11-17";
    expect(slots({ date: today })).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(slots({ date: today, rules: rules({ minNoticeMinutes: 120 }) })).toEqual(["11:00"]);
    expect(slots({ date: today, now: at(today, "09:10") })).toEqual([
      "09:30",
      "10:00",
      "10:30",
      "11:00",
    ]);
  });

  it("carries the minimum notice into the next day", () => {
    const lateNight = at("2026-11-17", "22:00");
    expect(slots({ now: lateNight, rules: rules({ minNoticeMinutes: 12 * 60 }) })).toEqual([
      "10:00",
      "10:30",
      "11:00",
    ]);
  });

  it("offers nothing outside the open agenda", () => {
    expect(slots({ date: "2026-11-16" })).toEqual([]);
    expect(slots({ date: "2026-11-24", rules: rules({ maxDaysAhead: 7 }) })).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
    ]);
    expect(slots({ date: "2026-11-25", rules: rules({ maxDaysAhead: 7 }) })).toEqual([]);
  });

  it("handles ranges touching midnight and bookings from the day before", () => {
    const night = {
      workingRanges: [range("00:00", "02:00"), { startMinute: 22 * 60, endMinute: 1440 }],
    };
    expect(slots(night)).toEqual(["00:00", "00:30", "01:00", "22:00", "22:30", "23:00"]);
    expect(
      slots({
        ...night,
        bookings: [{ startsAt: at("2026-11-17", "23:30"), endsAt: at(DAY, "00:45") }],
      }),
    ).toEqual(["01:00", "22:00", "22:30", "23:00"]);
  });

  it("works in the store's timezone, not UTC", () => {
    const utcMorning = availableStartMinutes({
      date: DAY,
      durationMinutes: 60,
      workingRanges: [range("09:00", "10:00")],
      bookings: [
        { startsAt: Date.parse(`${DAY}T12:00:00Z`), endsAt: Date.parse(`${DAY}T13:00:00Z`) },
      ],
      timeOff: [],
      rules: rules({}),
      timezone: TIMEZONE,
      now: NOW,
    });
    expect(utcMorning).toEqual([]);
  });

  it("uses the right offset after a daylight-saving change", () => {
    const springForward = "2027-03-14";
    expect(
      slots({
        date: springForward,
        timezone: "America/New_York",
        now: Date.parse("2027-03-01T12:00:00Z"),
        workingRanges: [range("09:00", "11:00")],
        bookings: [
          {
            startsAt: Date.parse("2027-03-14T13:00:00Z"),
            endsAt: Date.parse("2027-03-14T14:00:00Z"),
          },
        ],
      }),
    ).toEqual(["10:00"]);
  });
});

describe("isBookableDate", () => {
  it("opens today through today plus the days ahead, in the store's timezone", () => {
    const lateEvening = Date.parse("2026-11-17T23:30:00-03:00");
    expect(isBookableDate("2026-11-17", 7, TIMEZONE, lateEvening)).toBe(true);
    expect(isBookableDate("2026-11-24", 7, TIMEZONE, lateEvening)).toBe(true);
    expect(isBookableDate("2026-11-25", 7, TIMEZONE, lateEvening)).toBe(false);
    expect(isBookableDate("2026-11-16", 7, TIMEZONE, lateEvening)).toBe(false);
  });
});
