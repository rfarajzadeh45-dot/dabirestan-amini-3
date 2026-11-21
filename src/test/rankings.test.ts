import { describe, expect, it } from "vitest";
import { academicRanking, attendanceRanking, improvementRanking, classRankings } from "@/lib/rankings";
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
    expect(r[0]?.student.id).toBe("b");
    expect(r[1]?.pct).toBe(50);
  });
  it("measures improvement from 12 to 17 as +5", () => {
    const g = [12, 12, 17, 17].map((score, i) => ({ student_id: "a", score, date: `2026-10-0${i + 1}` }));
    expect(improvementRanking([st("a")], g)[0]?.improvement).toBe(5);
  });
  it("skips students without enough grade history", () => {
    const g = [10, 18].map((score, i) => ({ student_id: "a", score, date: `2026-10-0${i + 1}` }));
    expect(improvementRanking([st("a")], g)).toEqual([]);
  });
});

describe("comparison between existing classes", () => {
  const classes = [{ id: "c1", name: "اول", sort_order: 1 }, { id: "c2", name: "دوم", sort_order: 2 }, { id: "c3", name: "سوم", sort_order: 3 }];
  const students = [{ ...st("a"), class_id: "c1" }, { ...st("b"), class_id: "c1" }, { ...st("c"), class_id: "c2" }];
  it("compares classes by equally weighted student averages rather than class size or grade count", () => {
    const grades = [20, 20, 20].map((score) => ({ student_id: "a", score, date: "2026-11-01" }));
    grades.push({ student_id: "b", score: 10, date: "2026-11-01" }, { student_id: "c", score: 16, date: "2026-11-01" });
    const result = classRankings(classes, students, grades, []);
    expect(result[0]?.cls.id).toBe("c2");
    expect(result.find((r) => r.cls.id === "c1")?.avg).toBe(15);
    expect(result.find((r) => r.cls.id === "c1")?.rank).toBe(2);
  });
  it("does not count another class's school days in attendance", () => {
    const rows = [
      { student_id: "a", date: "2026-11-01", status: "present" as const },
      { student_id: "b", date: "2026-11-01", status: "late" as const },
      { student_id: "c", date: "2026-11-02", status: "present" as const },
      { student_id: "c", date: "2026-11-03", status: "absent" as const },
    ];
    const result = classRankings(classes, students, [], rows);
    expect(result.find((r) => r.cls.id === "c1")?.attendancePct).toBe(100);
    expect(result.find((r) => r.cls.id === "c2")?.attendancePct).toBe(50);
    expect(result.find((r) => r.cls.id === "c1")?.attendanceRank).toBe(1);
  });
  it("leaves classes without grades or attendance unranked and excludes inaccessible records", () => {
    const result = classRankings(classes.slice(0, 1), students, [{ student_id: "c", score: 20, date: "2026-11-01" }], []);
    expect(result).toHaveLength(1);
    expect(result[0]?.avg).toBeNull();
    expect(result[0]?.rank).toBeNull();
    expect(result[0]?.attendanceRank).toBeNull();
  });
});
