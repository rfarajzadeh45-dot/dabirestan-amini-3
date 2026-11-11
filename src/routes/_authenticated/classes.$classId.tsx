import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Clock, ChevronRight, ChevronLeft, NotebookPen, Search, CheckCheck, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SolarDatePicker } from "@/components/solar-date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NotesPanel } from "@/components/notes-panel";
import { StudentFormDialog } from "@/components/student-form-dialog";
import { fa, faNum, jalali, shiftDate, todayISO, type AttendanceStatus } from "@/lib/fa";
import { useMe } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/classes/$classId")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "حضور و غیاب کلاس | سامانه مدیریت مدرسه" },
      { name: "description", content: "ثبت حضور، غیاب و تأخیر دانش‌آموزان با یک کلیک" },
      { property: "og:title", content: "حضور و غیاب کلاس | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "ثبت حضور، غیاب و تأخیر دانش‌آموزان با یک کلیک" },
    ],
  }),
  component: ClassPage,
});

type Filter = AttendanceStatus | "none" | "all";

function ClassPage() {
  const { classId } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [date, setDate] = useState(todayISO());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: cls } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id,name").eq("id", classId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: students } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,first_name,last_name,student_code,class_id")
        .eq("class_id", classId)
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const attKey = ["class-attendance", classId, date];
  const { data: att } = useQuery({
    queryKey: attKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id,status,students!inner(class_id)")
        .eq("date", date)
        .eq("students.class_id", classId);
      if (error) throw error;
      return Object.fromEntries(data.map((r) => [r.student_id, r.status as AttendanceStatus])) as Record<string, AttendanceStatus>;
    },
  });

  const mark = useMutation({
    mutationFn: async (rows: { student_id: string; status: AttendanceStatus }[]) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("attendance").upsert(
        rows.map((r) => ({ ...r, date, recorded_by: u.user?.id ?? null, updated_at: new Date().toISOString() })),
        { onConflict: "student_id,date" },
      );
      if (error) throw error;
    },
    onMutate: async (rows) => {
      await qc.cancelQueries({ queryKey: attKey });
      const prev = qc.getQueryData<Record<string, AttendanceStatus>>(attKey);
      qc.setQueryData(attKey, { ...(prev ?? {}), ...Object.fromEntries(rows.map((r) => [r.student_id, r.status])) });
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(attKey, ctx?.prev);
      toast.error("ثبت حضور ناموفق بود: " + e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["attendance-week"] });
      qc.invalidateQueries({ queryKey: ["attendance-recent"] });
      qc.invalidateQueries({ queryKey: ["classes-overview"] });
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim();
    return (students ?? []).filter((s) => {
      const st = att?.[s.id];
      if (filter === "none" && st) return false;
      if (filter !== "all" && filter !== "none" && st !== filter) return false;
      if (!term) return true;
      return `${s.first_name} ${s.last_name}`.includes(term) || s.student_code.includes(term) || fa(s.student_code).includes(term);
    });
  }, [students, att, q, filter]);

  const counts = useMemo(() => {
    const v = Object.values(att ?? {});
    return {
      present: v.filter((x) => x === "present").length,
      absent: v.filter((x) => x === "absent").length,
      late: v.filter((x) => x === "late").length,
      none: (students?.length ?? 0) - v.length,
    };
  }, [att, students]);

  const isFuture = date > todayISO();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={cls ? `کلاس ${cls.name}` : "کلاس"}
        subtitle={`${faNum(students?.length ?? 0)} دانش‌آموز`}
        actions={
          <>
            {me?.isAdmin && (
              <StudentFormDialog defaultClassId={classId} trigger={<Button variant="outline"><Plus />دانش‌آموز جدید</Button>} />
            )}
            <Button
              disabled={!students?.length || isFuture || mark.isPending}
              onClick={() =>
                mark.mutate(
                  (students ?? []).filter((s) => !att?.[s.id]).map((s) => ({ student_id: s.id, status: "present" as const })),
                  { onSuccess: () => toast.success("بقیه دانش‌آموزان حاضر ثبت شدند") },
                )
              }
            >
              <CheckCheck />حاضر برای ثبت‌نشده‌ها
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 rounded-2xl border bg-card p-4 shadow-card lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label="روز قبل" onClick={() => setDate(shiftDate(date, -1))}><ChevronRight /></Button>
          <SolarDatePicker label="تاریخ حضور و غیاب" value={date} max={todayISO()} onChange={setDate} className="w-40 shrink-0" />
          <Button size="icon" variant="outline" aria-label="روز بعد" disabled={date >= todayISO()} onClick={() => setDate(shiftDate(date, 1))}><ChevronLeft /></Button>
          <div className="hidden text-sm sm:block">
            <p className="font-medium">{jalali(date, "long")}</p>
            {date !== todayISO() && <button className="text-xs text-primary hover:underline" onClick={() => setDate(todayISO())}>بازگشت به امروز</button>}
          </div>
        </div>
        <div className="relative lg:mx-4">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="جستجو در کلاس…" value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ["all", `همه`],
            ["present", `حاضر ${faNum(counts.present)}`],
            ["late", `تأخیر ${faNum(counts.late)}`],
            ["absent", `غایب ${faNum(counts.absent)}`],
            ["none", `ثبت‌نشده ${faNum(counts.none)}`],
          ] as [Filter, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                filter === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <ul className="divide-y">
          {filtered.map((s, i) => {
            const st = att?.[s.id];
            return (
              <li key={s.id} className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 text-center text-xs text-muted-foreground">{fa(i + 1)}</span>
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{s.first_name[0]}</div>
                  <div className="min-w-0">
                    <Link to="/students/$studentId" params={{ studentId: s.id }} className="block truncate font-medium hover:text-primary hover:underline">
                      {s.first_name} {s.last_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">شماره: {fa(s.student_code)}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="size-8 shrink-0 text-muted-foreground" aria-label="یادداشت‌ها">
                        <NotebookPen className="size-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto text-right sm:max-w-lg">
                      <DialogHeader className="text-right sm:text-right">
                        <DialogTitle>یادداشت‌های {s.first_name} {s.last_name}</DialogTitle>
                      </DialogHeader>
                      <NotesPanel studentId={s.id} />
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <StatusBadge status={st} className="hidden w-20 justify-center md:inline-flex" />
                  <div className="flex flex-1 gap-1.5 sm:flex-none">
                    <AttBtn active={st === "present"} tone="success" disabled={isFuture} onClick={() => mark.mutate([{ student_id: s.id, status: "present" }])}><Check />حاضر</AttBtn>
                    <AttBtn active={st === "late"} tone="warning" disabled={isFuture} onClick={() => mark.mutate([{ student_id: s.id, status: "late" }])}><Clock />تأخیر</AttBtn>
                    <AttBtn active={st === "absent"} tone="destructive" disabled={isFuture} onClick={() => mark.mutate([{ student_id: s.id, status: "absent" }])}><X />غایب</AttBtn>
                  </div>
                </div>
              </li>
            );
          })}
          {students && filtered.length === 0 && <li className="p-10 text-center text-sm text-muted-foreground">دانش‌آموزی یافت نشد.</li>}
        </ul>
      </div>
    </div>
  );
}

function AttBtn({
  active,
  tone,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  tone: "success" | "warning" | "destructive";
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const on = {
    success: "bg-success text-success-foreground border-success",
    warning: "bg-warning text-warning-foreground border-warning",
    destructive: "bg-destructive text-destructive-foreground border-destructive",
  }[tone];
  const off = {
    success: "hover:bg-success-soft hover:text-success",
    warning: "hover:bg-warning-soft hover:text-warning-foreground",
    destructive: "hover:bg-destructive-soft hover:text-destructive",
  }[tone];
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-40 sm:flex-none [&_svg]:size-3.5",
        active ? on : cn("bg-card text-muted-foreground", off),
      )}
    >
      {children}
    </button>
  );
}
