import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidUsername, normalizeUsername, usernameToEmail } from "@/lib/username";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || data !== true) throw new Error("فقط مدیر مدرسه اجازه این کار را دارد");
}

const password = z.string().min(6, "رمز عبور حداقل ۶ کاراکتر باشد").max(72);

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      role: z.enum(["student", "parent", "teacher", "admin"]),
      username: z.string().max(40),
      password,
      fullName: z.string().trim().min(1, "نام را وارد کنید").max(80),
      studentId: z.string().uuid().optional(),
      childIds: z.array(z.string().uuid()).max(10).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const username = normalizeUsername(data.username);
    if (!isValidUsername(username)) throw new Error("نام کاربری فقط حروف انگلیسی، عدد، نقطه، - و _ (۳ تا ۳۲ کاراکتر)");
    if (data.role === "student" && !data.studentId) throw new Error("دانش‌آموز را انتخاب کنید");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
      app_metadata: { role: data.role, username },
    });
    if (error || !created.user) {
      if (/already|exists|registered/i.test(error?.message ?? "")) throw new Error("این نام کاربری قبلاً استفاده شده است");
      if (/weak|guess|pwned/i.test(error?.message ?? "")) throw new Error("این رمز بسیار ساده یا لو رفته است؛ رمز دیگری انتخاب کنید");
      throw new Error("ساخت حساب ناموفق بود: " + (error?.message ?? ""));
    }
    const id = created.user.id;
    // The signup trigger may run before app metadata is stored, so set role and username explicitly.
    await supabaseAdmin.from("profiles").update({ username, full_name: data.fullName }).eq("id", id);
    const { data: hasRole } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", id).eq("role", data.role).maybeSingle();
    if (!hasRole) {
      const { error: re } = await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.role });
      if (re) { await supabaseAdmin.auth.admin.deleteUser(id); throw new Error("تعیین نقش ناموفق بود"); }
    }
    if (data.role === "student" && data.studentId) {
      const { error: e } = await supabaseAdmin.from("students").update({ user_id: id }).eq("id", data.studentId);
      if (e) {
        await supabaseAdmin.auth.admin.deleteUser(id);
        throw new Error("این دانش‌آموز قبلاً حساب کاربری دارد");
      }
    }
    if (data.role === "parent" && data.childIds?.length) {
      await supabaseAdmin.from("parent_children").insert(data.childIds.map((student_id) => ({ parent_id: id, student_id })));
    }
    return { id, username };
  });

export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ userId: z.string().uuid(), password }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(/weak|guess|pwned/i.test(error.message) ? "این رمز بسیار ساده یا لو رفته است؛ رمز دیگری انتخاب کنید" : "تغییر رمز ناموفق بود");
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("نمی‌توانید حساب خودتان را حذف کنید");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("students").update({ user_id: null }).eq("user_id", data.userId);
    await supabaseAdmin.from("parent_children").delete().eq("parent_id", data.userId);
    await supabaseAdmin.from("teacher_classes").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("حذف حساب ناموفق بود");
    return { ok: true };
  });
