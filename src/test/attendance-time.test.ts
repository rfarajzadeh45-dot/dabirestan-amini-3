import { describe, expect, it } from "vitest";
import { attendanceTiming, durationClock, schoolTime } from "@/lib/attendance-time";

describe("Existing attendance timing", () => {
  it("counts down to 07:30 Tehran time regardless of the browser timezone", () => {
    const time = schoolTime(new Date("2026-11-11T03:59:59Z"));
    expect(time.clock).toBe("07:29:59");
    expect(time.beforeStart).toBe(true);
    expect(time.differenceSeconds).toBe(-1);
    expect(durationClock(time.differenceSeconds)).toBe("00:00:01");
  });
  it("starts elapsed timing exactly at 07:30", () => {
    const time = schoolTime(new Date("2026-11-11T04:00:00Z"));
    expect(time.beforeStart).toBe(false);
    expect(time.differenceSeconds).toBe(0);
  });
  it("registers 12 minutes late at 07:42", () => {
    expect(attendanceTiming("late", new Date("2026-11-11T04:12:00Z")))
      .toEqual({ status: "late", registered_at: "2026-11-11T04:12:00.000Z", delay_seconds: 720 });
  });
  it("registers 5 minutes late at 07:35", () => {
    expect(attendanceTiming("late", new Date("2026-11-11T04:05:00Z")).delay_seconds).toBe(300);
  });
  it("preserves exact seconds and milliseconds in the registration timestamp", () => {
    expect(attendanceTiming("late", new Date("2026-11-11T04:05:27.123Z")))
      .toEqual({ status: "late", registered_at: "2026-11-11T04:05:27.123Z", delay_seconds: 327 });
  });
  it("saves present time without automatically changing present to late", () => {
    expect(attendanceTiming("present", new Date("2026-11-11T04:12:00Z")))
      .toEqual({ status: "present", registered_at: "2026-11-11T04:12:00.000Z", delay_seconds: null });
  });
  it("keeps absent untimed", () => {
    expect(attendanceTiming("absent", new Date("2026-11-11T04:12:00Z")))
      .toEqual({ status: "absent", registered_at: null, delay_seconds: null });
  });
  it("does not save a negative delay before the start", () => {
    expect(attendanceTiming("late", new Date("2026-11-11T03:00:00Z")).delay_seconds).toBe(0);
  });
  it("uses the school date across midnight and resets the daily countdown", () => {
    const time = schoolTime(new Date("2026-11-11T20:30:00Z"));
    expect(time.date).toBe("2026-11-12");
    expect(time.beforeStart).toBe(true);
    expect(durationClock(time.differenceSeconds)).toBe("07:30:00");
  });
});