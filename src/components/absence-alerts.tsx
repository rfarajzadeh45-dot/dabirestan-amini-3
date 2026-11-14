import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { fetchAll } from "@/lib/fetch-all";
import { supabase } from "@/integrations/supabase/client";
import { faNum, shiftDate, todayISO } from "@/lib/fa";

export const ABSENCE_ALERT_DAYS = 30;
export const ABSENCE_ALERT_MIN = 3;

type Row = { status: string; students: { id: string; first_name: string; last_name: string; classes: { name: string } | null } | null };

/** Students with at least `min` absences in the given rows, most absences first. */
export function absenceAlerts(rows: Row[], min = ABSENCE_ALERT_MIN) {
  const map = new Map<string, { id: string; name: string; className: string; absent: number; late: number }>();
  for (const r of rows) {
    if (!r.students || (r.status !== "absent" && r.status !== "late")) continue;
    const s = r.students;
    const e = map.get(s.id) ?? { id: s.id, name: `${s.first_name} ${s.last_name}`, className: s.classes?.name ?? "", absent: 0, late: 0 };
    if (r.status === "absent") e.absent++;
    else e.late++;
    map.set(s.id, e);
  }
  return [...map.values()].filter((e) => e.absent >= min).sort((a, b) => b.absent - a.absent || b.late - a.late);
}

export function AbsenceAlerts() {
  const today = todayISO();
  const from = shiftDate(today, -(ABSENCE_ALERT_DAYS - 1));
  const { data } = useQuery({
    queryKey: ["absence-alerts", from],
    queryFn: async () => {
      const { data, error } = await fetchAll((f, t) =>
        supabase
          .from("attendance")
          .select("status,students(id,first_name,last_name,classes(name))")
          .gte("date", from)
          .lte("date", today)
          .in("status", ["absent", "late"])
          .order("id")
          .range(f, t),
      );
      if (error) throw error;
      return absenceAlerts(data as unknown as Row[]);
    },
  });

  return (
    <section className="animate-rise rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="size-4 text-destructive" />
        <h2 className="font-semibold">هشدار غیبت</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        دانش‌آموزان با {faNum(ABSENCE_ALERT_MIN)} غیبت یا بیشتر در {faNum(ABSENCE_ALERT_DAYS)} روز اخیر
      </p>
      <ul className="max-h-80 space-y-1 overflow-y-auto">
        {data?.map((s, i) => (
          <li key={s.id} className="animate-rise" style={{ animationDelay: `${i * 30}ms` }}>
            <Link
              to="/students/$studentId"
              params={{ studentId: s.id }}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">کلاس {s.className}{s.late ? ` · ${faNum(s.late)} تأخیر` : ""}</p>
              </div>
              <span className={`shrink-0 rounded-full bg-destructive-soft px-2.5 py-1 text-xs font-bold text-destructive ${i < 3 ? "animate-pulse-soft" : ""}`}>
                {faNum(s.absent)} غیبت
              </span>
            </Link>
          </li>
        ))}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">هیچ دانش‌آموزی به حد هشدار نرسیده است. 🎉</p>}
      </ul>
    </section>
  );
}
