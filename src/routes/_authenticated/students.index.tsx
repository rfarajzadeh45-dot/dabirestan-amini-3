import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentFormDialog } from "@/components/student-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { compareStudentName, fa, faNum, todayISO, type AttendanceStatus } from "@/lib/fa";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/students/")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => (typeof s["q"] === "string" ? { q: s["q"] } : {}),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "دانش‌آموزان | سامانه مدیریت مدرسه" },
      { name: "description", content: "جستجو، فیلتر و مدیریت دانش‌آموزان مدرسه" },
      { property: "og:title", content: "دانش‌آموزان | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "جستجو، فیلتر و مدیریت دانش‌آموزان مدرسه" },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const { q: initialQ } = Route.useSearch();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [q, setQ] = useState(initialQ ?? "");
  const [cls, setCls] = useState("all");
  const [st, setSt] = useState("all");
  useEffect(() => setQ(initialQ ?? ""), [initialQ]);

  const { data: students } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,first_name,last_name,student_code,class_id,classes(name,sort_order)")
        .order("student_code")
        .range(0, 4999);
      if (error) throw error;
      return [...data].sort((a, b) => (a.classes?.sort_order ?? 0) - (b.classes?.sort_order ?? 0) || compareStudentName(a, b));
    },
  });
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id,name,sort_order").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const today = todayISO();
  const { data: att } = useQuery({
    queryKey: ["attendance-today", today],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("student_id,status").eq("date", today).range(0, 4999);
      if (error) throw error;
      return Object.fromEntries(data.map((r) => [r.student_id, r.status as AttendanceStatus])) as Record<string, AttendanceStatus>;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("دانش‌آموز حذف شد");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = useMemo(() => {
    const t = q.trim();
    return (students ?? []).filter((s) => {
      if (cls !== "all" && s.class_id !== cls) return false;
      const a = att?.[s.id];
      if (st === "none" ? !!a : st !== "all" && a !== st) return false;
      if (!t) return true;
      return `${s.first_name} ${s.last_name}`.includes(t) || s.student_code.includes(t) || fa(s.student_code).includes(t);
    });
  }, [students, att, q, cls, st]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="دانش‌آموزان"
        subtitle={`${faNum(list.length)} از ${faNum(students?.length ?? 0)} دانش‌آموز`}
        actions={me?.isAdmin && <StudentFormDialog trigger={<Button><Plus />افزودن دانش‌آموز</Button>} />}
      />
      <div className="mb-4 grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا شماره دانش‌آموزی…" className="pr-9" />
        </div>
        <Select value={cls} onValueChange={setCls} dir="rtl">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه کلاس‌ها</SelectItem>
            {classes?.map((c) => <SelectItem key={c.id} value={c.id}>کلاس {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={st} onValueChange={setSt} dir="rtl">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها (امروز)</SelectItem>
            <SelectItem value="present">حاضر</SelectItem>
            <SelectItem value="late">تأخیر</SelectItem>
            <SelectItem value="absent">غایب</SelectItem>
            <SelectItem value="none">ثبت نشده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-right font-medium">نام دانش‌آموز</th>
              <th className="px-4 py-3 text-right font-medium">شماره</th>
              <th className="px-4 py-3 text-right font-medium">کلاس</th>
              <th className="px-4 py-3 text-right font-medium">وضعیت امروز</th>
              {me?.isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-muted/40">
                <td className="px-4 py-2.5">
                  <Link to="/students/$studentId" params={{ studentId: s.id }} className="font-medium hover:text-primary hover:underline">
                    {s.first_name} {s.last_name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{fa(s.student_code)}</td>
                <td className="px-4 py-2.5">{s.classes?.name}</td>
                <td className="px-4 py-2.5"><StatusBadge status={att?.[s.id]} /></td>
                {me?.isAdmin && (
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <StudentFormDialog student={s} trigger={<Button size="icon" variant="ghost" className="size-8" aria-label="ویرایش"><Pencil className="size-4" /></Button>} />
                      <ConfirmDialog
                        description={`${s.first_name} ${s.last_name} و تمام سوابق حضور، نمرات و یادداشت‌های او حذف خواهد شد.`}
                        onConfirm={() => del.mutate(s.id)}
                        trigger={<Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="حذف"><Trash2 className="size-4" /></Button>}
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {students && list.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">نتیجه‌ای یافت نشد.</p>}
      </div>
    </div>
  );
}
