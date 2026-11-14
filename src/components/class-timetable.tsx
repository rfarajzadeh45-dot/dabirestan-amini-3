import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { schoolTime } from "@/lib/attendance-time";
import { fa } from "@/lib/fa";
import { cn } from "@/lib/utils";

export const TIMETABLE_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه"];
export const TIMETABLE_PERIODS = [
  { n: 1, name: "زنگ اول", time: "07:30–09:00" },
  { n: 2, name: "زنگ دوم", time: "09:15–10:45" },
  { n: 3, name: "زنگ سوم", time: "11:00–12:30" },
  { n: 4, name: "زنگ چهارم", time: "12:45–14:15" },
];

/** Saturday = 0 … Wednesday = 4; Thursday/Friday return null. */
export function schoolDayIndex(isoDate: string): number | null {
  const [y = 1970, m = 1, d = 1] = isoDate.split("-").map(Number);
  const idx = (new Date(y, m - 1, d).getDay() + 1) % 7;
  return idx <= 4 ? idx : null;
}

type Cell = { day: number; period: number; subject: string; teacher: string };

export function ClassTimetable({ classId }: { classId: string }) {
  const today = schoolDayIndex(schoolTime(new Date()).date);
  const [view, setView] = useState<"weekly" | "daily">("weekly");
  const [day, setDay] = useState(today ?? 0);

  const { data } = useQuery({
    queryKey: ["class-timetable", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("class_timetable").select("day,period,subject,teacher").eq("class_id", classId);
      if (error) throw error;
      return data as Cell[];
    },
  });
  const grid = useMemo(() => {
    const m = new Map<string, Cell>();
    data?.forEach((c) => m.set(`${c.day}-${c.period}`, c));
    return m;
  }, [data]);

  return (
    <section aria-label="برنامه هفتگی کلاس" className="mb-6 rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold"><CalendarDays className="size-5 text-primary" />برنامه درسی هفتگی</h2>
        <div role="tablist" className="inline-flex rounded-lg border p-0.5 text-xs">
          {(["weekly", "daily"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={cn("rounded-md px-3 py-1.5 transition-colors", view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {v === "weekly" ? "نمای هفتگی" : "نمای روزانه"}
            </button>
          ))}
        </div>
      </div>

      {data && data.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">برنامه‌ای برای این کلاس ثبت نشده است.</p>}

      {data && data.length > 0 && view === "weekly" && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-center text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="rounded-tr-lg p-2 text-xs font-medium">روز</th>
                {TIMETABLE_PERIODS.map((p, i) => (
                  <th key={p.n} className={cn("p-2 font-medium", i === 3 && "rounded-tl-lg")}>
                    <span className="block">{p.name}</span>
                    <span dir="ltr" className="block text-[11px] opacity-75 tabular-nums">{fa(p.time)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIMETABLE_DAYS.map((d, di) => (
                <tr key={d} className={cn("border-b last:border-0", di === today && "bg-primary-soft")}>
                  <th className="whitespace-nowrap p-2 text-sm font-semibold">
                    {d}{di === today && <span className="mr-1 text-[10px] font-normal text-primary">(امروز)</span>}
                  </th>
                  {TIMETABLE_PERIODS.map((p) => {
                    const c = grid.get(`${di}-${p.n}`);
                    return (
                      <td key={p.n} className="border-r p-2">
                        <p className="font-medium">{c?.subject ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{c?.teacher}</p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.length > 0 && view === "daily" && (
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {TIMETABLE_DAYS.map((d, di) => (
              <button key={d} onClick={() => setDay(di)}
                className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", day === di ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {d}{di === today ? " · امروز" : ""}
              </button>
            ))}
          </div>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {TIMETABLE_PERIODS.map((p) => {
              const c = grid.get(`${day}-${p.n}`);
              return (
                <li key={p.n} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{p.name}</span><span dir="ltr" className="tabular-nums">{fa(p.time)}</span>
                  </div>
                  <p className="mt-2 font-semibold">{c?.subject ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">دبیر: {c?.teacher || "—"}</p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
