import { describe, expect, it } from "vitest";
import { academicRanking, attendanceRanking, improvementRanking } from "@/lib/rankings";
const st = (id: string) => ({ id, first_name: id, last_name: "", student_code: id });
describe("rankings", () => {
  it("ranks by overall average", () => {
    const r = academicRanking([st("a"), st("b")], [{ student_id: "a", score: 12, date: "2026-10-01" }, { student_id: "b", score: 18, date: "2026-10-01" }]);
    expect(r.map((x) => x.student.id)).toEqual(["b", "a"]);
  });
  it("does not favour students with fewer recorded days", () => {
    const rows = [
      { student_id: "a", date: "d1", status: "present" as const },
      { student_id: "b", date: "d1", status: "present" as const },
      { student_id: "b", date: "d2", status: "present" as const },
    ];
    const r = attendanceRanking([st("a"), st("b")], rows);
    expect(r[0]!.student.id).toBe("b");
    expect(r[1]!.pct).toBe(50);
  });
  it("measures improvement from 12 to 17 as +5", () => {
    const g = [12, 12, 17, 17].map((score, i) => ({ student_id: "a", score, date: `2026-10-0${i + 1}` }));
    expect(improvementRanking([st("a")], g)[0]!.improvement).toBe(5);
  });
  it("skips students without enough grade history", () => {
    const g = [10, 18].map((score, i) => ({ student_id: "a", score, date: `2026-10-0${i + 1}` }));
    expect(improvementRanking([st("a")], g)).toEqual([]);
  });
});
