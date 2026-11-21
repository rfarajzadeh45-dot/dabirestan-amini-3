import { average } from "@/lib/fa";

export type RStudent = { id: string; first_name: string; last_name: string; student_code: string };
export type RGrade = { student_id: string; score: number; date: string };
export type RAttendance = { student_id: string; date: string; status: "present" | "absent" | "late" };

export type RClass = { id: string; name: string; sort_order: number };
export type ClassStudent = RStudent & { class_id: string };

/** Give each graded student equal weight; attendance uses each class's own recorded school days. */
export function classRankings(classes: RClass[], students: ClassStudent[], grades: RGrade[], attendance: RAttendance[]) {
  const summaries = classes.map((cls) => {
    const members = students.filter((s) => s.class_id === cls.id);
    const ids = new Set(members.map((s) => s.id));
    const academic = academicRanking(members, grades.filter((g) => ids.has(g.student_id)));
    const presence = attendanceRanking(members, attendance.filter((a) => ids.has(a.student_id)));
    return {
      cls, studentCount: members.length, gradedCount: academic.length,
      avg: average(academic.map((r) => r.avg)),
      attendancePct: average(presence.map((r) => r.pct)),
      days: presence[0]?.days ?? 0,
    };
  });
  const academicOrder = [...summaries].filter((r) => r.avg !== null)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0) || a.cls.sort_order - b.cls.sort_order || a.cls.id.localeCompare(b.cls.id));
  const attendanceOrder = [...summaries].filter((r) => r.attendancePct !== null)
    .sort((a, b) => (b.attendancePct ?? 0) - (a.attendancePct ?? 0) || a.cls.sort_order - b.cls.sort_order || a.cls.id.localeCompare(b.cls.id));
  const ranks = new Map(academicOrder.map((r, i) => [r.cls.id, i + 1]));
  const attendanceRanks = new Map(attendanceOrder.map((r, i) => [r.cls.id, i + 1]));
  return [...summaries].sort((a, b) => (ranks.get(a.cls.id) ?? Infinity) - (ranks.get(b.cls.id) ?? Infinity) || a.cls.sort_order - b.cls.sort_order)
    .map((r) => ({ ...r, rank: ranks.get(r.cls.id) ?? null, attendanceRank: attendanceRanks.get(r.cls.id) ?? null }));
}

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
      const previous = average(g.slice(0, half).map((x) => Number(x.score)));
      const current = average(g.slice(g.length - half).map((x) => Number(x.score)));
      if (previous === null || current === null) return [];
      const improvement = current - previous;
      return improvement > 0 ? [{ student: s, previous, current, improvement, history: g }] : [];
    })
    .sort((a, b) => b.improvement - a.improvement)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
