import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, Upload, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { virtualDb, virtualKey, loadActivity, openFile, uploadFile, friendlyError } from "@/lib/virtual-school/client";
import { acceptedFiles } from "@/lib/virtual-school/rules";
import type { Section, Activity, StoredFile } from "@/lib/virtual-school/types";
import { sections } from "@/lib/virtual-school/types";
import { useMe } from "@/lib/auth";
import { useVirtualReferences, VirtualNav, ErrorState, dateTime } from "./shared";
import { ActivityForm } from "./activity-form";
import { AssignmentPanel } from "./assignments";
import { ExamPanel } from "./exams";
import { QuestionPanel } from "./questions";
import { SessionPanel } from "./session";
import { LessonPlayer } from "./lesson";
import { useLowBandwidth } from "./dashboard";
export function VirtualActivityDetail({section,activityId}:{section:Section;activityId:string}){
 const query=useQuery({queryKey:[...virtualKey,'activity',activityId],queryFn:()=>loadActivity(activityId)});
 return <div className="mx-auto max-w-6xl"><VirtualNav active={section}/>{query.error?<ErrorState error={query.error} retry={()=>void query.refetch()}/>:query.data?sections[section].kind!==query.data.kind?<p className="text-sm text-destructive">این فعالیت در بخش انتخاب‌شده نیست.</p>:<Detail key={activityId} activity={query.data} section={section}/>:<p role="status" className="text-sm text-muted-foreground">در حال دریافت فعالیت…</p>}</div>;
}
function Detail({activity,section}:{activity:Activity;section:Section}){
 const {data:me}=useMe();const {classes,students,subjects}=useVirtualReferences(activity.class_id??'');const qc=useQueryClient();const [low]=useLowBandwidth();
 const permission=useQuery({queryKey:[...virtualKey,'manage',activity.id,me?.id],queryFn:async()=>{const {data,error}=await virtualDb.rpc('vs_manage_activity',{_activity:activity.id});if(error)throw error;return data===true;}});
 const canManage=permission.data===true;
 const cancel=useMutation({mutationFn:async()=>{const {error}=await virtualDb.from('vs_activities').update({status:'cancelled'}).eq('id',activity.id);if(error)throw error;},onSuccess:()=>{toast.success('فعالیت لغو شد.');void qc.invalidateQueries({queryKey:virtualKey});},onError:e=>toast.error(friendlyError(e))});
 return <div className="space-y-5"><PageHeader title={activity.title} actions={canManage?<div className="flex gap-2"><ActivityForm kind={activity.kind} initial={activity}/>{activity.kind==='session'&&activity.status!=='cancelled'&&<ConfirmDialog description="جلسه لغو می‌شود و به دانش‌آموزان اطلاع داده خواهد شد." onConfirm={()=>cancel.mutate()} trigger={<Button variant="outline" size="sm"><XCircle/>لغو جلسه</Button>}/>}</div>:undefined}/><p className="text-sm text-muted-foreground">{classes.data?.find(c=>c.id===activity.class_id)?.name} · {subjects.data?.find(s=>s.id===activity.subject_id)?.name} · {activity.teacher_name}</p>{activity.ends_at&&<p className="text-sm text-muted-foreground">{activity.starts_at?'شروع: '+dateTime(activity.starts_at)+' · ':''}پایان: {dateTime(activity.ends_at)}</p>}<p className="whitespace-pre-wrap break-words text-sm leading-8">{activity.body}</p>{activity.objectives&&<p className="whitespace-pre-wrap text-sm leading-7">هدف آموزشی: {activity.objectives}</p>}{activity.rubric&&<p className="whitespace-pre-wrap text-sm leading-7">معیار نمره‌دهی: {activity.rubric}</p>}
 <ActivityFiles activity={activity} canManage={canManage}/>
 {students.error&&<ErrorState error={students.error} retry={()=>void students.refetch()}/>}
 {activity.kind==='assignment'&&<AssignmentPanel activity={activity} students={students.data??[]} canManage={canManage}/>}
 {activity.kind==='exam'&&<ExamPanel activity={activity} students={students.data??[]} canManage={canManage}/>}
 {activity.kind==='session'&&<SessionPanel activity={activity} students={students.data??[]} canManage={canManage}/>}
 {activity.kind==='question'&&<QuestionPanel activity={activity} canManage={canManage}/>}
 {(activity.kind==='lesson'||activity.kind==='resource')&&<><LessonPlayer activity={activity} students={students.data??[]} lowBandwidth={low}/><RelatedActivities activity={activity} section={section}/></>}
 </div>;
}
function ActivityFiles({activity,canManage}:{activity:Activity;canManage:boolean}){
 const qc=useQueryClient();const {data:me}=useMe();const [file,setFile]=useState<File|null>(null);
 const query=useQuery({queryKey:[...virtualKey,'files',activity.id],queryFn:async()=>{const {data,error}=await virtualDb.from('vs_files').select('*').eq('activity_id',activity.id).is('submission_id',null);if(error)throw error;return data as StoredFile[];}});
 const upload=useMutation({mutationFn:async()=>{if(file)await uploadFile(file,activity.id,null);},onSuccess:()=>{setFile(null);toast.success('فایل بارگذاری شد.');void qc.invalidateQueries({queryKey:virtualKey});},onError:e=>toast.error(friendlyError(e))});
 const remove=useMutation({mutationFn:async(f:StoredFile)=>{const storage=await virtualDb.storage.from('virtual-school-private').remove([f.path]);if(storage.error)throw storage.error;const {error}=await virtualDb.from('vs_files').delete().eq('id',f.id);if(error)throw error;},onSuccess:()=>void qc.invalidateQueries({queryKey:virtualKey}),onError:e=>toast.error(friendlyError(e))});
 return <section className="space-y-3">{query.error&&<ErrorState error={query.error} retry={()=>void query.refetch()}/>}{query.data?.length? <h2 className="font-semibold">پیوست‌ها</h2>:null}<ul>{query.data?.map(f=><li key={f.id} className="flex items-center gap-2"><Button variant="link" className="h-auto min-w-0 whitespace-normal text-right" onClick={()=>void openFile(f).catch(e=>toast.error(friendlyError(e)))}><Download className="shrink-0"/>{f.name}</Button>{f.created_by===me?.id&&<ConfirmDialog description="این فایل حذف خواهد شد." onConfirm={()=>remove.mutate(f)} trigger={<Button size="icon" variant="ghost" aria-label="حذف پیوست"><Trash2/></Button>}/>}</li>)}</ul>{(canManage||(activity.kind==='question'&&activity.created_by===me?.id))&&<form className="flex flex-wrap items-center gap-2" onSubmit={e=>{e.preventDefault();upload.mutate();}}><Input type="file" aria-label="پیوست فعالیت" accept={acceptedFiles} className="min-w-48 flex-1" onChange={e=>setFile(e.target.files?.[0]??null)}/><Button type="submit" variant="outline" size="sm" disabled={!file||upload.isPending}><Upload/>بارگذاری</Button></form>}</section>;
}
function RelatedActivities({activity}:{activity:Activity;section:Section}){
 const query=useQuery({queryKey:[...virtualKey,'related',activity.id],queryFn:async()=>{const {data,error}=await virtualDb.from('vs_activities').select('id,title,kind').eq('class_id',activity.class_id).eq('subject_id',activity.subject_id).in('kind',['assignment','lesson','resource']).neq('id',activity.id).limit(6);if(error)throw error;return data as Pick<Activity,'id'|'title'|'kind'>[];}});
 return query.data?.length?<section className="space-y-3 border-t pt-5"><h2 className="font-semibold">درس‌ها و تمرین‌های مرتبط</h2>{query.data.map(a=><Link key={a.id} to="/virtual/$section/$activityId" params={{section:a.kind==='assignment'?'assignments':a.kind==='lesson'?'lessons':'resources',activityId:a.id}} className="block text-sm text-primary hover:underline">{a.title}</Link>)}</section>:null;
}
