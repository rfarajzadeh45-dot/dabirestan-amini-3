import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubjectProgressChart } from "@/components/subject-charts";
import { virtualDb, virtualKey } from "@/lib/virtual-school/client";
import { fetchAll } from "@/lib/fetch-all";
import { useVirtualReferences, ErrorState } from "./shared";
import { fa, faNum } from "@/lib/fa";
import type { Student, Submission, OnlineAttendance } from "@/lib/virtual-school/types";
export function VirtualProgress(){
 const {students}=useVirtualReferences();const [selected,setSelected]=useState('');const current=students.data?.find(s=>s.id===selected)??students.data?.[0];
 return <section className="space-y-5"><Select value={current?.id??''} onValueChange={setSelected}><SelectTrigger className="w-full sm:w-72" aria-label="دانش‌آموز گزارش"><SelectValue placeholder="انتخاب دانش‌آموز"/></SelectTrigger><SelectContent>{students.data?.map(s=><SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent></Select>{students.error&&<ErrorState error={students.error} retry={()=>void students.refetch()}/>}{current?<StudentVirtualProgress student={current}/>:<p className="text-sm text-muted-foreground">دانش‌آموزی برای گزارش در دسترس نیست.</p>}</section>;
}
function StudentVirtualProgress({student}:{student:Student}){
 const {subjects}=useVirtualReferences(student.class_id);
 const query=useQuery({queryKey:[...virtualKey,'progress',student.id],queryFn:async()=>{
  const [grades,submissions,attendance]=await Promise.all([
   fetchAll((f,t)=>virtualDb.from('grades').select('subject_id,score,date').eq('student_id',student.id).order('id').range(f,t)),
   fetchAll((f,t)=>virtualDb.from('vs_submissions').select('*').eq('student_id',student.id).order('id').range(f,t)),
   fetchAll((f,t)=>virtualDb.from('vs_online_attendance').select('*').eq('student_id',student.id).order('id').range(f,t))]);
  for(const r of [grades,submissions,attendance])if(r.error)throw r.error;
  return{grades:grades.data as {subject_id:string;score:number;date:string}[],submissions:submissions.data as Submission[],attendance:attendance.data as OnlineAttendance[]};
 }});
 if(query.error)return <ErrorState error={query.error} retry={()=>void query.refetch()}/>;
 if(!query.data)return <p role="status" className="text-sm text-muted-foreground">در حال دریافت گزارش…</p>;
 const result=query.data;const graded=result.submissions.filter(s=>s.status==='graded').length;
 return <div className="space-y-6"><dl className="grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-4"><div><dt className="text-xs text-muted-foreground">تکالیف تحویل‌شده</dt><dd className="mt-2 text-2xl font-bold">{fa(result.submissions.filter(s=>s.status!=='draft').length)}</dd></div><div><dt className="text-xs text-muted-foreground">تکالیف نمره‌داده‌شده</dt><dd className="mt-2 text-2xl font-bold">{fa(graded)}</dd></div><div><dt className="text-xs text-muted-foreground">جلسات حضور</dt><dd className="mt-2 text-2xl font-bold">{fa(result.attendance.filter(a=>a.status!=='absent').length)}</dd></div><div><dt className="text-xs text-muted-foreground">غیبت آنلاین</dt><dd className="mt-2 text-2xl font-bold">{fa(result.attendance.filter(a=>a.status==='absent').length)}</dd></div></dl><h2 className="font-semibold">پیشرفت به تفکیک درس</h2><SubjectProgressChart subjects={subjects.data??[]} grades={result.grades}/><h2 className="font-semibold">بازخورد معلمان</h2><ul className="divide-y">{result.submissions.filter(s=>s.feedback).map(s=><li key={s.id} className="py-3 text-sm"><p className="whitespace-pre-wrap">{s.feedback}</p>{s.score!==null&&<span className="text-xs text-muted-foreground">نمره {faNum(s.score,2)}</span>}</li>)}</ul></div>;
}
