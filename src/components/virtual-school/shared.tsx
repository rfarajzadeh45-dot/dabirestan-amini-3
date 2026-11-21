import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, FileText, Video, BookOpen, MessageCircle, ClipboardCheck, BarChart3, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadClasses, loadStudents, virtualDb, virtualKey, friendlyError } from "@/lib/virtual-school/client";
import { sections, type Section } from "@/lib/virtual-school/types";
import { fa, jalali } from "@/lib/fa";
import { supabase } from "@/integrations/supabase/client";
export const sectionIcons = { sessions: Video, schedule: CalendarDays, assignments: FileText, exams: ClipboardCheck, lessons: Video, resources: BookOpen, questions: MessageCircle, attendance: Users, progress: BarChart3 };
export function dateTime(value: string | null) {
 if (!value) return "—";
 const date = new Date(value);
 return `${jalali(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(date))} · ${new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" }).format(date)}`;
}
export function useVirtualReferences(classId = "") {
 const classes = useQuery({ queryKey: ["classes"], queryFn: loadClasses });
 const students = useQuery({ queryKey: [...virtualKey, "students"], queryFn: loadStudents });
 const subjects = useQuery({ queryKey: ["class-subjects", classId], enabled: !!classId, queryFn: async () => {
  const { data, error } = await supabase.from("class_subjects").select("subjects(id,name)").eq("class_id", classId);
  if (error) throw error;
  return (data ?? []).flatMap((r: { subjects: { id: string; name: string } | null }) => r.subjects ? [r.subjects] : []);
 }});
 return { classes, students, subjects };
}
export function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
 return <div role="alert" className="space-y-3 border-y py-6"><p className="text-sm text-destructive">{friendlyError(error)}</p><Button variant="outline" onClick={retry}>تلاش دوباره</Button></div>;
}
export function VirtualNav({ active }: { active?: Section }) {
 return <nav aria-label="بخش‌های مدرسه مجازی" className="mb-6 flex gap-2 overflow-x-auto border-b pb-3">
  <Button asChild variant="ghost" size="sm"><Link to="/virtual"><ArrowRight />مدرسه مجازی</Link></Button>
  {(Object.keys(sections) as Section[]).map((key) => { const Icon = sectionIcons[key]; return <Button key={key} asChild variant={key === active ? "secondary" : "ghost"} size="sm" className="shrink-0"><Link to="/virtual/$section" params={{ section: key }}><Icon className="size-4" />{sections[key].title}</Link></Button>; })}
 </nav>;
}
export function ClassFilter({ value, onChange, all = true }: { value: string; onChange: (value: string) => void; all?: boolean }) {
 const { classes } = useVirtualReferences();
 return <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}><SelectTrigger className="w-full sm:w-56" aria-label="کلاس مدرسه مجازی"><SelectValue placeholder="انتخاب کلاس" /></SelectTrigger><SelectContent>{all && <SelectItem value="all">همه کلاس‌های من</SelectItem>}{classes.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>;
}
export function Pager({ page, onChange, hasNext }: { page: number; onChange: (page: number) => void; hasNext: boolean }) {
 return <div className="mt-5 flex items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={page===0} onClick={() => onChange(page-1)}>قبلی</Button><span className="text-sm">{fa(page+1)}</span><Button variant="outline" size="sm" disabled={!hasNext} onClick={() => onChange(page+1)}>بعدی</Button></div>;
}
