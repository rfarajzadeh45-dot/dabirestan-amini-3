import { fetchAll } from "@/lib/fetch-all";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, type AttendanceStatus } from "@/lib/fa";

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function toCsv(rows: unknown[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const jal = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso + "T12:00"));

/** Builds an Excel-compatible CSV of attendance between two ISO dates (optionally one class). */
export async function buildAttendanceCsv(from: string, to: string, classId?: string): Promise<Blob> {
  const { data, error } = await fetchAll((f, t) => {
    let q = supabase
      .from("attendance")
      .select("date,status,delay_seconds,students!inner(first_name,last_name,student_code,class_id,classes(name))")
      .gte("date", from)
      .lte("date", to);
    if (classId) q = q.eq("students.class_id", classId);
    return q.order("date").order("id").range(f, t);
  });
  if (error) throw error;
  const rows: unknown[][] = [["تاریخ", "کلاس", "شماره دانش‌آموزی", "نام", "نام خانوادگی", "وضعیت", "تأخیر (دقیقه)"]];
  for (const r of data ?? []) {
    const s = r.students as unknown as { first_name: string; last_name: string; student_code: string; classes: { name: string } | null };
    rows.push([
      jal(r.date),
      s.classes?.name ?? "",
      s.student_code,
      s.first_name,
      s.last_name,
      statusLabel[r.status as AttendanceStatus],
      r.delay_seconds ? Math.round(r.delay_seconds / 60) : "",
    ]);
  }
  return new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
}
