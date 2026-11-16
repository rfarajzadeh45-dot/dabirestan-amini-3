import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useMe } from "@/lib/auth";
import { AccountsAdmin } from "@/components/accounts-admin";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "تنظیمات | سامانه مدیریت مدرسه" },
      { name: "description", content: "مدیریت معلمان، دسترسی کلاس‌ها، کلاس‌ها و دروس" },
      { property: "og:title", content: "تنظیمات | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "مدیریت معلمان، دسترسی کلاس‌ها، کلاس‌ها و دروس" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: me } = useMe();
  if (me && !me.isAdmin) return <p className="text-muted-foreground">این بخش فقط برای مدیر در دسترس است.</p>;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="تنظیمات" subtitle="مدیریت کاربران، دسترسی کلاس‌ها و دروس" />
      <AccountsAdmin myId={me?.id} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ClassesSection />
        <SubjectsSection />
      </div>
      <DemoDataSection />
    </div>
  );
}

function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id,name,sort_order").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

function ClassesSection() {
  const qc = useQueryClient();
  const { data: classes } = useClasses();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!name.trim() || name.length > 40) throw new Error("نام کلاس معتبر نیست");
      const { error } = await supabase.from("classes").update({ name: name.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("نام کلاس ذخیره شد"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-4 font-semibold">کلاس‌ها</h2>
      <div className="space-y-2">
        {classes?.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Input value={edits[c.id] ?? c.name} onChange={(e) => setEdits({ ...edits, [c.id]: e.target.value })} />
            <Button size="icon" variant="outline" aria-label="ذخیره" disabled={(edits[c.id] ?? c.name) === c.name} onClick={() => rename.mutate({ id: c.id, name: edits[c.id] ?? c.name })}>
              <Save />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SubjectsSection() {
  const qc = useQueryClient();
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState("");
  const cid = classId || classes?.[0]?.id || "";
  const [name, setName] = useState("");
  const { data: subjects } = useQuery({
    queryKey: ["class-subjects", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("class_subjects").select("sort_order,subjects(id,name)").eq("class_id", cid).order("sort_order");
      if (error) throw error;
      return data.flatMap((r) => (r.subjects ? [r.subjects] : []));
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n || n.length > 40) throw new Error("نام درس معتبر نیست");
      if (subjects?.some((s) => s.name === n)) throw new Error("این درس قبلاً برای این کلاس ثبت شده است");
      let { data: sub } = await supabase.from("subjects").select("id").eq("name", n).maybeSingle();
      if (!sub) {
        const r = await supabase.from("subjects").insert({ name: n, sort_order: 100 }).select("id").single();
        if (r.error) throw r.error;
        sub = r.data;
      }
      const { error } = await supabase.from("class_subjects").insert({ class_id: cid, subject_id: sub.id, sort_order: (subjects?.length ?? 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("درس اضافه شد"); setName(""); qc.invalidateQueries({ queryKey: ["class-subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase.from("grades").select("id, students!inner(class_id)", { count: "exact", head: true }).eq("subject_id", id).eq("students.class_id", cid);
      if (count) throw new Error("برای این درس نمره ثبت شده است؛ ابتدا نمرات را حذف کنید");
      const { error } = await supabase.from("class_subjects").delete().eq("class_id", cid).eq("subject_id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("درس از کلاس حذف شد"); qc.invalidateQueries({ queryKey: ["class-subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-4 font-semibold">دروس هر کلاس</h2>
      <select className="mb-3 h-9 w-full rounded-md border bg-background px-3 text-sm" value={cid} onChange={(e) => setClassId(e.target.value)} aria-label="انتخاب کلاس">
        {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <Input placeholder="نام درس جدید" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit"><Plus />افزودن</Button>
      </form>
      <ul className="divide-y rounded-xl border">
        {subjects?.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
            {s.name}
            <ConfirmDialog
              description={`درس «${s.name}» از فهرست دروس این کلاس حذف خواهد شد.`}
              onConfirm={() => del.mutate(s.id)}
              trigger={<Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="حذف"><Trash2 className="size-4" /></Button>}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DemoDataSection() {
  const qc = useQueryClient();
  const clear = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("clear_demo_data");
      if (error) throw error;
      return data as { grades: number; attendance: number; notes: number };
    },
    onSuccess: (r) => {
      toast.success(`داده‌های نمایشی پاک شد (${r.grades} نمره، ${r.attendance} حضور، ${r.notes} یادداشت)`);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="font-semibold">داده‌های نمایشی</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        فقط نمرات، حضور و غیاب و یادداشت‌هایی که به‌عنوان داده نمایشی ساخته شده‌اند حذف می‌شوند. دانش‌آموزان، کلاس‌ها، دروس و اطلاعات واقعی دست‌نخورده می‌مانند.
      </p>
      <ConfirmDialog
        description="همه داده‌های نمایشی (نمرات، حضور و غیاب و یادداشت‌ها) برای همیشه حذف خواهند شد. اطلاعات واقعی حفظ می‌شود."
        onConfirm={() => clear.mutate()}
        trigger={<Button variant="destructive" disabled={clear.isPending}><Trash2 />پاک کردن داده‌های نمایشی</Button>}
      />
    </section>
  );
}
