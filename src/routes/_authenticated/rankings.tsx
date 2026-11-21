import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Medal, Minus, Trophy } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { fetchAll } from "@/lib/fetch-all";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { fa, faNum, fullName, shiftDate } from "@/lib/fa";
import { schoolTime } from "@/lib/attendance-time";
import { academicRanking, attendanceRanking, improvementRanking, classRankings, type RAttendance, type RGrade, type ClassStudent } from "@/lib/rankings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rankings")({
  head: () => ({
    meta: [
      { title: "رتبه‌بندی دانش‌آموزان و کلاس‌ها | سامانه مدیریت مدرسه" },
      { name: "description", content: "برترین دانش‌آموزان و مقایسه معدل و حضور کلاس‌های مدرسه" },
      { property: "og:title", content: "رتبه‌بندی دانش‌آموزان و کلاس‌ها | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "برترین دانش‌آموزان و مقایسه معدل و حضور کلاس‌های مدرسه" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Rankings,
});

type Range = "week" | "month" | "year";
const rangeLabel: Record<Range, string> = { week: "هفتگی", month: "ماهانه", year: "سالانه" };

function Rankings() {
  const today = schoolTime(new Date()).date;
  const [range, setRange] = useState<Range>("month");
  const [classId, setClassId] = useState<string>("");
  const [scope, setScope] = useState<"students" | "classes">("students");
  const start = range === "week" ? shiftDate(today, -6) : range === "month" ? shiftDate(today, -29) : null;
  const prevCut = start ?? shiftDate(today, -29);

  const { data: classes, error: classesError, refetch: reloadClasses } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id,name,sort_order").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => { if (!classId && classes?.[0]) setClassId(classes[0].id); }, [classes, classId]);
  const cls = classes?.find((c) => c.id === classId);

  const { data, error, refetch } = useQuery({
    queryKey: ["rankings", scope, scope === "classes" ? "all-accessible" : classId, start, today],
    enabled: scope === "classes" ? !!classes?.length : !!classId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const s = await fetchAll((f, t) => {
        const query = supabase.from("students").select("id,first_name,last_name,student_code,class_id").order("id").range(f, t);
        return scope === "classes" ? query : query.eq("class_id", classId);
      });
      if (s.error) throw s.error;
      const ids = (s.data ?? []).map((x) => x.id);
      const [g, a] = ids.length ? await Promise.all([
        fetchAll((f, t) => {
          const query = supabase.from("grades").select("id,student_id,score,date").in("student_id", ids).lte("date", today).order("id").range(f, t);
          return scope === "classes" && start ? query.gte("date", start) : query;
        }),
        fetchAll((f, t) => {
          const query = supabase.from("attendance").select("id,student_id,date,status").in("student_id", ids).lte("date", today).order("id").range(f, t);
          return start ? query.gte("date", start) : query;
        }),
      ]) : [{ data: [], error: null }, { data: [], error: null }];
      for (const r of [g, a]) if (r.error) throw r.error;
      return {
        students: (s.data ?? []) as ClassStudent[],
        grades: (g.data ?? []).map((x) => ({ student_id: x.student_id, score: Number(x.score), date: x.date })) as RGrade[],
        attendance: (a.data ?? []).map((x) => ({ student_id: x.student_id, date: x.date, status: x.status })) as RAttendance[],
      };
    },
  });

  const result = useMemo(() => {
    if (!data) return null;
    const inRange = <T extends { date: string }>(rows: T[]) => rows.filter((r) => (!start || r.date >= start) && r.date <= today);
    const grades = inRange(data.grades);
    const academic = academicRanking(data.students, grades);
    const previous = academicRanking(data.students, data.grades.filter((g) => g.date < prevCut));
    const prevMap = new Map(previous.map((p) => [p.student.id, p]));
    return {
      academic: academic.map((r) => ({ ...r, prev: prevMap.get(r.student.id) })),
      attendance: attendanceRanking(data.students, inRange(data.attendance)),
      improved: improvementRanking(data.students, grades),
      classes: classRankings(classes ?? [], data.students, grades, inRange(data.attendance)),
    };
  }, [data, classes, start, today, prevCut]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="رتبه‌بندی دانش‌آموزان" />
      <ToggleGroup className="mb-4 justify-start" type="single" value={scope} onValueChange={(v) => { if (v === "students" || v === "classes") setScope(v); }} variant="outline" aria-label="نوع رتبه‌بندی">
        <ToggleGroupItem value="students">دانش‌آموزان</ToggleGroupItem>
        <ToggleGroupItem value="classes">مقایسه کلاس‌ها</ToggleGroupItem>
      </ToggleGroup>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {scope === "students" && <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-44" aria-label="انتخاب کلاس"><SelectValue placeholder="انتخاب کلاس" /></SelectTrigger>
          <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>کلاس {c.name}</SelectItem>)}</SelectContent>
        </Select>}
        <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as Range)} variant="outline">
          {(Object.keys(rangeLabel) as Range[]).map((r) => <ToggleGroupItem key={r} value={r}>{rangeLabel[r]}</ToggleGroupItem>)}
        </ToggleGroup>
      </div>

      {error || classesError ? <div role="alert" className="flex flex-wrap items-center gap-3 py-6 text-sm text-destructive">
        دریافت رتبه‌بندی ناموفق بود.
        <Button variant="outline" onClick={() => { void refetch(); void reloadClasses(); }}>تلاش دوباره</Button>
      </div> : classes?.length === 0 ? <p className="py-6 text-sm text-muted-foreground">کلاسی برای حساب شما در دسترس نیست.</p> : scope === "classes" ? (
        <ClassComparison rows={result?.classes} />
      ) : <Tabs defaultValue="academic" dir="rtl">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="academic">برترین‌های درسی</TabsTrigger>
          <TabsTrigger value="attendance">برترین‌های حضور</TabsTrigger>
          <TabsTrigger value="improved">بیشترین پیشرفت</TabsTrigger>
        </TabsList>

        <TabsContent value="academic">
          <Board
            empty="در این بازه نمره‌ای ثبت نشده است."
            rows={result?.academic.slice(0, 10).map((r) => ({
              id: r.student.id, rank: r.rank, name: fullName(r.student), className: cls?.name ?? "",
              main: faNum(r.avg, 2), mainLabel: "معدل کل",
              extra: (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {r.prev ? <>رتبه قبلی {faNum(r.prev.rank)} <Trend v={r.prev.rank - r.rank} /> · روند معدل <Trend v={r.avg - r.prev.avg} digits={2} /></> : "سابقه قبلی موجود نیست"}
                </span>
              ),
            }))}
          />
        </TabsContent>
        <TabsContent value="attendance">
          <Board
            empty="در این بازه حضور و غیابی ثبت نشده است."
            rows={result?.attendance.slice(0, 10).map((r) => ({
              id: r.student.id, rank: r.rank, name: fullName(r.student), className: cls?.name ?? "",
              main: `${faNum(r.pct, 1)}٪`, mainLabel: `از ${faNum(r.days)} روز`,
              extra: <span className="text-xs text-muted-foreground">حاضر {faNum(r.present)} · تأخیر {faNum(r.late)} · غیبت {faNum(r.absent)}</span>,
            }))}
          />
        </TabsContent>
        <TabsContent value="improved">
          <Board
            empty="برای این بازه سابقه نمره کافی (حداقل ۴ نمره) با پیشرفت مثبت وجود ندارد."
            rows={result?.improved.slice(0, 10).map((r) => ({
              id: r.student.id, rank: r.rank, name: fullName(r.student), className: cls?.name ?? "",
              main: `+${faNum(r.improvement, 2)}`, mainLabel: "پیشرفت",
              extra: (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>قبلی {faNum(r.previous, 2)} ← فعلی {faNum(r.current, 2)}</span>
                  <div className="h-8 w-24" dir="ltr" aria-label="نمودار پیشرفت">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={r.history}>
                        <YAxis hide domain={[0, 20]} />
                        <Line type="monotone" dataKey="score" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ),
            }))}
          />
        </TabsContent>
      </Tabs>}
    </div>
  );
}

