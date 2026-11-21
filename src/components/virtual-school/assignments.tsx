import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Send, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe } from "@/lib/auth";
import { virtualDb, virtualKey, friendlyError, uploadFile, openFile } from "@/lib/virtual-school/client";
import { acceptedFiles, canEditSubmission, submissionState } from "@/lib/virtual-school/rules";
import type { Activity, Submission, Student, StoredFile } from "@/lib/virtual-school/types";
import { faNum } from "@/lib/fa";
import { downloadBlob } from "@/lib/export";
import { ErrorState, dateTime } from "./shared";
export const statusLabel: Record<string,string>={draft:'پیش‌نویس',submitted:'تحویل‌شده',returned:'نیاز به اصلاح',graded:'نمره‌داده‌شده',pending:'در انتظار تحویل',overdue:'مهلت گذشته'};
export function AssignmentPanel({activity,students,canManage}:{activity:Activity;students:Student[];canManage:boolean}){
 const {data:me}=useMe(); const qc=useQueryClient(); const [answer,setAnswer]=useState(''); const [files,setFiles]=useState<File[]>([]); const [filter,setFilter]=useState('all');
 const mine=students.find(s=>s.user_id===me?.id);
 const query=useQuery({queryKey:[...virtualKey,'submissions',activity.id],queryFn:async()=>{const {data,error}=await virtualDb.from('vs_submissions').select('*').eq('activity_id',activity.id).order('updated_at',{ascending:false});if(error)throw error;return data as Submission[];}});
 const existing=query.data?.find(s=>s.student_id===mine?.id);
 useEffect(()=>{setAnswer(existing?.answer??'');},[existing?.id]);
 const save=useMutation({mutationFn:async(submit:boolean)=>{
  if(!mine)throw new Error('حساب شما به دانش‌آموز این کلاس متصل نیست.');
  const payload={activity_id:activity.id,student_id:mine.id,answer,status:'draft'};
  const result=existing?await virtualDb.from('vs_submissions').update(payload).eq('id',existing.id).select('*').single():await virtualDb.from('vs_submissions').insert(payload).select('*').single();
  if(result.error)throw result.error;
  for(const file of files)await uploadFile(file,activity.id,String(result.data['id']));
  if(submit){const {error}=await virtualDb.from('vs_submissions').update({status:'submitted'}).eq('id',String(result.data['id']));if(error)throw error;}
  return submit;
 },onSuccess:(submitted)=>{toast.success(submitted?'تکلیف تحویل داده شد.':'پیش‌نویس ذخیره شد.');setFiles([]);void qc.invalidateQueries({queryKey:virtualKey});},onError:e=>toast.error(friendlyError(e))});
 const editable=!!mine&&(!existing?(activity.allow_late||!activity.ends_at||Date.now()<=Date.parse(activity.ends_at)):canEditSubmission(activity,existing.status,new Date()));
 const exportResults=()=>{
  const escape=(x:string)=>`"${x.replaceAll('"','""')}"`; const roster=students.filter(s=>s.class_id===activity.class_id&&(activity.audience.length===0||activity.audience.includes(s.id)));
  const rows=roster.map(s=>{const sub=query.data?.find(r=>r.student_id===s.id);return [s.first_name+' '+s.last_name,statusLabel[submissionState(activity.ends_at,sub,new Date())]??'',sub?.score===null||sub?.score===undefined?'':String(sub.score),sub?.feedback??''].map(escape).join(',');});
  downloadBlob(new Blob(['\uFEFFنام,وضعیت,نمره,بازخورد\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'}),'assignment-results.csv');
 };
 if(query.error)return <ErrorState error={query.error} retry={()=>void query.refetch()}/>;
 if(query.isLoading)return <p role="status" className="text-sm text-muted-foreground">در حال دریافت تکالیف…</p>;
 const roster=students.filter(s=>s.class_id===activity.class_id&&(activity.audience.length===0||activity.audience.includes(s.id)));
 return <section className="space-y-5 border-t pt-5">
  <h2 className="font-semibold">{canManage?'تحویل تکالیف':'پاسخ تکلیف'}</h2>
  {mine&&<div className="space-y-3"><p className="text-sm text-muted-foreground">وضعیت: {statusLabel[submissionState(activity.ends_at,existing,new Date())]}</p><Textarea aria-label="پاسخ تکلیف" rows={6} value={answer} disabled={!editable||save.isPending} onChange={e=>setAnswer(e.target.value)}/>
   {editable&&<><label className="flex items-center gap-2 text-sm"><Upload className="size-4"/>پیوست پاسخ<Input type="file" multiple accept={acceptedFiles} disabled={save.isPending} onChange={e=>setFiles(Array.from(e.target.files??[]))}/></label><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={save.isPending} onClick={()=>save.mutate(false)}><Save/>ذخیره پیش‌نویس</Button><Button disabled={save.isPending||(!answer.trim()&&!files.length)} onClick={()=>save.mutate(true)}><Send/>تحویل تکلیف</Button></div></>}
  </div>}
  {canManage&&<div className="flex flex-wrap gap-3"><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-52" aria-label="وضعیت تحویل"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">همه دانش‌آموزان</SelectItem>{Object.entries(statusLabel).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={exportResults}><Download/>دریافت نتایج</Button></div>}
  {roster.filter(s=>canManage||query.data?.some(r=>r.student_id===s.id)).map(student=>{const sub=query.data?.find(r=>r.student_id===student.id);const state=submissionState(activity.ends_at,sub,new Date());if(filter!=='all'&&state!==filter)return null;return <div key={student.id} className="space-y-2 border-b pb-4">
   <div className="flex flex-wrap items-center gap-3 text-sm"><h3 className="font-semibold">{student.first_name} {student.last_name}</h3><span className="text-muted-foreground">{statusLabel[state]}</span>{sub?.submitted_at&&<span className="text-xs text-muted-foreground">{dateTime(sub.submitted_at)}{activity.ends_at&&sub.submitted_at>activity.ends_at?' · دیرهنگام':''}</span>}</div>
   {sub&&<><p className="whitespace-pre-wrap break-words text-sm leading-7">{sub.answer}</p><SubmissionFiles id={sub.id} activityId={activity.id}/>{sub.score!==null&&<p className="font-semibold">نمره: {faNum(sub.score,2)} از {faNum(activity.max_score)}</p>}{sub.feedback&&<p className="whitespace-pre-wrap text-sm text-muted-foreground">بازخورد: {sub.feedback}</p>}{canManage&&sub.status!=='draft'&&<GradeSubmission submission={sub} maxScore={activity.max_score}/>}</>}
  </div>;})}
 </section>;
}
function SubmissionFiles({id,activityId}:{id:string;activityId:string}){
 const query=useQuery({queryKey:[...virtualKey,'submission-files',id],queryFn:async()=>{const {data,error}=await virtualDb.from('vs_files').select('*').eq('activity_id',activityId).eq('submission_id',id);if(error)throw error;return data as StoredFile[];}});
 return <ul className="space-y-1">{query.data?.map(f=><li key={f.id}><Button variant="link" size="sm" onClick={()=>void openFile(f).catch(e=>toast.error(friendlyError(e)))}><Download/>{f.name}</Button></li>)}</ul>;
}
function GradeSubmission({submission,maxScore}:{submission:Submission;maxScore:number}){
 const qc=useQueryClient();const [score,setScore]=useState(submission.score===null?'':String(submission.score));const [feedback,setFeedback]=useState(submission.feedback);
 const save=useMutation({mutationFn:async(returned:boolean)=>{const value=Number(score);if(!returned&&(!score||value<0||value>maxScore))throw new Error('نمره معتبر وارد کنید.');const {error}=await virtualDb.from('vs_submissions').update({status:returned?'returned':'graded',score:returned?null:value,feedback}).eq('id',submission.id);if(error)throw error;},onSuccess:()=>{toast.success('بازخورد ذخیره شد.');void qc.invalidateQueries({queryKey:virtualKey});void qc.invalidateQueries({queryKey:['report-grades']});},onError:e=>toast.error(friendlyError(e))});
 return <form className="flex flex-wrap items-start gap-2" onSubmit={e=>{e.preventDefault();save.mutate(false);}}><Input aria-label="نمره تکلیف" type="number" min="0" max={maxScore} step="0.25" className="w-24" value={score} onChange={e=>setScore(e.target.value)}/><Input aria-label="بازخورد معلم" className="min-w-48 flex-1" value={feedback} onChange={e=>setFeedback(e.target.value)}/><Button type="submit" size="sm" disabled={save.isPending}>ثبت نمره</Button><Button type="button" size="sm" variant="outline" disabled={save.isPending} onClick={()=>save.mutate(true)}>بازگشت برای اصلاح</Button></form>;
}
