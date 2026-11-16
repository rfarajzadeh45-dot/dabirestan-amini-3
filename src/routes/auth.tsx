import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Loader2, BookOpen, Users, Presentation, ShieldCheck, ArrowRight, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyRole } from "@/lib/auth";
import { homeForRole, isValidUsername, normalizeUsername, roleLabel, usernameToEmail, type AppRole } from "@/lib/username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "ورود | سامانه مدیریت مدرسه" },
      { name: "description", content: "ورود دانش‌آموزان، والدین، معلمان و مدیر به سامانه مدیریت مدرسه" },
      { property: "og:title", content: "ورود | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "ورود دانش‌آموزان، والدین، معلمان و مدیر به سامانه مدیریت مدرسه" },
    ],
  }),
  component: AuthPage,
});

const portals: { role: AppRole; icon: LucideIcon; desc: string }[] = [
  { role: "student", icon: BookOpen, desc: "مشاهده نمرات، حضور و کارنامه" },
  { role: "parent", icon: Users, desc: "پیگیری وضعیت تحصیلی فرزند" },
  { role: "teacher", icon: Presentation, desc: "حضور و غیاب، نمره و یادداشت" },
  { role: "admin", icon: ShieldCheck, desc: "مدیریت کامل مدرسه و حساب‌ها" },
];

function AuthPage() {
  const navigate = useNavigate();
  const [portal, setPortal] = useState<AppRole | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const u = normalizeUsername(username);
    if (!isValidUsername(u)) { toast.error("نام کاربری معتبر نیست"); return; }
    if (password.length < 6) { toast.error("رمز عبور را وارد کنید"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(u), password });
    if (error || !data.user) { setLoading(false); toast.error("نام کاربری یا رمز عبور نادرست است"); return; }
    const role = await fetchMyRole(data.user.id);
    if (role !== portal) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error(role ? `این حساب مربوط به بخش «${roleLabel[role]}» است. از همان بخش وارد شوید.` : "برای این حساب نقشی تعریف نشده است. با مدیر مدرسه تماس بگیرید.");
      return;
    }
    setLoading(false);
    navigate({ to: homeForRole(role), replace: true });
  }

  const active = portals.find((p) => p.role === portal);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-hero text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary-foreground/10"><GraduationCap className="size-6" /></div>
          <span className="text-lg font-bold">سامانه مدیریت مدرسه</span>
        </div>
        <div className="animate-rise">
          <h1 className="text-4xl font-extrabold leading-tight">یک سامانه،<br />برای همه اعضای مدرسه.</h1>
          <p className="mt-4 max-w-md text-primary-foreground/75">دانش‌آموزان، والدین، معلمان و مدیر هر کدام با نام کاربری خود وارد پنل اختصاصی‌شان می‌شوند.</p>
        </div>
        <p className="text-sm text-primary-foreground/60">دبیرستان امینی ۳</p>
        <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-primary-foreground/5" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 size-[28rem] rounded-full bg-primary-foreground/5" />
      </div>

      <div className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-6 flex items-center gap-2 text-primary lg:hidden">
            <GraduationCap className="size-7" /><span className="font-bold">سامانه مدیریت مدرسه</span>
          </div>
          {!active ? (
            <>
              <h2 className="text-2xl font-bold">خوش آمدید</h2>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">نوع ورود خود را انتخاب کنید.</p>
              <div className="grid grid-cols-2 gap-3">
                {portals.map((p, i) => (
                  <button key={p.role} type="button" onClick={() => { setPortal(p.role); setUsername(""); setPassword(""); }}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className="animate-rise group flex flex-col items-start gap-3 rounded-2xl border bg-card p-4 text-right shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lift">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <p.icon className="size-5" />
                    </span>
                    <span>
                      <span className="block font-bold">ورود {roleLabel[p.role]}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{p.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <button type="button" onClick={() => setPortal(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <ArrowRight className="size-4" />تغییر نوع ورود
              </button>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><active.icon className="size-5" /></span>
                <div>
                  <h2 className="text-xl font-bold">ورود {roleLabel[active.role]}</h2>
                  <p className="text-xs text-muted-foreground">{active.desc}</p>
                </div>
              </div>
              <form onSubmit={signIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">نام کاربری</Label>
                  <Input id="username" dir="ltr" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">رمز عبور</Label>
                  <Input id="password" dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className={cn("w-full")} disabled={loading}>{loading && <Loader2 className="animate-spin" />}ورود</Button>
                <p className="text-center text-xs text-muted-foreground">نام کاربری و رمز را از مدیر مدرسه دریافت کنید. برای بازیابی رمز با مدیر تماس بگیرید.</p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
