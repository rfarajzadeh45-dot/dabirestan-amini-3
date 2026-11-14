import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Pencil, Plus, Trash2, Award, CalendarX, Clock, CheckCircle2, Printer } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { NotesPanel } from "@/components/notes-panel";
import { SolarDatePicker } from "@/components/solar-date-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { average, fa, faNum, jalali, todayISO, type AttendanceStatus } from "@/lib/fa";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "پرونده دانش‌آموز | سامانه مدیریت مدرسه" },
      { name: "description", content: "حضور و غیاب، نمرات، معدل و یادداشت‌های دانش‌آموز" },
      { property: "og:title", content: "پرونده دانش‌آموز | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "حضور و غیاب، نمرات، معدل و یادداشت‌های دانش‌آموز" },
    ],
  }),
  component: StudentProfile,
});

type Grade = { id: string; subject_id: string; score: number; title: string; date: string };

function StudentProfile() {
  const { studentId } = Route.useParams();

  const { data: s, isLoading } = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,first_name,last_name,student_code,class_id,classes(id,name)")
        .eq("id", studentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: att } = useQuery({
    queryKey: ["student-att", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("id,date,status").eq("student_id", studentId).order("date", { ascending: false });
      if (error) throw error;
      return data as { id: string; date: string; status: AttendanceStatus }[];
    },
  });
  const { data: grades } = useQuery({
    queryKey: ["grades", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grades").select("id,subject_id,score,title,date").eq("student_id", studentId).order("date");
      if (error) throw error;
      return data.map((g) => ({ ...g, score: Number(g.score) })) as Grade[];
    },
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id,name,sort_order").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const subName = (id: string) => subjects?.find((x) => x.id === id)?.name ?? "";
  const overall = average(grades?.map((g) => g.score) ?? []);
  const absences = att?.filter((a) => a.status === "absent").length ?? 0;
  const lates = att?.filter((a) => a.status === "late").length ?? 0;
  const presentPct = att?.length ? ((att.length - absences) / att.length) * 100 : 0;

  const bySubject = useMemo(
    () =>
      (subjects ?? []).map((sub) => {
        const gs = grades?.filter((g) => g.subject_id === sub.id) ?? [];
        return { id: sub.id, name: sub.name, count: gs.length, avg: average(gs.map((g) => g.score)) };
      }),
    [subjects, grades],
  );

  const progress = useMemo(() => {
    const dates = [...new Set(grades?.map((g) => g.date) ?? [])].sort();
    return dates.map((d) => {
      const upto = grades!.filter((g) => g.date <= d).map((g) => g.score);
      const day = grades!.filter((g) => g.date === d).map((g) => g.score);
      return { date: jalali(d), "میانگین روز": Number(average(day)!.toFixed(2)), "معدل تجمعی": Number(average(upto)!.toFixed(2)) };
    });
  }, [grades]);

  if (isLoading) return <p className="text-muted-foreground">در حال بارگذاری…</p>;
  if (!s) return <p className="text-muted-foreground">دانش‌آموز یافت نشد یا به آن دسترسی ندارید.</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <ReportCard
        name={`${s.first_name} ${s.last_name}`}
        code={s.student_code}
        className={s.classes?.name ?? ""}
        overall={overall}
        bySubject={bySubject}
        present={(att?.length ?? 0) - absences - lates}
        absences={absences}
        lates={lates}
        presentPct={presentPct}
      />
      <div className="print:hidden">
      <div className="mb-4 flex items-center justify-between gap-2">
      <Link to="/classes/$classId" params={{ classId: s.class_id }} className=" inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowRight className="size-4" />بازگشت به کلاس {s.classes?.name}
      </Link>
      <Button variant="outline" size="sm" onClick={() => window.print()}><Printer />چاپ کارنامه</Button>
      </div>

      <div className="animate-rise mb-6 flex flex-col gap-4 overflow-hidden rounded-2xl bg-hero p-6 text-primary-foreground shadow-lift sm:flex-row sm:items-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-primary-foreground/15 text-2xl font-bold">{s.first_name[0]}</div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{s.first_name} {s.last_name}</h1>
          <p className="mt-1 text-sm text-primary-foreground/75">شماره دانش‌آموزی {fa(s.student_code)} · کلاس {s.classes?.name}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-primary-foreground/70">معدل کل</p>
          <p className="text-4xl font-extrabold">{overall !== null ? faNum(overall, 2) : "—"}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="معدل کل" value={overall !== null ? faNum(overall, 2) : "—"} icon={Award} />
        <StatCard label="درصد حضور" value={`${faNum(presentPct, 1)}٪`} icon={CheckCircle2} tone="success" />
        <StatCard label="تعداد غیبت" value={faNum(absences)} icon={CalendarX} tone="destructive" />
        <StatCard label="تعداد تأخیر" value={faNum(lates)} icon={Clock} tone="warning" />
      </div>

      <Tabs defaultValue="grades" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="grades">نمرات</TabsTrigger>
          <TabsTrigger value="attendance">حضور و غیاب</TabsTrigger>
          <TabsTrigger value="notes">یادداشت‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border bg-card p-5 shadow-card">
              <h2 className="mb-4 font-semibold">نمودار پیشرفت</h2>
              <div className="h-64" dir="ltr">
                <ResponsiveContainer>
                  <LineChart data={progress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" reversed tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <YAxis orientation="right" domain={[0, 20]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, direction: "rtl", fontFamily: "Vazirmatn" }} />
                    <Line type="monotone" dataKey="میانگین روز" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="معدل تجمعی" stroke="var(--chart-1)" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded-2xl border bg-card p-5 shadow-card">
              <h2 className="mb-4 font-semibold">میانگین هر درس</h2>
              <div className="h-64" dir="ltr">
                <ResponsiveContainer>
                  <BarChart data={bySubject.map((b) => ({ name: b.name, میانگین: b.avg ? Number(b.avg.toFixed(2)) : 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" reversed tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <YAxis orientation="right" domain={[0, 20]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, direction: "rtl", fontFamily: "Vazirmatn" }} />
                    <Bar dataKey="میانگین" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
          <GradesTable studentId={studentId} grades={grades ?? []} subjects={subjects ?? []} subName={subName} bySubject={bySubject} />
        </TabsContent>

        <TabsContent value="attendance">
          <section className="rounded-2xl border bg-card shadow-card">
            <ul className="divide-y">
              {att?.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>{jalali(a.date, "long")}</span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
              {att?.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">سابقه‌ای ثبت نشده است.</li>}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="notes">
          <section className="rounded-2xl border bg-card p-5 shadow-card">
            <NotesPanel studentId={studentId} />
          </section>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

function ReportCard(p: {
  name: string;
  code: string;
  className: string;
  overall: number | null;
  bySubject: { name: string; avg: number | null }[];
  present: number;
  absences: number;
  lates: number;
  presentPct: number;
}) {
  return (
    <div className="hidden print:block">
      <div className="mb-4 flex items-end justify-between border-b-2 border-primary pb-3">
        <div>
          <p className="text-sm text-muted-foreground">کارنامه تحصیلی · سال تحصیلی ۱۴۰۵-۱۴۰۴</p>
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <p className="text-sm">شماره دانش‌آموزی {fa(p.code)} · کلاس {p.className}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">معدل کل</p>
          <p className="text-3xl font-extrabold text-primary">{p.overall !== null ? faNum(p.overall, 2) : "—"}</p>
        </div>
      </div>
      <h2 className="mb-2 font-semibold">نمرات دروس</h2>
      <table className="print-avoid mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-primary-soft">
            <th className="border p-2 text-right">درس</th>
            <th className="border p-2 text-center">میانگین</th>
          </tr>
        </thead>
        <tbody>
          {p.bySubject.map((b) => (
            <tr key={b.name}>
              <td className="border p-2">{b.name}</td>
              <td className="border p-2 text-center">{b.avg !== null ? faNum(b.avg, 2) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mb-2 font-semibold">حضور و غیاب</h2>
      <table className="print-avoid mb-10 w-full border-collapse text-sm">
        <tbody>
          <tr><td className="border p-2">روزهای حضور</td><td className="border p-2 text-center">{faNum(p.present)}</td></tr>
          <tr><td className="border p-2">تأخیر</td><td className="border p-2 text-center">{faNum(p.lates)}</td></tr>
          <tr><td className="border p-2">غیبت</td><td className="border p-2 text-center">{faNum(p.absences)}</td></tr>
          <tr><td className="border p-2">درصد حضور</td><td className="border p-2 text-center">{faNum(p.presentPct, 1)}٪</td></tr>
        </tbody>
      </table>
      <div className="flex justify-between pt-8 text-sm">
        <p>امضای معلم: ................</p>
        <p>امضای مدیر: ................</p>
      </div>
    </div>
  );
}

function GradesTable({
  studentId,
  grades,
  subjects,
  subName,
  bySubject,
}: {
  studentId: string;
  grades: Grade[];
  subjects: { id: string; name: string }[];
  subName: (id: string) => string;
  bySubject: { id: string; name: string; count: number; avg: number | null }[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<{ id?: string; subject_id: string; score: string; title: string; date: string }>({ subject_id: "", score: "", title: "", date: todayISO() });
  const [subFilter, setSubFilter] = useState("all");

  const openNew = () => {
    setF({ subject_id: subjects[0]?.id ?? "", score: "", title: "", date: todayISO() });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const score = Number(f.score);
      if (!f.subject_id) throw new Error("درس را انتخاب کنید");
      if (f.score.trim() === "" || isNaN(score) || score < 0 || score > 20) throw new Error("نمره باید عددی بین ۰ تا ۲۰ باشد");
      if (!f.date) throw new Error("تاریخ را وارد کنید");
      const payload = { subject_id: f.subject_id, score, title: f.title.trim().slice(0, 100), date: f.date };
      const { data: u } = await supabase.auth.getUser();
      const { error } = f.id
        ? await supabase.from("grades").update(payload).eq("id", f.id)
        : await supabase.from("grades").insert({ ...payload, student_id: studentId, created_by: u.user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(f.id ? "نمره ویرایش شد" : "نمره ثبت شد");
      qc.invalidateQueries({ queryKey: ["grades", studentId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("نمره حذف شد");
      qc.invalidateQueries({ queryKey: ["grades", studentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = [...grades].reverse().filter((g) => subFilter === "all" || g.subject_id === subFilter);

  return (
    <section className="rounded-2xl border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <h2 className="font-semibold">سوابق نمرات</h2>
        <div className="flex gap-2">
          <Select value={subFilter} onValueChange={setSubFilter} dir="rtl">
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دروس</SelectItem>
              {subjects.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openNew}><Plus />ثبت نمره</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b p-4">
        {bySubject.map((b) => (
          <div key={b.id} className="rounded-xl bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">{b.name}: </span>
            <span className="font-semibold">{b.avg !== null ? faNum(b.avg, 2) : "—"}</span>
            <span className="text-xs text-muted-foreground"> ({faNum(b.count)})</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-right font-medium">تاریخ</th>
              <th className="px-4 py-2.5 text-right font-medium">درس</th>
              <th className="px-4 py-2.5 text-right font-medium">عنوان</th>
              <th className="px-4 py-2.5 text-right font-medium">نمره</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((g) => (
              <tr key={g.id} className="hover:bg-muted/40">
                <td className="px-4 py-2">{jalali(g.date)}</td>
                <td className="px-4 py-2">{subName(g.subject_id)}</td>
                <td className="px-4 py-2 text-muted-foreground">{g.title || "—"}</td>
                <td className="px-4 py-2">
                  <span className={g.score >= 17 ? "font-bold text-success" : g.score < 10 ? "font-bold text-destructive" : "font-bold"}>{faNum(g.score, 2)}</span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="size-8" aria-label="ویرایش" onClick={() => { setF({ ...g, score: String(g.score) }); setOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <ConfirmDialog
                      description="این نمره برای همیشه حذف می‌شود."
                      onConfirm={() => del.mutate(g.id)}
                      trigger={<Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="حذف"><Trash2 className="size-4" /></Button>}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">نمره‌ای ثبت نشده است.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader className="text-right sm:text-right"><DialogTitle>{f.id ? "ویرایش نمره" : "ثبت نمره جدید"}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>درس</Label>
                <Select value={f.subject_id} onValueChange={(v) => setF({ ...f, subject_id: v })} dir="rtl">
                  <SelectTrigger><SelectValue placeholder="انتخاب درس" /></SelectTrigger>
                  <SelectContent>{subjects.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>نمره (۰ تا ۲۰)</Label><Input dir="ltr" type="number" step="0.25" min={0} max={20} value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>عنوان (اختیاری)</Label><Input maxLength={100} placeholder="مثلاً میان‌ترم" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="grade-date">تاریخ</Label><SolarDatePicker id="grade-date" label="تاریخ نمره" value={f.date} onChange={(date) => setF({ ...f, date })} /></div>
            </div>
            <DialogFooter className="gap-2 pt-2 sm:justify-start">
              <Button type="submit" disabled={save.isPending}>ذخیره</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
