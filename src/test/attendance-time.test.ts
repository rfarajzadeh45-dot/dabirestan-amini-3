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
import { periodLateSeconds, periodStatus } from "@/lib/attendance-time";
const at = (h: number, m: number) => h * 3600 + m * 60;
describe("Period-based lateness", () => {
  it("07:45 is 15 minutes late for first class", () => expect(periodLateSeconds(at(7, 45))).toBe(900));
  it("10:00 is 30 minutes late for second class", () => expect(periodLateSeconds(at(10, 0))).toBe(1800));
  it("11:10 is 10 minutes late for third class", () => expect(periodLateSeconds(at(11, 10))).toBe(600));
  it("12:50 is 5 minutes late for fourth class", () => expect(periodLateSeconds(at(12, 50))).toBe(300));
  it("break time does not count as lateness", () => expect(periodLateSeconds(at(9, 15))).toBe(0));
  it("saves 30 minutes for a Late click at 10:00 Tehran", () =>
    expect(attendanceTiming("late", new Date("2026-11-11T06:30:00Z")).delay_seconds).toBe(1800));
});
describe("Timetable transitions", () => {
  it("switches from first class to break at 09:00", () => {
    expect(periodStatus(at(9, 0) - 1).current?.name).toBe("زنگ اول");
    const s = periodStatus(at(9, 0));
    expect(s.phase).toBe("break");
    expect(s.next?.name).toBe("زنگ دوم");
    expect(s.remainingSeconds).toBe(1800);
  });
  it("shows progress through the current period", () => expect(periodStatus(at(8, 15)).progress).toBe(0.5));
  it("counts down to first class before school", () => {
    const s = periodStatus(at(7, 0));
    expect(s.phase).toBe("before");
    expect(s.remainingSeconds).toBe(1800);
  });
  it("ends the day at 14:15", () => expect(periodStatus(at(14, 15)).phase).toBe("after"));
});
