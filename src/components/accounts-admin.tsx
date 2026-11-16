import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2, Plus, Trash2, UserPlus, Wand2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createAccount, deleteAccount, resetAccountPassword } from "@/lib/accounts.functions";
import { primaryRole, roleLabel, type AppRole } from "@/lib/username";
import { compareStudentName, fa } from "@/lib/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

type Student = { id: string; first_name: string; last_name: string; student_code: string; class_id: string; user_id: string | null };

function tempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

function useAdminData() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r, t, s, pc, c] = await Promise.all([
        supabase.from("profiles").select("id,full_name,username,email").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("teacher_classes").select("user_id,class_id"),
        supabase.from("students").select("id,first_name,last_name,student_code,class_id,user_id"),
        supabase.from("parent_children").select("parent_id,student_id"),
        supabase.from("classes").select("id,name,sort_order").order("sort_order"),
      ]);
      if (p.error) throw p.error;
      const students = ((s.data ?? []) as Student[]).sort(compareStudentName);
      return { profiles: p.data, roles: r.data ?? [], tc: t.data ?? [], students, pc: pc.data ?? [], classes: c.data ?? [] };
    },
  });
}

export function AccountsAdmin({ myId }: { myId?: string | undefined }) {
  const { data } = useAdminData();
  const [filter, setFilter] = useState<AppRole | "all">("all");
  const users = useMemo(
    () => (data?.profiles ?? []).map((p) => ({ ...p, role: primaryRole(data!.roles.filter((r) => r.user_id === p.id).map((r) => r.role as string)) })),
    [data],
  );
  const shown = users.filter((u) => filter === "all" || u.role === filter);
  const stName = (id: string) => { const s = data?.students.find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : ""; };
  const clsName = (id: string) => data?.classes.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="space-y-6">
      <CreateAccount students={data?.students ?? []} classes={data?.classes ?? []} />
      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="font-semibold">حساب‌های کاربری و دسترسی‌ها</h2>
        <div className="mb-4 mt-3 flex flex-wrap gap-2">
          {(["all", "student", "parent", "teacher", "admin"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setFilter(r)}
              className={cn("rounded-full border px-3 py-1 text-xs", filter === r ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {r === "all" ? "همه" : roleLabel[r]} ({fa(r === "all" ? users.length : users.filter((u) => u.role === r).length)})
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {shown.map((u) => (
            <UserRow key={u.id} u={u} isMe={u.id === myId} data={data!} stName={stName} clsName={clsName} />
          ))}
          {!shown.length && <p className="py-6 text-center text-sm text-muted-foreground">حسابی وجود ندارد.</p>}
        </div>
      </section>
    </div>
  );
}

function CreateAccount({ students, classes }: { students: Student[]; classes: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const create = useServerFn(createAccount);
  const [role, setRole] = useState<AppRole>("student");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(tempPassword());
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [children, setChildren] = useState<string[]>([]);
  const [done, setDone] = useState<{ username: string; password: string } | null>(null);

  const classStudents = students.filter((s) => s.class_id === classId);
  const m = useMutation({
    mutationFn: () => create({ data: { role, fullName, username, password, ...(role === "student" ? { studentId } : {}), ...(role === "parent" ? { childIds: children } : {}) } }),
    onSuccess: (r: { id: string; username: string }) => {
      toast.success("حساب ساخته شد");
      setDone({ username: r.username, password });
      setFullName(""); setUsername(""); setStudentId(""); setChildren([]); setPassword(tempPassword());
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-semibold"><UserPlus className="size-4" />ساخت حساب جدید</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">نام کاربری و رمز موقت را به کاربر بدهید. ورود فقط با نام کاربری و رمز است.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["student", "parent", "teacher", "admin"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)}
            className={cn("rounded-xl border px-4 py-2 text-sm", role === r ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{roleLabel[r]}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {role === "student" && (
          <>
            <div className="space-y-1.5"><Label>کلاس</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); }}>
                <SelectTrigger><SelectValue placeholder="انتخاب کلاس" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>دانش‌آموز</Label>
              <Select value={studentId} onValueChange={(v) => {
                setStudentId(v);
                const s = students.find((x) => x.id === v);
                if (s) { setFullName(`${s.first_name} ${s.last_name}`); setUsername(`s${s.student_code}`); }
              }} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder="انتخاب دانش‌آموز" /></SelectTrigger>
                <SelectContent>
                  {classStudents.map((s, i) => (
                    <SelectItem key={s.id} value={s.id} disabled={!!s.user_id}>{fa(i + 1)}. {s.first_name} {s.last_name}{s.user_id ? " (حساب دارد)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div className="space-y-1.5"><Label>نام و نام خانوادگی</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} /></div>
        <div className="space-y-1.5"><Label>نام کاربری (انگلیسی)</Label><Input dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={32} placeholder="e.g. s1001" /></div>
        <div className="space-y-1.5"><Label>رمز موقت</Label>
          <div className="flex gap-2">
            <Input dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} />
            <Button type="button" variant="outline" size="icon" onClick={() => setPassword(tempPassword())} aria-label="ساخت رمز تصادفی"><Wand2 /></Button>
          </div>
        </div>
        {role === "parent" && (
          <div className="space-y-1.5 sm:col-span-2"><Label>فرزندان</Label>
            <ChildPicker students={students} classes={classes} value={children} onChange={setChildren} />
          </div>
        )}
      </div>
      <Button className="mt-4" onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? <Loader2 className="animate-spin" /> : <Plus />}ساخت حساب {roleLabel[role]}</Button>
      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>اطلاعات ورود</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">این رمز فقط همین یک بار نمایش داده می‌شود؛ آن را یادداشت کنید.</p>
          <div className="space-y-2 rounded-xl bg-muted p-4 text-sm">
            <p>نام کاربری: <span dir="ltr" className="font-mono font-bold">{done?.username}</span></p>
            <p>رمز موقت: <span dir="ltr" className="font-mono font-bold">{done?.password}</span></p>
          </div>
          <DialogFooter><Button onClick={() => setDone(null)}>متوجه شدم</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ChildPicker({ students, classes, value, onChange }: { students: Student[]; classes: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const [classId, setClassId] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((id) => { const s = students.find((x) => x.id === id); return (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">
            {s?.first_name} {s?.last_name}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label="حذف"><X className="size-3" /></button>
          </span>); })}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger><SelectValue placeholder="کلاس فرزند" /></SelectTrigger>
          <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value="" onValueChange={(v) => !value.includes(v) && onChange([...value, v])} disabled={!classId}>
          <SelectTrigger><SelectValue placeholder="افزودن فرزند" /></SelectTrigger>
          <SelectContent>{students.filter((s) => s.class_id === classId).map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}

type AdminData = NonNullable<ReturnType<typeof useAdminData>["data"]>;

function UserRow({ u, isMe, data, stName, clsName }: {
  u: { id: string; full_name: string; username: string | null; email: string | null; role: AppRole | null };
  isMe: boolean; data: AdminData; stName: (id: string) => string; clsName: (id: string) => string;
}) {
  const qc = useQueryClient();
  const reset = useServerFn(resetAccountPassword);
  const remove = useServerFn(deleteAccount);
  const [pw, setPw] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  const onErr = (e: Error) => toast.error(e.message);

  const resetM = useMutation({ mutationFn: (password: string) => reset({ data: { userId: u.id, password } }), onSuccess: () => toast.success("رمز جدید ذخیره شد"), onError: onErr });
  const delM = useMutation({ mutationFn: () => remove({ data: { userId: u.id } }), onSuccess: () => { toast.success("حساب حذف شد"); refresh(); }, onError: onErr });
  const toggleAdmin = useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = on ? await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" }) : await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
      if (error) throw error;
    }, onSuccess: refresh, onError: onErr,
  });
  const toggleClass = useMutation({
    mutationFn: async ({ cid, on }: { cid: string; on: boolean }) => {
      const { error } = on ? await supabase.from("teacher_classes").insert({ user_id: u.id, class_id: cid }) : await supabase.from("teacher_classes").delete().eq("user_id", u.id).eq("class_id", cid);
      if (error) throw error;
    }, onSuccess: refresh, onError: onErr,
  });
  const children = data.pc.filter((p) => p.parent_id === u.id).map((p) => p.student_id);
  const setChildren = useMutation({
    mutationFn: async (next: string[]) => {
      const add = next.filter((x) => !children.includes(x));
      const del = children.filter((x) => !next.includes(x));
      if (add.length) { const { error } = await supabase.from("parent_children").insert(add.map((student_id) => ({ parent_id: u.id, student_id }))); if (error) throw error; }
      for (const sid of del) { const { error } = await supabase.from("parent_children").delete().eq("parent_id", u.id).eq("student_id", sid); if (error) throw error; }
    }, onSuccess: () => { toast.success("فرزندان به‌روزرسانی شد"); refresh(); }, onError: onErr,
  });
  const linked = data.students.find((s) => s.user_id === u.id);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium">{u.full_name || "بدون نام"} <span className="mr-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal">{u.role ? roleLabel[u.role] : "بدون نقش"}</span></p>
          <p className="text-xs text-muted-foreground" dir="ltr">{u.username ?? u.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(u.role === "admin" || u.role === "teacher") && (
            <label className="flex items-center gap-2 text-sm">مدیر<Switch checked={u.role === "admin"} disabled={isMe} onCheckedChange={(on) => toggleAdmin.mutate(on)} /></label>
          )}
          <Button size="sm" variant="outline" onClick={() => setPw(tempPassword())}><KeyRound />رمز جدید</Button>
          {!isMe && <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-destructive" aria-label="حذف حساب"><Trash2 /></Button>} title="حذف حساب کاربری" description={`حساب «${u.full_name}» حذف شود؟ پرونده تحصیلی دانش‌آموز حذف نمی‌شود.`} onConfirm={() => delM.mutate()} />}
        </div>
      </div>
      {u.role === "teacher" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.classes.map((c) => {
            const on = data.tc.some((t) => t.user_id === u.id && t.class_id === c.id);
            return (
              <label key={c.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted">
                <Checkbox checked={on} onCheckedChange={(v) => toggleClass.mutate({ cid: c.id, on: !!v })} />{c.name}
              </label>
            );
          })}
        </div>
      )}
      {u.role === "admin" && <p className="mt-2 text-xs text-muted-foreground">مدیر به همه کلاس‌ها دسترسی دارد.</p>}
      {u.role === "student" && <p className="mt-2 text-xs text-muted-foreground">{linked ? `پرونده: ${stName(linked.id)} · کلاس ${clsName(linked.class_id)}` : "به پرونده دانش‌آموزی وصل نیست"}</p>}
      {u.role === "parent" && (
        <div className="mt-3"><ChildPicker students={data.students} classes={data.classes} value={children} onChange={(v) => setChildren.mutate(v)} /></div>
      )}
      <Dialog open={pw !== null} onOpenChange={(o) => !o && setPw(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعیین رمز جدید برای {u.full_name}</DialogTitle></DialogHeader>
          <Input dir="ltr" value={pw ?? ""} onChange={(e) => setPw(e.target.value)} maxLength={72} />
          <p className="text-xs text-muted-foreground">پس از ذخیره، این رمز را به کاربر بدهید.</p>
          <DialogFooter><Button disabled={resetM.isPending} onClick={() => { resetM.mutate(pw ?? ""); setPw(null); }}>ذخیره رمز</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
