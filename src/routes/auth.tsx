import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/lib/backend-client";
import { loginErrorMessage } from "@/lib/login-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "ورود | سامانه مدیریت مدرسه" },
      { name: "description", content: "ورود مدیران و معلمان به سامانه مدیریت مدرسه" },
      { property: "og:title", content: "ورود | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "ورود مدیران و معلمان به سامانه مدیریت مدرسه" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("ایمیل معتبر نیست").max(255),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر باشد").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "ورودی نامعتبر"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(p.data);
    setLoading(false);
    if (error) { toast.error(loginErrorMessage(error)); return; }
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "ورودی نامعتبر"); return; }
    if (!name.trim()) { toast.error("نام و نام خانوادگی را وارد کنید"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      ...p.data,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) navigate({ to: "/dashboard" });
    else toast.success("ثبت‌نام انجام شد. لطفاً ایمیل خود را برای تأیید حساب بررسی کنید.");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-hero text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary-foreground/10">
            <GraduationCap className="size-6" />
          </div>
          <span className="text-lg font-bold">سامانه مدیریت مدرسه</span>
        </div>
        <div className="animate-rise">
          <h1 className="text-4xl font-extrabold leading-tight">مدیریت هوشمند کلاس‌ها،<br />در یک نگاه.</h1>
          <p className="mt-4 max-w-md text-primary-foreground/75">
            حضور و غیاب با یک کلیک، ثبت نمرات، یادداشت‌های آموزشی و پرونده کامل هر دانش‌آموز.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">ویژه مدیران و معلمان</p>
        <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-primary-foreground/5" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 size-[28rem] rounded-full bg-primary-foreground/5" />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden flex items-center gap-2 text-primary">
            <GraduationCap className="size-7" />
            <span className="font-bold">سامانه مدیریت مدرسه</span>
          </div>
          <h2 className="text-2xl font-bold">خوش آمدید</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">برای ادامه وارد حساب خود شوید.</p>
          <Tabs defaultValue="in" dir="rtl">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="in">ورود</TabsTrigger>
              <TabsTrigger value="up">ثبت‌نام</TabsTrigger>
            </TabsList>
            <TabsContent value="in">
              <form onSubmit={signIn} className="mt-4 space-y-4">
                <Field label="ایمیل"><Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                <Field label="رمز عبور"><Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                <Button className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}ورود</Button>
              </form>
            </TabsContent>
            <TabsContent value="up">
              <form onSubmit={signUp} className="mt-4 space-y-4">
                <Field label="نام و نام خانوادگی"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
                <Field label="ایمیل"><Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                <Field label="رمز عبور"><Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                <Button className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}ایجاد حساب</Button>
                <p className="text-xs text-muted-foreground">اولین کاربر ثبت‌نام‌شده به‌عنوان مدیر شناخته می‌شود؛ کاربران بعدی معلم هستند.</p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
