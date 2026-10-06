import type { CSSProperties } from "react";
import { DAY_END, DAY_START, SLOT_MIN } from "../time";

export const ROW_H = 36;
export const TIME_W = 52;
export const BLOCK_GAP = 2;

export function topPx(min: number) {
  return ((min - DAY_START) / SLOT_MIN) * ROW_H;
}

export function heightPx(startMin: number, endMin: number) {
  return ((endMin - startMin) / SLOT_MIN) * ROW_H;
}

export function rangeTopPx(min: number, rangeStart = DAY_START) {
  return ((min - rangeStart) / SLOT_MIN) * ROW_H;
}

export function rangeHeightPx(startMin: number, endMin: number) {
  return ((endMin - startMin) / SLOT_MIN) * ROW_H;
}

export function gridHeight(startMin = DAY_START, endMin = DAY_END) {
  return ((endMin - startMin) / SLOT_MIN) * ROW_H;
}

export function hoursInDay(startMin = DAY_START, endMin = DAY_END) {
  const hours: number[] = [];
  const firstHour = Math.ceil(startMin / 60) * 60;
  if (startMin < firstHour) hours.push(startMin);
  for (let min = firstHour; min < endMin; min += 60) hours.push(min);
  return hours;
}

export function timedBlockStyle(startMin: number, endMin: number, inset = BLOCK_GAP, rangeStart = DAY_START): CSSProperties {
  return {
    top: rangeTopPx(startMin, rangeStart) + inset,
    height: Math.max(heightPx(startMin, endMin) - inset * 2, ROW_H - inset * 2),
  };
}

export function lineStyle(min: number, rangeStart = DAY_START): CSSProperties {
  return { top: rangeTopPx(min, rangeStart), height: 0 };
}

export const COL_W = 36;
/** Компактная ось дней в расписании клиента. */
export const DAY_LABEL_W = 52;
export const CLIENT_ROW_H = 64;
export const CLIENT_TIME_HEADER_H = 36;

export function rangeLeftPx(min: number, rangeStart = DAY_START, colWidth = COL_W) {
  return ((min - rangeStart) / SLOT_MIN) * colWidth;
}

export function rangeWidthPx(startMin: number, endMin: number, colWidth = COL_W) {
  return ((endMin - startMin) / SLOT_MIN) * colWidth;
}

export function gridWidth(startMin = DAY_START, endMin = DAY_END, colWidth = COL_W) {
  return ((endMin - startMin) / SLOT_MIN) * colWidth;
}

export function hoursAcross(startMin = DAY_START, endMin = DAY_END) {
  const hours: number[] = [];
  const firstHour = Math.ceil(startMin / 60) * 60;
  if (startMin < firstHour) hours.push(startMin);
  for (let min = firstHour; min < endMin; min += 60) hours.push(min);
  return hours;
}

export function timedBlockStyleH(
  startMin: number,
  endMin: number,
  inset = BLOCK_GAP,
  rangeStart = DAY_START,
  colWidth = COL_W,
): CSSProperties {
  return {
    left: rangeLeftPx(startMin, rangeStart, colWidth) + inset,
    width: Math.max(rangeWidthPx(startMin, endMin, colWidth) - inset * 2, colWidth - inset * 2),
  };
}

export function verticalLineStyle(min: number, rangeStart = DAY_START, colWidth = COL_W): CSSProperties {
  return { left: rangeLeftPx(min, rangeStart, colWidth), width: 0 };
}
