import { describe, expect, it } from "vitest";
import { schoolDayIndex } from "@/components/class-timetable";

describe("schoolDayIndex", () => {
  it("Saturday is day 0", () => expect(schoolDayIndex("2026-11-14")).toBe(0));
  it("Wednesday is day 4", () => expect(schoolDayIndex("2026-11-18")).toBe(4));
  it("Thursday and Friday have no lessons", () => {
    expect(schoolDayIndex("2026-11-19")).toBeNull();
    expect(schoolDayIndex("2026-11-20")).toBeNull();
  });
});
