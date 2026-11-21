import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SolarDatePicker } from "@/components/solar-date-picker";
import { useMe } from "@/lib/auth";
import { schoolTime } from "@/lib/attendance-time";
import { virtualDb, virtualKey, uploadFile, friendlyError } from "@/lib/virtual-school/client";
import { acceptedFiles, safeExternalUrl, schoolDateTime, validateTiming } from "@/lib/virtual-school/rules";
import type { Kind, Activity } from "@/lib/virtual-school/types";
import { useVirtualReferences } from "./shared";
export function ActivityForm({ kind, initial, onSaved }: { kind: Kind; initial?: Activity; onSaved?: () => void }) {
 const { data: me } = useMe(); const qc = useQueryClient(); const [open,setOpen] = useState(false);
 const today = schoolTime(new Date()).date;
 const [classId,setClassId] = useState(initial?.class_id ?? ""); const [subjectId,setSubjectId] = useState(initial?.subject_id ?? "");
 const {classes,students,subjects} = useVirtualReferences(classId);
 const [title,setTitle]=useState(initial?.title ?? ""); const [body,setBody]=useState(initial?.body ?? "");
 const [url,setUrl]=useState(initial?.url ?? ""); const [chapter,setChapter]=useState(initial?.chapter ?? "");
 const [objectives,setObjectives]=useState(initial?.objectives ?? ""); const [rubric,setRubric]=useState(initial?.rubric ?? "");
 const [date,setDate]=useState(initial?.starts_at ? schoolTime(new Date(initial.starts_at)).date : today);
 const [time,setTime]=useState(initial?.starts_at ? new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit'}).format(new Date(initial.starts_at)) : "08:00");
 const [endDate,setEndDate]=useState(initial?.ends_at ? schoolTime(new Date(initial.ends_at)).date : today);
 const [endTime,setEndTime]=useState(initial?.ends_at ? new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit'}).format(new Date(initial.ends_at)) : "09:00");
 const [duration,setDuration]=useState(initial?.duration_minutes ?? 45); const [maxScore,setMaxScore]=useState(initial?.max_score ?? 20);
 const [allowEdits,setAllowEdits]=useState(initial?.allow_edits ?? true); const [allowLate,setAllowLate]=useState(initial?.allow_late ?? true);
 const [audience,setAudience]=useState<string[]>(initial?.audience ?? []); const [randomize,setRandomize]=useState(initial?.randomize ?? false);
 const [randomCount,setRandomCount]=useState(initial?.random_count ?? 0);
 const [files,setFiles]=useState<File[]>([]);
 const mapping = useQuery({ queryKey:[...virtualKey,'subject-assignments',me?.id],enabled:me?.role==='teacher',queryFn:async()=> {
  const {data,error}=await virtualDb.from('vs_teacher_subjects').select('class_id,subject_id').eq('user_id',me?.id); if(error)throw error; return data as {class_id:string;subject_id:string}[];
 }});
 const members=students.data?.filter(s=>s.class_id===classId) ?? [];
 const mine=members.find(s=>s.user_id===me?.id);
 const save=useMutation({mutationFn:async()=>{
  if(!me)throw new Error('ابتدا وارد شوید.');
  if(!title.trim())throw new Error('عنوان را وارد کنید.');
  if(kind!=='announcement'&&(!classId||!subjectId))throw new Error('کلاس و درس را انتخاب کنید.');
  const starts=kind==='session'||kind==='exam' ? schoolDateTime(date,time):null;
  const ends=['session','exam','assignment'].includes(kind)?schoolDateTime(endDate,endTime):null;
  if(starts&&ends)validateTiming(starts,ends);
  const payload={kind,class_id:kind==='announcement'?null:classId,subject_id:kind==='announcement'?null:subjectId,
   title:title.trim(),body,url:safeExternalUrl(url),chapter,objectives,rubric,starts_at:starts,ends_at:ends,duration_minutes:duration,max_score:maxScore,
   allow_edits:allowEdits,allow_late:allowLate,audience,randomize,random_count:randomCount,
   ...(initial?{}:{created_by:me.id,teacher_name:me.isStaff?me.fullName:'',student_id:kind==='question'?mine?.id:null,status:kind==='exam'?'draft':'published'})};
  const result=initial?await virtualDb.from('vs_activities').update(payload).eq('id',initial.id).select('id').single():await virtualDb.from('vs_activities').insert(payload).select('id').single();
  if(result.error)throw result.error;
  const id=String(result.data['id']);
  const failed:string[]=[]; for(const file of files){try{await uploadFile(file,id,null);}catch{failed.push(file.name);}}
  if(failed.length)toast.error('فعالیت ذخیره شد؛ بارگذاری این فایل‌ها ناموفق بود: '+failed.join('، '));
 },onSuccess:()=>{toast.success('فعالیت ذخیره شد.');setOpen(false);setFiles([]);void qc.invalidateQueries({queryKey:virtualKey});onSaved?.();},onError:(e)=>toast.error(friendlyError(e))});
 const timed=kind==='session'||kind==='exam';
 const allowedClasses=me?.isStaff&&!me.isAdmin?classes.data?.filter(c=>mapping.data?.some(m=>m.class_id===c.id)):classes.data;
 const allowedSubjects=me?.isStaff&&!me.isAdmin?subjects.data?.filter(s=>mapping.data?.some(m=>m.class_id===classId&&m.subject_id===s.id)):subjects.data;
 return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant={initial?'outline':'default'} size="sm">{initial?<Save/>:<Plus/>}{initial?'ویرایش':'افزودن'}</Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{initial?'ویرایش فعالیت':'فعالیت جدید'}</DialogTitle></DialogHeader>
  <form className="space-y-4" onSubmit={e=>{e.preventDefault();save.mutate();}}>
   {kind!=='announcement'&&<div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">کلاس<Select value={classId} disabled={!!initial} onValueChange={v=>{setClassId(v);setSubjectId('');setAudience([]);}}><SelectTrigger><SelectValue placeholder="انتخاب کلاس"/></SelectTrigger><SelectContent>{allowedClasses?.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-1 text-sm">درس<Select value={subjectId} disabled={!classId||!!initial} onValueChange={setSubjectId}><SelectTrigger><SelectValue placeholder="انتخاب درس"/></SelectTrigger><SelectContent>{allowedSubjects?.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></label></div>}
   {mapping.error&&<p role="alert" className="text-sm text-destructive">{friendlyError(mapping.error)}</p>}
   {me?.role==='teacher'&&mapping.data?.length===0&&<p className="text-sm text-muted-foreground">مدیر هنوز دروس تدریس آنلاین شما را تعیین نکرده است.</p>}
   <label className="block space-y-1 text-sm">عنوان<Input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label className="block space-y-1 text-sm">توضیحات و دستورالعمل<Textarea value={body} onChange={e=>setBody(e.target.value)} rows={4}/></label>
   {timed&&<div className="grid grid-cols-2 gap-3"><label className="text-sm">تاریخ شروع<SolarDatePicker value={date} onChange={setDate} label="تاریخ شروع فعالیت"/></label><label className="text-sm">ساعت شروع<Input type="time" required value={time} onChange={e=>setTime(e.target.value)} dir="ltr"/></label></div>}
   {(timed||kind==='assignment')&&<div className="grid grid-cols-2 gap-3"><label className="text-sm">{kind==='assignment'?'مهلت تحویل':'تاریخ پایان'}<SolarDatePicker value={endDate} onChange={setEndDate} label="تاریخ پایان فعالیت"/></label><label className="text-sm">ساعت پایان<Input type="time" required value={endTime} onChange={e=>setEndTime(e.target.value)} dir="ltr"/></label></div>}
   {(kind==='assignment'||kind==='exam')&&<label className="block text-sm">حداکثر نمره<Input type="number" min="0.5" max="20" step="0.5" value={maxScore} onChange={e=>setMaxScore(Number(e.target.value))}/></label>}
   {kind==='exam'&&<><label className="block text-sm">مدت آزمون (دقیقه)<Input type="number" min="1" max="300" value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label><label className="flex items-center gap-2 text-sm"><Checkbox checked={randomize} onCheckedChange={v=>setRandomize(v===true)}/>ترتیب تصادفی سؤال‌ها</label></>}
   {kind==='exam'&&<label className="block text-sm">تعداد سؤال منتخب تصادفی (صفر: همه سؤال‌ها)<Input type="number" min="0" max="200" value={randomCount} onChange={e=>setRandomCount(Number(e.target.value))}/></label>}
   {(kind==='session'||kind==='lesson'||kind==='resource')&&<label className="block text-sm">{kind==='session'?'نشانی جلسه از سرویس کلاس آنلاین':'نشانی ویدئو یا منبع آموزشی'}<Input type="url" placeholder="https://" dir="ltr" value={url} onChange={e=>setUrl(e.target.value)}/></label>}
   {(kind==='lesson'||kind==='resource')&&<label className="block text-sm">فصل<Input value={chapter} onChange={e=>setChapter(e.target.value)}/></label>}
   {kind==='session'&&<label className="block text-sm">هدف آموزشی<Textarea value={objectives} onChange={e=>setObjectives(e.target.value)}/></label>}
   {kind==='assignment'&&<><label className="block text-sm">معیار نمره‌دهی<Textarea value={rubric} onChange={e=>setRubric(e.target.value)}/></label><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm"><Checkbox checked={allowEdits} onCheckedChange={v=>setAllowEdits(v===true)}/>ویرایش پیش از مهلت</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={allowLate} onCheckedChange={v=>setAllowLate(v===true)}/>پذیرش تحویل دیرهنگام</label></div><fieldset className="space-y-2"><legend className="text-sm">دانش‌آموزان منتخب (بدون انتخاب: همه کلاس)</legend><div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">{members.map(s=><label key={s.id} className="flex items-center gap-2 text-xs"><Checkbox checked={audience.includes(s.id)} onCheckedChange={v=>setAudience(a=>v===true?[...a,s.id]:a.filter(x=>x!==s.id))}/>{s.first_name} {s.last_name}</label>)}</div></fieldset></>}
   {kind!=='exam'&&<label className="flex items-center gap-2 text-sm"><Upload className="size-4"/>پیوست<Input type="file" multiple accept={acceptedFiles} onChange={e=>setFiles(Array.from(e.target.files??[]))}/></label>}
   <Button type="submit" disabled={save.isPending}><Save/>{save.isPending?'در حال ذخیره…':'ذخیره'}</Button>
  </form>
 </DialogContent></Dialog>;
}
