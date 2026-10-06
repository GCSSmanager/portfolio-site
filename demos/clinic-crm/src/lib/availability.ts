import { SLOT_MIN } from "./time";

export interface Interval {
  startMin: number;
  endMin: number;
  lunchStartMin?: number | null;
  lunchEndMin?: number | null;
}

export function overlaps(a: Interval, b: Interval) {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

export function isSlotBusy(min: number, busy: Interval[]) {
  return busy.some((b) => min >= b.startMin && min < b.endMin);
}

function lunchInterval(shift: Interval): Interval | null {
  if (shift.lunchStartMin == null || shift.lunchEndMin == null) return null;
  if (shift.lunchEndMin <= shift.lunchStartMin) return null;
  return { startMin: shift.lunchStartMin, endMin: shift.lunchEndMin };
}

export function freeWindows(shift: Interval, busy: Interval[], durationMin: number): Interval[] {
  const lunch = lunchInterval(shift);
  const blocks = lunch ? [...busy, lunch] : busy;
  const free: Interval[] = [];
  for (let start = shift.startMin; start + durationMin <= shift.endMin; start += SLOT_MIN) {
    const end = start + durationMin;
    if (!blocks.some((b) => overlaps({ startMin: start, endMin: end }, b))) {
      free.push({ startMin: start, endMin: end });
    }
  }
  return free;
}

/** Слоты (старт в минутах), куда помещается услуга. */
export function freeSlotStarts(shift: Interval, busy: Interval[], durationMin: number): Set<number> {
  const starts = new Set<number>();
  for (const w of freeWindows(shift, busy, durationMin)) {
    for (let m = w.startMin; m + durationMin <= w.endMin; m += SLOT_MIN) {
      starts.add(m);
    }
  }
  return starts;
}

export function slotInInterval(min: number, interval: Interval) {
  return min >= interval.startMin && min < interval.endMin;
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.startMin - b.startMin);
  const merged: Interval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = merged[merged.length - 1];
    if (cur.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, cur.endMin);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Свободные промежутки в смене между занятостью и обедом. */
export function freeGapsInShift(shift: Interval, busy: Interval[]): Interval[] {
  const lunch = lunchInterval(shift);
  const blocks = mergeIntervals(
    [...busy, ...(lunch ? [lunch] : [])]
      .map((b) => ({
        startMin: Math.max(b.startMin, shift.startMin),
        endMin: Math.min(b.endMin, shift.endMin),
      }))
      .filter((b) => b.endMin > b.startMin),
  );

  const gaps: Interval[] = [];
  let cursor = shift.startMin;
  for (const b of blocks) {
    if (b.startMin > cursor) gaps.push({ startMin: cursor, endMin: b.startMin });
    cursor = Math.max(cursor, b.endMin);
  }
  if (cursor < shift.endMin) gaps.push({ startMin: cursor, endMin: shift.endMin });
  return gaps.filter((g) => g.endMin - g.startMin >= SLOT_MIN);
}

/** Свободные окна, но короче длительности услуги. */
export function tooShortGaps(shift: Interval, busy: Interval[], durationMin: number): Interval[] {
  return freeGapsInShift(shift, busy).filter((g) => g.endMin - g.startMin < durationMin);
}
