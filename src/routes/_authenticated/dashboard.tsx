import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, School, UserCheck, UserX, Percent, ChevronLeft, Clock, FileSpreadsheet, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchAll } from "@/lib/fetch-all";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { SchoolSchedule } from "@/components/school-schedule";
import { AnnouncementsPanel } from "@/components/announcements-panel";
import { AbsenceAlerts } from "@/components/absence-alerts";
import { Button } from "@/components/ui/button";
import { buildAttendanceCsv, downloadBlob } from "@/lib/export";
import { toast } from "sonner";
import { useState } from "react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { fa, faNum, jalali, shiftDate, todayISO, type AttendanceStatus } from "@/lib/fa";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "داشبورد | سامانه مدیریت مدرسه" },
      { name: "description", content: "نمای کلی دانش‌آموزان، کلاس‌ها و حضور و غیاب امروز" },
      { property: "og:title", content: "داشبورد | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "نمای کلی دانش‌آموزان، کلاس‌ها و حضور و غیاب امروز" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const today = todayISO();
  const { data: me } = useMe();
  const [exporting, setExporting] = useState(false);
  const exportMonth = async () => {
    setExporting(true);
    try {
      const blob = await buildAttendanceCsv(shiftDate(today, -29), today);
      downloadBlob(blob, `attendance-${today}.csv`);
      toast.success("فایل اکسل حضور و غیاب آماده شد");
    } catch {
      toast.error("دریافت فایل ناموفق بود");
    } finally {
      setExporting(false);
    }
  };

  const { data: classes } = useQuery({
    queryKey: ["classes-with-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id,name,sort_order,students(count)").order("sort_order");
      if (error) throw error;
      return data.map((c) => ({ ...c, count: (c.students as unknown as { count: number }[])[0]?.count ?? 0 }));
    },
  });

  const weekStart = shiftDate(today, -6);
  const { data: week } = useQuery({
    queryKey: ["attendance-week", weekStart],
    queryFn: async () => {
      const { data, error } = await fetchAll((f, t) => supabase.from("attendance").select("date,status").gte("date", weekStart).lte("date", today).order("id").range(f, t));
      if (error) throw error;
      return data;
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["attendance-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id,date,status,updated_at,students(id,first_name,last_name,student_code,classes(name))")
        .order("updated_at", { ascending: false })
        .order("date", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const totalStudents = classes?.reduce((a, c) => a + c.count, 0) ?? 0;
  const todayRows = week?.filter((r) => r.date === today) ?? [];
  const present = todayRows.filter((r) => r.status === "present").length;
  const late = todayRows.filter((r) => r.status === "late").length;
  const absent = todayRows.filter((r) => r.status === "absent").length;
  const pct = todayRows.length ? ((present + late) / todayRows.length) * 100 : 0;

  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = shiftDate(weekStart, i);
    const rows = week?.filter((r) => r.date === d) ?? [];
    return {
      day: new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "short", day: "numeric" }).format(new Date(d + "T12:00")),
      حاضر: rows.filter((r) => r.status === "present").length,
      تأخیر: rows.filter((r) => r.status === "late").length,
      غایب: rows.filter((r) => r.status === "absent").length,
    };
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`سلام${me?.fullName ? `، ${me.fullName}` : ""} 👋`}
        subtitle={<>امروز {jalali(today, "long")}</>}
        actions={
          <Button variant="outline" onClick={exportMonth} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}خروجی اکسل حضور ۳۰ روز اخیر
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="کل دانش‌آموزان" value={faNum(totalStudents)} icon={Users} delay={0} />
        <StatCard label="تعداد کلاس‌ها" value={faNum(classes?.length ?? 0)} icon={School} delay={50} />
        <StatCard label="حاضر امروز" value={faNum(present + late)} hint={late ? `${faNum(late)} نفر با تأخیر` : undefined} icon={UserCheck} tone="success" delay={100} />
        <StatCard label="غایب امروز" value={faNum(absent)} icon={UserX} tone="destructive" delay={150} />
        <StatCard
          label="درصد حضور امروز"
          value={`${faNum(pct, 1)}٪`}
          hint={`${faNum(totalStudents - todayRows.length)} نفر ثبت نشده`}
          icon={Percent}
          tone="warning"
          delay={200}
        />
      </div>

      <SchoolSchedule />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="animate-rise rounded-2xl border bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="mb-4 font-semibold">وضعیت حضور هفت روز اخیر</h2>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" reversed tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis orientation="right" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", direction: "rtl", fontFamily: "Vazirmatn" }} />
                <Bar dataKey="حاضر" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="تأخیر" stackId="a" fill="var(--chart-4)" />
                <Bar dataKey="غایب" stackId="a" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="animate-rise rounded-2xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">آخرین ثبت‌های حضور</h2>
            <Clock className="size-4 text-muted-foreground" />
          </div>
          <ul className="space-y-1">
            {recent?.map((r) => (
              <li key={r.id}>
                {r.students && (
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: r.students.id }}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.students.first_name} {r.students.last_name}</p>
                      <p className="text-xs text-muted-foreground">کلاس {r.students.classes?.name} · {jalali(r.date)}</p>
                    </div>
                    <StatusBadge status={r.status as AttendanceStatus} />
                  </Link>
                )}
              </li>
            ))}
            {recent && recent.length === 0 && <p className="text-sm text-muted-foreground">هنوز رکوردی ثبت نشده است.</p>}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AnnouncementsPanel />
        <AbsenceAlerts />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">دسترسی سریع به کلاس‌ها</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {classes?.map((c, i) => (
            <Link
              key={c.id}
              to="/classes/$classId"
              params={{ classId: c.id }}
              className="group animate-rise flex items-center justify-between rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary-soft font-bold text-primary">{fa(c.sort_order)}</div>
                <div>
                  <p className="font-medium">کلاس {c.name}</p>
                  <p className="text-xs text-muted-foreground">{faNum(c.count)} دانش‌آموز</p>
                </div>
              </div>
              <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />
            </Link>
          ))}
          {classes && classes.length === 0 && (
            <p className="text-sm text-muted-foreground">هنوز کلاسی به شما اختصاص داده نشده است. با مدیر مدرسه تماس بگیرید.</p>
          )}
        </div>
      </section>
    </div>
  );
}
