import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRound, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fa } from "@/lib/fa";
import {
  useCountdown, isRateLimited, RESET_RESEND_SECONDS, MAX_CODE_ATTEMPTS, CODE_LIFETIME_SECONDS,
} from "@/lib/auth-timers";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "بازیابی رمز عبور | سامانه مدیریت مدرسه" },
      { name: "description", content: "بازیابی رمز عبور با کد تأیید ایمیلی" },
      { property: "og:title", content: "بازیابی رمز عبور | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "بازیابی رمز عبور با کد تأیید ایمیلی" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPage,
});

const emailSchema = z.string().trim().email("ایمیل معتبر نیست").max(255);
type Step = "email" | "code" | "password";

function ForgotPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const resendLeft = useCountdown(resendAt);
  const expiryLeft = useCountdown(sentAt ? sentAt + CODE_LIFETIME_SECONDS * 1000 : null);

  // Fallback: the recovery link in the email also verifies the user.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStep("password");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function send() {
    const p = emailSchema.safeParse(email);
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "ایمیل نامعتبر"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(p.data, {
      redirectTo: `${window.location.origin}/forgot-password`,
    });
    setLoading(false);
    if (error && isRateLimited(error)) { toast.error("درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید."); return; }
    if (error && error.status && error.status >= 500) { toast.error("ارسال ایمیل با خطا مواجه شد. دوباره تلاش کنید."); return; }
    // Same message whether or not the email exists.
    toast.success("اگر این ایمیل در سامانه ثبت شده باشد، کد تأیید برای آن ارسال شد.");
    setEmail(p.data); setCode(""); setAttempts(0);
    setSentAt(Date.now()); setResendAt(Date.now() + RESET_RESEND_SECONDS * 1000);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (expiryLeft === 0) { toast.error("کد منقضی شده است. کد جدید درخواست کنید."); return; }
    if (attempts >= MAX_CODE_ATTEMPTS) { toast.error("تعداد تلاش‌های ناموفق زیاد است. کد جدید درخواست کنید."); return; }
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(token)) { toast.error("کد تأیید باید ۶ تا ۸ رقم باشد"); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
    setLoading(false);
    if (error) {
      const n = attempts + 1; setAttempts(n);
      if (isRateLimited(error)) toast.error("تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره امتحان کنید.");
      else toast.error(`کد نادرست است یا دیگر معتبر نیست. ${fa(Math.max(0, MAX_CODE_ATTEMPTS - n))} تلاش باقی مانده.`);
      return;
    }
    toast.success("کد با موفقیت تأیید شد.");
    setStep("password");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6 || pw.length > 72) { toast.error("رمز عبور باید ۶ تا ۷۲ کاراکتر باشد"); return; }
    if (pw !== pw2) { toast.error("رمز عبور و تکرار آن یکسان نیست"); return; }
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); toast.error("نشست تأیید منقضی شده است. دوباره کد بگیرید."); setStep("email"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setLoading(false); toast.error("تغییر رمز عبور انجام نشد: " + error.message); return; }
    await supabase.auth.signOut();
    setLoading(false);
    toast.success("رمز عبور تغییر کرد. با رمز جدید وارد شوید.");
    navigate({ to: "/auth" });
  }

  const locked = attempts >= MAX_CODE_ATTEMPTS || expiryLeft === 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm animate-rise">
        <div className="mb-6 flex items-center gap-2 text-primary">
          <KeyRound className="size-7" /><span className="font-bold">بازیابی رمز عبور</span>
        </div>

        {step === "email" && (
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="space-y-4">
            <p className="text-sm text-muted-foreground">ایمیل ثبت‌شده خود را وارد کنید تا کد تأیید برایتان ارسال شود.</p>
            <div className="space-y-1.5"><Label>ایمیل</Label>
              <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}ارسال کد تأیید</Button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verify} className="space-y-4">
            <p className="text-sm text-muted-foreground">کد ارسال‌شده به <span dir="ltr" className="font-medium text-foreground">{email}</span> را وارد کنید.</p>
            <div className="space-y-1.5"><Label>کد تأیید</Label>
              <Input dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={8} className="text-center tracking-[0.5em] text-lg"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div>
            <p className="text-xs text-muted-foreground">
              {expiryLeft > 0 ? `اعتبار کد: ${fa(Math.floor(expiryLeft / 60))}:${fa(String(expiryLeft % 60).padStart(2, "0"))}` : "کد منقضی شده است."}
              {" · "}تلاش باقی‌مانده: {fa(Math.max(0, MAX_CODE_ATTEMPTS - attempts))}
            </p>
            <Button className="w-full" disabled={loading || locked}>{loading && <Loader2 className="animate-spin" />}تأیید کد</Button>
            <Button type="button" variant="outline" className="w-full" disabled={loading || resendLeft > 0} onClick={() => void send()}>
              {resendLeft > 0 ? `ارسال مجدد کد تا ${fa(resendLeft)} ثانیه دیگر` : "ارسال مجدد کد"}
            </Button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={save} className="space-y-4">
            <p className="text-sm text-muted-foreground">رمز عبور جدید خود را وارد کنید.</p>
            <div className="space-y-1.5"><Label>رمز عبور جدید</Label>
              <Input dir="ltr" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>تکرار رمز عبور</Label>
              <Input dir="ltr" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
            <Button className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}ذخیره رمز جدید</Button>
          </form>
        )}

        <Link to="/auth" className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowRight className="size-4" />بازگشت به ورود
        </Link>
      </div>
    </div>
  );
}
