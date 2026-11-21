import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Video, Copy, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { virtualDb, virtualKey, rpc, friendlyError } from "@/lib/virtual-school/client";
import type { Activity, Student, OnlineAttendance } from "@/lib/virtual-school/types";
import { ErrorState, dateTime } from "./shared";
import { cn } from "@/lib/utils";
export function SessionPanel({activity,students,canManage}:{activity:Activity;students:Student[];canManage:boolean}){
 const {data:me}=useMe();const qc=useQueryClient();const mine=students.find(s=>s.user_id===me?.id);
 const query=useQuery({queryKey:[...virtualKey,'online-attendance',activity.id],queryFn:async()=>{const {data,error}=await virtualDb.from('vs_online_attendance').select('*').eq('activity_id',activity.id);if(error)throw error;return data as OnlineAttendance[];}});
 const joins=useQuery({queryKey:[...virtualKey,'session-joins',activity.id],enabled:canManage,queryFn:async()=>{const {data,error}=await virtualDb.from('vs_messages').select('created_by,created_at').eq('activity_id',activity.id).order('created_at');if(error)throw error;return data as {created_by:string;created_at:string}[];}});
 const mark=useMutation({mutationFn:async({id,status}:{id:string;status:'present'|'absent'|'late'})=>{const {error}=await virtualDb.from('vs_online_attendance').upsert({activity_id:activity.id,student_id:id,status},{onConflict:'activity_id,student_id'});if(error)throw error;},onSuccess:()=>void qc.invalidateQueries({queryKey:virtualKey}),onError:e=>toast.error(friendlyError(e))});
 const join=useMutation({mutationFn:async()=>{if(mine)await rpc('vs_join_session',{_activity:activity.id,_student:mine.id});},onSuccess:()=>{window.location.assign(activity.url);},onError:e=>toast.error(friendlyError(e))});
 const now=Date.now();const joinable=!!activity.starts_at&&!!activity.ends_at&&now>=Date.parse(activity.starts_at)-15*60000&&now<=Date.parse(activity.ends_at)&&activity.status==='published';
 return <section className="space-y-5 border-t pt-5"><div className="flex flex-wrap gap-2">{activity.url?<><Button disabled={join.isPending||(!canManage&&!joinable)||activity.status==='cancelled'||me?.role==='parent'} onClick={()=>join.mutate()}><Video/>{canManage?'ورود معلم به جلسه':'ورود به کلاس'}</Button><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(activity.url).then(()=>toast.success('نشانی کپی شد.')).catch(()=>toast.error('کپی نشانی ممکن نشد.'))}><Copy/>کپی نشانی کلاس</Button></>:<p className="text-sm text-muted-foreground">معلم هنوز نشانی جلسه را ثبت نکرده است.</p>}</div>
 {canManage&&<p className="text-xs text-muted-foreground">بازکردن لینک به معنی حضور در جلسه نیست؛ وضعیت حضور را معلم ثبت می‌کند.</p>}
 <h2 className="font-semibold">حضور و غیاب این جلسه</h2>{query.error&&<ErrorState error={query.error} retry={()=>void query.refetch()}/>}
 {students.filter(s=>s.class_id===activity.class_id&&(activity.audience.length===0||activity.audience.includes(s.id))).map(s=>{const row=query.data?.find(r=>r.student_id===s.id);const joined=joins.data?.find(j=>j.created_by===s.user_id);return <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><p className="text-sm font-semibold">{s.first_name} {s.last_name}</p>{joined&&<p className="text-xs text-muted-foreground">بازکردن لینک: {dateTime(joined.created_at)}</p>}</div>{canManage?<div className="flex gap-1">{([{status:'present',label:'حاضر',icon:Check},{status:'absent',label:'غایب',icon:X},{status:'late',label:'تأخیر',icon:Clock}] as const).map(v=><Button key={v.status} size="icon" aria-label={`${v.label} ${s.first_name} ${s.last_name}`} title={v.label} variant={row?.status===v.status?'default':'outline'} disabled={mark.isPending} onClick={()=>mark.mutate({id:s.id,status:v.status})}><v.icon/></Button>)}</div>:<span className={cn('text-sm',row?.status==='absent'?'text-destructive':'text-muted-foreground')}>{row?.status==='present'?'حاضر':row?.status==='absent'?'غایب':row?.status==='late'?'تأخیر':'ثبت نشده'}</span>}</div>;})}
 </section>;
}
