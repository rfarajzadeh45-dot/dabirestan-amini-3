import { useQuery } from "@tanstack/react-query";
import { Award, CalendarX, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { SubjectAveragesList, SubjectProgressChart } from "@/components/subject-charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { average, fa, faNum, jalali, noteCategoryLabel, type AttendanceStatus, type NoteCategory } from "@/lib/fa";
import { formatDelay } from "@/components/student-report-utils";

/** Read-only report for students and parents. Access is enforced by row-level security. */
export function StudentReport({ studentId }: { studentId: string }) {
  const { data: s, isLoading } = useQuery({
    queryKey: ["report-student", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id,first_name,last_name,student_code,class_id,classes(name)").eq("id", studentId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: att } = useQuery({
    queryKey: ["report-att", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("id,date,status,delay_seconds").eq("student_id", studentId).order("date", { ascending: false });
      if (error) throw error;
      return data as { id: string; date: string; status: AttendanceStatus; delay_seconds: number | null }[];
    },
  });
  const { data: grades } = useQuery({
    queryKey: ["report-grades", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grades").select("id,subject_id,score,title,date").eq("student_id", studentId).order("date");
      if (error) throw error;
      return data.map((g) => ({ ...g, score: Number(g.score) }));
    },
  });
  const { data: subjects } = useQuery({
    queryKey: ["class-subjects", s?.class_id],
    enabled: !!s?.class_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("class_subjects").select("sort_order,subjects(id,name)").eq("class_id", s!.class_id).order("sort_order");
      if (error) throw error;
      return data.flatMap((r) => (r.subjects ? [{ id: r.subjects.id, name: r.subjects.name }] : []));
    },
  });
  const { data: notes } = useQuery({
    queryKey: ["report-notes", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("id,category,content,date").eq("student_id", studentId).order("date", { ascending: false });
      if (error) throw error;
      return data as { id: string; category: NoteCategory; content: string; date: string }[];
    },
  });

  if (isLoading) return <p className="text-muted-foreground">در حال بارگذاری…</p>;
  if (!s) return <p className="text-muted-foreground">اطلاعاتی برای نمایش یافت نشد.</p>;

  const overall = average(grades?.map((g) => g.score) ?? []);
  const absences = att?.filter((a) => a.status === "absent").length ?? 0;
  const lates = att?.filter((a) => a.status === "late").length ?? 0;
  const present = att?.filter((a) => a.status === "present").length ?? 0;
  const subName = (id: string) => subjects?.find((x) => x.id === id)?.name ?? "";

  return (
    <div className="space-y-6">
      <div className="animate-rise flex flex-col gap-4 overflow-hidden rounded-2xl bg-hero p-6 text-primary-foreground shadow-lift sm:flex-row sm:items-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-primary-foreground/15 text-2xl font-bold">{s.first_name[0]}</div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{s.first_name} {s.last_name}</h1>
          <p className="mt-1 text-sm text-primary-foreground/75">کلاس {s.classes?.name} · شماره دانش‌آموزی {fa(s.student_code)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-primary-foreground/70">معدل کل</p>
          <p className="text-4xl font-extrabold">{overall !== null ? faNum(overall, 2) : "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="روزهای حضور" value={faNum(present)} icon={CheckCircle2} tone="success" />
        <StatCard label="غیبت" value={faNum(absences)} icon={CalendarX} tone="destructive" />
        <StatCard label="تأخیر" value={faNum(lates)} icon={Clock} tone="warning" />
        <StatCard label="معدل کل" value={overall !== null ? faNum(overall, 2) : "—"} icon={Award} />
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 font-semibold">نمودار پیشرفت تحصیلی به تفکیک درس</h2>
        <SubjectProgressChart subjects={subjects ?? []} grades={grades ?? []} />
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 font-semibold">میانگین همه دروس</h2>
        <SubjectAveragesList subjects={subjects ?? []} grades={grades ?? []} />
      </section>

      <Tabs defaultValue="grades" dir="rtl">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="grades">نمرات</TabsTrigger>
          <TabsTrigger value="attendance">حضور و غیاب</TabsTrigger>
          <TabsTrigger value="notes">یادداشت‌های معلم</TabsTrigger>
        </TabsList>
        <TabsContent value="grades">
          <section className="rounded-2xl border bg-card shadow-card">
            <ul className="divide-y">
              {[...(grades ?? [])].reverse().map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 break-words">{subName(g.subject_id)}{g.title ? ` · ${g.title}` : ""}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{jalali(g.date)}</span>
                  <span className="w-12 shrink-0 text-left font-bold tabular-nums">{faNum(g.score, 2)}</span>
                </li>
              ))}
              {!grades?.length && <li className="p-8 text-center text-sm text-muted-foreground">نمره‌ای ثبت نشده است.</li>}
            </ul>
          </section>
        </TabsContent>
        <TabsContent value="attendance">
          <section className="rounded-2xl border bg-card shadow-card">
            <ul className="divide-y">
              {att?.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span>{jalali(a.date, "long")}</span>
                  <span className="flex items-center gap-2">
                    {a.status === "late" && a.delay_seconds ? <span className="text-xs text-muted-foreground">{formatDelay(a.delay_seconds)}</span> : null}
                    <StatusBadge status={a.status} />
                  </span>
                </li>
              ))}
              {!att?.length && <li className="p-8 text-center text-sm text-muted-foreground">سابقه‌ای ثبت نشده است.</li>}
            </ul>
          </section>
        </TabsContent>
        <TabsContent value="notes">
          <section className="space-y-3">
            {notes?.map((n) => (
              <div key={n.id} className="rounded-2xl border bg-card p-4 shadow-card">
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">{noteCategoryLabel[n.category]}</span>
                  <span>{jalali(n.date)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7">{n.content}</p>
              </div>
            ))}
            {!notes?.length && <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">یادداشتی ثبت نشده است.</p>}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
