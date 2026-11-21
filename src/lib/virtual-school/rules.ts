import type { Activity, ExamQuestion } from "./types";
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const acceptedFiles = "image/jpeg,image/png,image/webp,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation";
export function validateFile(file: { size: number; type: string }) {
 if (!acceptedFiles.split(",").includes(file.type)) throw new Error("نوع فایل مجاز نیست؛ تصویر، پی‌دی‌اف، متن، ورد یا پاورپوینت انتخاب کنید.");
 if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw new Error("حجم فایل باید بیشتر از صفر و حداکثر ۲۰ مگابایت باشد.");
}
export function safeExternalUrl(value: string): string {
 if (!value.trim()) return "";
 try { const url = new URL(value); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); return url.toString(); }
 catch { throw new Error("نشانی باید معتبر و با https آغاز شود."); }
}
export function schoolDateTime(date: string, time: string) {
 const value = new Date(`${date}T${time}:00+03:30`);
 if (!Number.isFinite(value.getTime())) throw new Error("تاریخ یا ساعت معتبر نیست.");
 return value.toISOString();
}
export function validateTiming(start: string, end: string) {
 if (new Date(end).getTime() <= new Date(start).getTime()) throw new Error("زمان پایان باید بعد از شروع باشد.");
}
export function canEditSubmission(activity: Pick<Activity, "allow_edits" | "ends_at">, status: string, now: Date) {
 return (!activity.ends_at || now.getTime() <= new Date(activity.ends_at).getTime()) && (status === "draft" || status === "returned" || activity.allow_edits && status === "submitted");
}
export function autoScore(questions: ExamQuestion[], answers: Record<string, string>): { score: number; manual: boolean } {
 return questions.reduce<{ score: number; manual: boolean }>((result, q) => {
  if (q.type === "written" || q.type === "short") return { ...result, manual: true };
  const answer = answers[q.id];
  return { ...result, score: result.score + (answer !== undefined && answer === q.correct_answer ? q.points : 0) };
 }, { score: 0, manual: false });
}
export function submissionState(deadline: string | null, submission: { status: string } | undefined, now: Date) {
 if (submission && submission.status !== "draft") return submission.status;
 return deadline && now.getTime() > new Date(deadline).getTime() ? "overdue" : "pending";
}
export function examAvailable(start: string | null, end: string | null, now: Date) {
 return !!start && !!end && now.getTime() >= Date.parse(start) && now.getTime() < Date.parse(end);
}
