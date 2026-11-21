import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Pin, CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/lib/auth";
import { virtualDb, virtualKey, friendlyError } from "@/lib/virtual-school/client";
import type { Activity } from "@/lib/virtual-school/types";
import { ErrorState, dateTime } from "./shared";
export function QuestionPanel({activity,canManage}:{activity:Activity;canManage:boolean}){
 const {data:me}=useMe();const qc=useQueryClient();const [body,setBody]=useState('');
 const query=useQuery({queryKey:[...virtualKey,'messages',activity.id],queryFn:async()=>{const {data,error}=await virtualDb.from('vs_messages').select('*').eq('activity_id',activity.id).order('created_at');if(error)throw error;return data as {id:string;body:string;created_by:string;created_at:string}[];}});
 const send=useMutation({mutationFn:async()=>{const {error}=await virtualDb.from('vs_messages').insert({activity_id:activity.id,created_by:me?.id,body});if(error)throw error;},onSuccess:()=>{setBody('');toast.success('پاسخ ارسال شد.');void qc.invalidateQueries({queryKey:virtualKey});},onError:e=>toast.error(friendlyError(e))});
 const change=useMutation({mutationFn:async(payload:Record<string,boolean>)=>{const {error}=await virtualDb.from('vs_activities').update(payload).eq('id',activity.id);if(error)throw error;},onSuccess:()=>void qc.invalidateQueries({queryKey:virtualKey}),onError:e=>toast.error(friendlyError(e))});
 return <section className="space-y-4 border-t pt-5"><div className="flex flex-wrap gap-2">{canManage&&<><Button size="sm" variant="outline" disabled={change.isPending} onClick={()=>change.mutate({public_question:!activity.public_question})}><Eye/>{activity.public_question?'بازگشت به گفت‌وگوی خصوصی':'انتشار برای کلاس'}</Button><Button size="sm" variant="outline" disabled={change.isPending} onClick={()=>change.mutate({resolved:!activity.resolved})}><CheckCircle2/>{activity.resolved?'بازکردن مجدد':'پاسخ داده شد'}</Button><Button size="icon" variant={activity.pinned?'secondary':'outline'} aria-label="سنجاق پرسش" disabled={change.isPending} onClick={()=>change.mutate({pinned:!activity.pinned})}><Pin/></Button></>}</div><p className="text-xs text-muted-foreground">{activity.public_question?'پرسش و پاسخ تأییدشده برای کلاس':'گفت‌وگوی خصوصی با معلم'}</p>
 {query.error&&<ErrorState error={query.error} retry={()=>void query.refetch()}/>}
 {query.data?.map(m=><div key={m.id} className="border-b pb-4"><p className="mb-2 text-xs text-muted-foreground">{m.created_by===activity.created_by?'دانش‌آموز':'معلم'} · {dateTime(m.created_at)}</p><p className="whitespace-pre-wrap break-words text-sm leading-7">{m.body}</p></div>)}
 {(canManage||(me?.id===activity.created_by&&!activity.public_question))&&<form className="space-y-2" onSubmit={e=>{e.preventDefault();send.mutate();}}><Textarea aria-label="پاسخ به پرسش" value={body} maxLength={10000} required onChange={e=>setBody(e.target.value)} rows={4}/><Button type="submit" disabled={send.isPending||!body.trim()}><Send/>ارسال پاسخ</Button></form>}
 </section>;
}
