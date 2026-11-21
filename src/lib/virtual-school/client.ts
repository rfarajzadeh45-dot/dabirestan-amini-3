import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Activity, Settings, SchoolClass, Student, StoredFile } from "./types";
import { validateFile } from "./rules";
// These additive tables are installed on the school's external VPS, not the managed database.
// Reuse the generated client's identity and token; never create a second auth client.
export const virtualDb = supabase as unknown as SupabaseClient;
export const virtualKey = ["virtual-school"];
export const BUCKET = "virtual-school-private";
export function friendlyError(error: unknown) {
 const value = error as { code?: string; message?: string };
 if (value.code === "PGRST205" || value.code === "42P01") return "مدرسه مجازی هنوز روی این نسخه نصب نشده است؛ نصب باید روی سرور تهران انجام شود.";
 if (value.code === "42501") return "اجازه دسترسی به این اطلاعات را ندارید.";
 return value.message || "ارتباط برقرار نشد؛ دوباره تلاش کنید.";
}
export async function loadSettings(): Promise<Settings | null> {
 const { data, error } = await virtualDb.from("vs_settings").select("*").eq("id", true).maybeSingle();
 if (error) throw error; return data as Settings | null;
}
export async function loadClasses(): Promise<SchoolClass[]> {
 const { data, error } = await supabase.from("classes").select("id,name,sort_order").order("sort_order");
 if (error) throw error; return data;
}
export async function loadStudents(): Promise<Student[]> {
 const { data, error } = await supabase.from("students").select("id,class_id,first_name,last_name,user_id").order("last_name");
 if (error) throw error; return data;
}
export async function loadActivity(id: string): Promise<Activity> {
 const { data, error } = await virtualDb.from("vs_activities").select("*").eq("id", id).single();
 if (error) throw error; return data as Activity;
}
export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
 const { data, error } = await virtualDb.rpc(name, args); if (error) throw error; return data as T;
}
export async function uploadFile(file: File, activityId: string, submissionId: string | null): Promise<void> {
 validateFile(file);
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) throw new Error("ابتدا وارد حساب خود شوید.");
 const id = crypto.randomUUID();
 const path = `${activityId}/${id}`;
 const { error } = await virtualDb.from("vs_files").insert({ id, activity_id: activityId, submission_id: submissionId, created_by: user.id, path, name: file.name, mime: file.type, size: file.size });
 if (error) throw error;
 const result = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
 if (result.error) { await virtualDb.from("vs_files").delete().eq("id", id); throw result.error; }
}
export async function openFile(file: StoredFile) {
 const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.path, 60);
 if (error) throw error;
 window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
