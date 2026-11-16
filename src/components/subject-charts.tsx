import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { average, faNum, jalali } from "@/lib/fa";

export type SubjectRef = { id: string; name: string };
export type GradeRow = { subject_id: string; score: number; date: string };

const PALETTE = 12;
export const subjectColor = (i: number) => `var(--subject-${(i % PALETTE) + 1})`;
const dashFor = (i: number) => (i >= PALETTE ? "6 4" : undefined);

/** One coloured line per subject over time, with a tappable legend that never truncates names. */
export function SubjectProgressChart({ subjects, grades }: { subjects: SubjectRef[]; grades: GradeRow[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const withGrades = subjects.filter((s) => grades.some((g) => g.subject_id === s.id));
  const data = useMemo(() => {
    const dates = [...new Set(grades.map((g) => g.date))].sort();
    return dates.map((d) => {
      const row: Record<string, string | number> = { date: jalali(d) };
      for (const s of withGrades) {
        const gs = grades.filter((g) => g.date === d && g.subject_id === s.id).map((g) => g.score);
        const a = average(gs);
        if (a !== null) row[s.id] = Number(a.toFixed(2));
      }
      return row;
    });
  }, [grades, withGrades]);

  if (!withGrades.length) return <p className="py-10 text-center text-sm text-muted-foreground">هنوز نمره‌ای ثبت نشده است.</p>;

  return (
    <div>
      <div className="h-72 sm:h-80" dir="ltr">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" reversed tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={16} />
            <YAxis orientation="right" domain={[0, 20]} width={28} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, direction: "rtl", fontFamily: "Vazirmatn", fontSize: 12 }}
              formatter={(v: number, key: string) => [faNum(v, 2), withGrades.find((s) => s.id === key)?.name ?? key]}
            />
            {withGrades.map((s) => {
              const i = subjects.findIndex((x) => x.id === s.id);
              return hidden.has(s.id) ? null : (
                <Line key={s.id} type="monotone" dataKey={s.id} name={s.name} stroke={subjectColor(i)} strokeDasharray={dashFor(i)}
                  strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">راهنمای رنگ‌ها — برای پنهان یا نمایش هر درس روی آن بزنید:</p>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {withGrades.map((s) => {
          const i = subjects.findIndex((x) => x.id === s.id);
          const off = hidden.has(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setHidden((h) => { const n = new Set(h); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
                className={cn("flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-right text-xs transition", off ? "opacity-40" : "hover:bg-muted")}
              >
                <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: subjectColor(i) }} />
                <span className="break-words leading-5">{s.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Full list of every subject with its average — wraps instead of clipping. */
export function SubjectAveragesList({ subjects, grades }: { subjects: SubjectRef[]; grades: GradeRow[] }) {
  if (!subjects.length) return <p className="text-sm text-muted-foreground">درسی برای این کلاس تعریف نشده است.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s, i) => {
        const gs = grades.filter((g) => g.subject_id === s.id).map((g) => g.score);
        const a = average(gs);
        return (
          <li key={s.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <span className="size-3 shrink-0 rounded-full" style={{ background: subjectColor(i) }} />
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium leading-5">{s.name}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${((a ?? 0) / 20) * 100}%`, background: subjectColor(i) }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{faNum(gs.length)} نمره</p>
            </div>
            <span className="shrink-0 text-lg font-bold tabular-nums">{a !== null ? faNum(a, 2) : "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}
