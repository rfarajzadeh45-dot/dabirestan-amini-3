import type { AttendanceStatus } from "@/lib/fa";

export const SCHOOL_TIME_ZONE = "Asia/Tehran";
export const SCHOOL_START_SECONDS = 7 * 3600 + 30 * 60;

export type AttendanceTiming = {
  status: AttendanceStatus;
  registered_at: string | null;
  delay_seconds: number | null;
};

export function schoolTime(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === name)?.value ?? "00";
  const clock = `${part("hour")}:${part("minute")}:${part("second")}`;
  const seconds = Number(part("hour")) * 3600 + Number(part("minute")) * 60 + Number(part("second"));
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    clock,
    beforeStart: seconds < SCHOOL_START_SECONDS,
    differenceSeconds: seconds - SCHOOL_START_SECONDS,
  };
}

export function durationClock(seconds: number) {
  const total = Math.abs(seconds);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map((n) => String(n).padStart(2, "0")).join(":");
}

export function attendanceTiming(status: AttendanceStatus, now: Date): AttendanceTiming {
  return {
    status,
    registered_at: status === "absent" ? null : now.toISOString(),
    delay_seconds: status === "late" ? periodLateSeconds(schoolSeconds(now)) : null,
  };
}
export type SchoolPeriod = { name: string; kind: "class" | "break"; start: number; end: number };
const hm = (h: number, m: number) => h * 3600 + m * 60;
export const SCHOOL_PERIODS: SchoolPeriod[] = [
  { name: "زنگ اول", kind: "class", start: hm(7, 30), end: hm(9, 0) },
  { name: "زنگ تفریح", kind: "break", start: hm(9, 0), end: hm(9, 30) },
  { name: "زنگ دوم", kind: "class", start: hm(9, 30), end: hm(10, 45) },
  { name: "تفریح کوتاه", kind: "break", start: hm(10, 45), end: hm(11, 0) },
  { name: "زنگ سوم", kind: "class", start: hm(11, 0), end: hm(12, 30) },
  { name: "زنگ تفریح", kind: "break", start: hm(12, 30), end: hm(12, 45) },
  { name: "زنگ چهارم", kind: "class", start: hm(12, 45), end: hm(14, 15) },
];
export const periodClock = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}`;

/** Seconds since school-timezone midnight. */
export function schoolSeconds(now: Date) {
  return schoolTime(now).differenceSeconds + SCHOOL_START_SECONDS;
}

/** Lateness relative to the start of the active class period; 0 before school or during breaks. After school ends, relative to the last class start. */
export function periodLateSeconds(seconds: number) {
  const current = SCHOOL_PERIODS.find((p) => seconds >= p.start && seconds < p.end);
  if (current) return current.kind === "class" ? seconds - current.start : 0;
  const last = SCHOOL_PERIODS[SCHOOL_PERIODS.length - 1]!;
  return seconds >= last.end ? seconds - SCHOOL_PERIODS.filter((p) => p.kind === "class").at(-1)!.start : 0;
}

export function periodStatus(seconds: number) {
  const index = SCHOOL_PERIODS.findIndex((p) => seconds >= p.start && seconds < p.end);
  const current = index >= 0 ? SCHOOL_PERIODS[index]! : null;
  const nextIndex = current ? index + 1 : SCHOOL_PERIODS.findIndex((p) => p.start > seconds);
  const next = nextIndex >= 0 ? SCHOOL_PERIODS[nextIndex] ?? null : null;
  const first = SCHOOL_PERIODS[0]!;
  return {
    index,
    current,
    next,
    phase: current ? current.kind : seconds < first.start ? ("before" as const) : ("after" as const),
    remainingSeconds: current ? current.end - seconds : next ? next.start - seconds : 86400 - seconds + first.start,
    progress: current ? (seconds - current.start) / (current.end - current.start) : 0,
  };
}
