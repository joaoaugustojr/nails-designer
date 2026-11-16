export type DaySpan = { startMinute: number; endMinute: number };

export type TimelineItem<Booking extends DaySpan, Block extends DaySpan> =
  | ({ kind: "booking" } & Booking)
  | ({ kind: "blocked" } & Block)
  | ({ kind: "free" } & DaySpan)
  | ({ kind: "break" } & DaySpan);

const overlaps = (first: DaySpan, second: DaySpan) =>
  first.startMinute < second.endMinute && second.startMinute < first.endMinute;

function freeSpans(range: DaySpan, busy: DaySpan[]) {
  const spans: DaySpan[] = [];
  let cursor = range.startMinute;
  for (const event of busy) {
    if (!overlaps(event, range)) continue;
    if (event.startMinute > cursor)
      spans.push({ startMinute: cursor, endMinute: event.startMinute });
    cursor = Math.max(cursor, event.endMinute);
  }
  if (cursor < range.endMinute) spans.push({ startMinute: cursor, endMinute: range.endMinute });
  return spans;
}

/**
 * The owner's day as one ordered list: bookings and blocks as they are, the free time
 * left inside working hours, and the breaks between working ranges (e.g. lunch).
 */
export function buildDayTimeline<Booking extends DaySpan, Block extends DaySpan>(
  workingRanges: DaySpan[],
  bookings: Booking[],
  blocks: Block[],
): TimelineItem<Booking, Block>[] {
  const busy = [...bookings, ...blocks].sort(
    (first, second) => first.startMinute - second.startMinute,
  );
  const ranges = [...workingRanges].sort((first, second) => first.startMinute - second.startMinute);

  const free = ranges.flatMap((range) => freeSpans(range, busy));
  const breaks = ranges
    .slice(1)
    .map((range, index) => ({
      startMinute: ranges[index]!.endMinute,
      endMinute: range.startMinute,
    }))
    .filter(
      (gap) => gap.startMinute < gap.endMinute && !busy.some((event) => overlaps(event, gap)),
    );

  const items: TimelineItem<Booking, Block>[] = [
    ...bookings.map((booking) => ({ kind: "booking" as const, ...booking })),
    ...blocks.map((block) => ({ kind: "blocked" as const, ...block })),
    ...free.map((span) => ({ kind: "free" as const, ...span })),
    ...breaks.map((span) => ({ kind: "break" as const, ...span })),
  ];
  return items.sort((first, second) => first.startMinute - second.startMinute);
}
