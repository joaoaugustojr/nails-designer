import { z } from "zod";

import { MINUTES_PER_DAY } from "../utils/time";

export const MAX_RANGES_PER_DAY = 4;
export const DEFAULT_RANGE = { startMinute: 9 * 60, endMinute: 18 * 60 };

// Monday first, as the week is shown in Brazil; values follow Date#getDay (0 = Sunday).
export const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
] as const;

const MAX_RULE_MINUTES = 7 * MINUTES_PER_DAY;

export const GAP_OPTIONS = [0, 10, 15, 20, 30];
export const MIN_NOTICE_OPTIONS = [0, 30, 60, 120, 240, 720, 1440];
export const MAX_DAYS_AHEAD_OPTIONS = [7, 15, 30, 60, 90];
export const CANCEL_DEADLINE_OPTIONS = [60, 120, 720, 1440, 2880, 4320, 5760, 7200, 8640, 10080];

const minuteOfDay = z.number().int().min(0).max(MINUTES_PER_DAY);

export const timeRangeSchema = z
  .object({ startMinute: minuteOfDay, endMinute: minuteOfDay })
  .refine((range) => range.startMinute < range.endMinute, "Range ends before it starts");

export const dayRangesSchema = z.object({
  ranges: z
    .array(timeRangeSchema)
    .max(MAX_RANGES_PER_DAY)
    .refine(
      (ranges) =>
        ranges.every(
          (range, index) => index === 0 || ranges[index - 1]!.endMinute <= range.startMinute,
        ),
      "Ranges must be in order and must not overlap",
    ),
});

export const weekdayParamsSchema = z.object({ weekday: z.coerce.number().int().min(0).max(6) });

export const rulesSchema = z
  .object({
    gapMinutes: z.number().int().min(0).max(120),
    minNoticeMinutes: z.number().int().min(0).max(MAX_RULE_MINUTES),
    maxDaysAhead: z.number().int().min(1).max(365),
    clientCanCancel: z.boolean(),
    cancelDeadlineMinutes: z.number().int().min(0).max(MAX_RULE_MINUTES),
  })
  .partial()
  .refine((rules) => Object.keys(rules).length > 0, "No changes");

const isoDate = z.iso.date();

export const timeOffSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    // Both null: whole days.
    startMinute: minuteOfDay.nullable(),
    endMinute: minuteOfDay.nullable(),
    reason: z.string().trim().max(120),
  })
  .refine(
    (timeOff) => (timeOff.startMinute === null) === (timeOff.endMinute === null),
    "Give both times or none",
  );

export type TimeRange = z.infer<typeof timeRangeSchema>;
export type RulesChanges = z.infer<typeof rulesSchema>;
export type TimeOffInput = z.infer<typeof timeOffSchema>;
