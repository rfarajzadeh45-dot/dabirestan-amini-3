import { average } from "@/lib/fa";

export type RStudent = { id: string; first_name: string; last_name: string; student_code: string };
export type RGrade = { student_id: string; score: number; date: string };
export type RAttendance = { student_id: string; date: string; status: "present" | "absent" | "late" };

export function academicRanking(students: RStudent[], grades: RGrade[]) {
  return students
    .map((s) => {
      const g = grades.filter((x) => x.student_id === s.id);
      return { student: s, avg: average(g.map((x) => Number(x.score))), count: g.length };
    })
    .filter((r): r is typeof r & { avg: number } => r.avg !== null)
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** All students are compared over the same set of class school days (days with any record for the class). Missing records count as not present. */
export function attendanceRanking(students: RStudent[], rows: RAttendance[]) {
  const days = new Set(rows.map((r) => r.date)).size;
  if (!days) return [];
  return students
    .map((s) => {
      const mine = rows.filter((r) => r.student_id === s.id);
      const present = mine.filter((r) => r.status === "present").length;
      const late = mine.filter((r) => r.status === "late").length;
      const absent = mine.filter((r) => r.status === "absent").length;
      return { student: s, present, late, absent, days, pct: ((present + late) / days) * 100 };
    })
    .sort((a, b) => b.pct - a.pct || a.absent - b.absent || a.late - b.late || b.present - a.present)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export const MIN_GRADES_FOR_IMPROVEMENT = 4;

/** Splits each student's grades chronologically into an earlier and a recent half; needs at least 4 grades. Only positive improvements rank. */
export function improvementRanking(students: RStudent[], grades: RGrade[]) {
  return students
    .flatMap((s) => {
      const g = grades.filter((x) => x.student_id === s.id).sort((a, b) => a.date.localeCompare(b.date));
      if (g.length < MIN_GRADES_FOR_IMPROVEMENT) return [];
      const half = Math.floor(g.length / 2);
      const previous = average(g.slice(0, half).map((x) => Number(x.score)))!;
      const current = average(g.slice(g.length - half).map((x) => Number(x.score)))!;
      const improvement = current - previous;
      return improvement > 0 ? [{ student: s, previous, current, improvement, history: g }] : [];
    })
    .sort((a, b) => b.improvement - a.improvement)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
