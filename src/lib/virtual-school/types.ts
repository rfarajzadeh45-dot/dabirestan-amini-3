export const sections = {
  sessions: { title: "کلاس‌های آنلاین", kind: "session" },
  schedule: { title: "برنامه هفتگی آنلاین", kind: "session" },
  assignments: { title: "تکالیف", kind: "assignment" },
  exams: { title: "آزمون‌های آنلاین", kind: "exam" },
  lessons: { title: "درس‌های ضبط‌شده", kind: "lesson" },
  resources: { title: "منابع آموزشی", kind: "resource" },
  questions: { title: "پرسش و پاسخ", kind: "question" },
  attendance: { title: "حضور و غیاب آنلاین", kind: "session" },
  progress: { title: "گزارش پیشرفت", kind: "progress" },
} as const;
export type Section = keyof typeof sections;
export type Kind = "session" | "assignment" | "exam" | "lesson" | "resource" | "question" | "announcement";
export type Activity = {
 id: string; kind: Kind; class_id: string | null; subject_id: string | null; created_by: string;
 student_id: string | null; teacher_name: string; title: string; body: string; objectives: string; rubric: string; chapter: string;
 starts_at: string | null; ends_at: string | null; duration_minutes: number; max_score: number;
 url: string; status: "draft" | "published" | "cancelled"; allow_edits: boolean; allow_late: boolean;
 audience: string[]; release_results: boolean; randomize: boolean; random_count: number; public_question: boolean;
 resolved: boolean; pinned: boolean; created_at: string;
};
export type Submission = { id: string; activity_id: string; student_id: string; answer: string; status: "draft" | "submitted" | "returned" | "graded"; score: number | null; feedback: string; submitted_at: string | null; updated_at: string; grade_id: string | null };
export type ExamQuestion = { id: string; activity_id: string; type: "choice" | "boolean" | "short" | "written"; prompt: string; options: string[]; points: number; sort_order: number; correct_answer?: string; image_url: string };
export type Attempt = { id: string; activity_id: string; student_id: string; started_at: string; expires_at: string; submitted_at: string | null; answers: Record<string, string>; question_ids: string[]; score: number | null; feedback: string; grade_id: string | null };
export type StoredFile = { id: string; activity_id: string; submission_id: string | null; created_by: string; path: string; name: string; mime: string; size: number };
export type SchoolClass = { id: string; name: string; sort_order: number };
export type Student = { id: string; class_id: string; first_name: string; last_name: string; user_id: string | null };
export type Settings = { id: boolean; enabled: boolean; announcement: string; notifications_enabled: boolean; meeting_provider: "external"; provider_name: string };
export type Notification = { id: string; user_id: string; activity_id: string | null; title: string; body: string; read_at: string | null; created_at: string };
export type OnlineAttendance = { id: string; activity_id: string; student_id: string; status: "present" | "absent" | "late"; joined_at: string | null; recorded_by: string; recorded_at: string };
export function isSection(value: string): value is Section { return Object.hasOwn(sections, value); }
