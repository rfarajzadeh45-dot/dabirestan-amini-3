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
    delay_seconds: status === "late" ? Math.max(0, schoolTime(now).differenceSeconds) : null,
  };
}