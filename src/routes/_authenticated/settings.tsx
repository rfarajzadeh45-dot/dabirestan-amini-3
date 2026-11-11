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
      <UsersSection myId={me?.id} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ClassesSection />
        <SubjectsSection />
      </div>
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

function UsersSection({ myId }: { myId?: string | undefined }) {
  const qc = useQueryClient();
  const { data: classes } = useClasses();
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r, t] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("teacher_classes").select("user_id,class_id"),
      ]);
      if (p.error) throw p.error;
      return { profiles: p.data, roles: r.data ?? [], tc: t.data ?? [] };
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const { error } = on
        ? await supabase.from("user_roles").insert({ user_id: id, role: "admin" })
        : await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("نقش کاربر به‌روزرسانی شد"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleClass = useMutation({
    mutationFn: async ({ uid, cid, on }: { uid: string; cid: string; on: boolean }) => {
      const { error } = on
        ? await supabase.from("teacher_classes").insert({ user_id: uid, class_id: cid })
        : await supabase.from("teacher_classes").delete().eq("user_id", uid).eq("class_id", cid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="font-semibold">کاربران و دسترسی کلاس‌ها</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">معلمان پس از ثبت‌نام اینجا نمایش داده می‌شوند. کلاس‌های هر معلم را مشخص کنید.</p>
      <div className="space-y-3">
        {data?.profiles.map((p) => {
          const isAdmin = data.roles.some((r) => r.user_id === p.id && r.role === "admin");
          return (
            <div key={p.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{p.full_name || "بدون نام"}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{p.email}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  مدیر
                  <Switch checked={isAdmin} disabled={p.id === myId} onCheckedChange={(on) => toggleAdmin.mutate({ id: p.id, on })} />
                </label>
              </div>
              {!isAdmin && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {classes?.map((c) => {
                    const on = data.tc.some((t) => t.user_id === p.id && t.class_id === c.id);
                    return (
                      <label key={c.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted">
                        <Checkbox checked={on} onCheckedChange={(v) => toggleClass.mutate({ uid: p.id, cid: c.id, on: !!v })} />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              )}
              {isAdmin && <p className="mt-2 text-xs text-muted-foreground">مدیر به همه کلاس‌ها دسترسی دارد.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
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
  const [name, setName] = useState("");
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id,name,sort_order").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n || n.length > 40) throw new Error("نام درس معتبر نیست");
      const { error } = await supabase.from("subjects").insert({ name: n, sort_order: (subjects?.length ?? 0) + 1 });
      if (error) throw new Error(error.code === "23505" ? "این درس قبلاً وجود دارد" : error.message);
    },
    onSuccess: () => { toast.success("درس اضافه شد"); setName(""); qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("درس حذف شد"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-4 font-semibold">دروس</h2>
      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <Input placeholder="نام درس جدید" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit"><Plus />افزودن</Button>
      </form>
      <ul className="divide-y rounded-xl border">
        {subjects?.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
            {s.name}
            <ConfirmDialog
              description={`درس «${s.name}» و تمام نمرات ثبت‌شده آن حذف خواهد شد.`}
              onConfirm={() => del.mutate(s.id)}
              trigger={<Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="حذف"><Trash2 className="size-4" /></Button>}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