function ClassComparison({ rows }: { rows: ReturnType<typeof classRankings> | undefined }) {
  if (!rows) return <p role="status" className="py-6 text-sm text-muted-foreground">در حال بارگذاری…</p>;
  return <section aria-label="مقایسه رتبه کلاس‌ها" className="space-y-3">
    <h2 className="font-semibold">رتبه کلاس‌ها</h2>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-right text-sm">
        <thead className="border-b bg-muted text-muted-foreground">
          <tr><th className="p-3">رتبه درسی</th><th className="p-3">کلاس</th><th className="p-3">معدل دانش‌آموزان</th><th className="p-3">دارای نمره / کل</th><th className="p-3">رتبه حضور</th><th className="p-3">حضور</th><th className="p-3">روز ثبت‌شده</th></tr>
        </thead>
        <tbody>{rows.map((r) => <tr key={r.cls.id} className="border-b last:border-0">
          <td className="p-3 font-bold">{r.rank === null ? "—" : fa(r.rank)}</td>
          <td className="p-3 font-medium"><Link to="/classes/$classId" params={{ classId: r.cls.id }} className="text-primary hover:underline">{r.cls.name}</Link></td>
          <td className="p-3 font-semibold tabular-nums">{r.avg === null ? "—" : faNum(r.avg, 2)}</td>
          <td className="p-3 tabular-nums">{fa(r.gradedCount)} / {fa(r.studentCount)}</td>
          <td className="p-3 font-bold">{r.attendanceRank === null ? "—" : fa(r.attendanceRank)}</td>
          <td className="p-3 tabular-nums">{r.attendancePct === null ? "—" : `${faNum(r.attendancePct, 1)}٪`}</td>
          <td className="p-3 tabular-nums">{fa(r.days)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function Trend({ v, digits = 0 }: { v: number; digits?: number }) {
  if (Math.abs(v) < 0.005) return <Minus className="size-3" />;
  const up = v > 0;
  return (
    <span className={cn("inline-flex items-center", up ? "text-success" : "text-destructive")}>
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{faNum(Math.abs(v), digits)}
    </span>
  );
}

type Row = { id: string; rank: number; name: string; className: string; main: string; mainLabel: string; extra: React.ReactNode };

function Board({ rows, empty }: { rows: Row[] | undefined; empty: string }) {
  if (!rows) return <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>;
  if (!rows.length) return <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">{empty}</p>;
  const tone = ["bg-warning-soft text-warning-foreground", "bg-muted text-foreground", "bg-primary-soft text-primary"];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {rows.slice(0, 3).map((r, i) => (
          <Link key={r.id} to="/students/$studentId" params={{ studentId: r.id }}
            className={cn("animate-rise rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift", i === 0 && "border-primary/40 ring-1 ring-primary/20")}>
            <div className="flex items-center justify-between">
              <span className={cn("grid size-10 place-items-center rounded-full", tone[i])}>{i === 0 ? <Trophy className="size-5" /> : <Medal className="size-5" />}</span>
              <span className="text-sm font-bold text-muted-foreground">رتبه {faNum(r.rank)}</span>
            </div>
            <p className="mt-3 font-semibold">{r.name}</p>
            <p className="text-xs text-muted-foreground">کلاس {r.className}</p>
            <p className="mt-2 text-2xl font-bold">{r.main} <span className="text-xs font-normal text-muted-foreground">{r.mainLabel}</span></p>
            <div className="mt-2">{r.extra}</div>
          </Link>
        ))}
      </div>
      {rows.length > 3 && (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          {rows.slice(3).map((r) => (
            <Link key={r.id} to="/students/$studentId" params={{ studentId: r.id }}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-3 last:border-0 hover:bg-muted">
              <span className="w-8 text-center font-bold text-muted-foreground">{fa(r.rank)}</span>
              <span className="min-w-32 flex-1 font-medium">{r.name}<span className="mr-2 text-xs text-muted-foreground">کلاس {r.className}</span></span>
              <div>{r.extra}</div>
              <span className="w-24 text-left font-semibold">{r.main}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
