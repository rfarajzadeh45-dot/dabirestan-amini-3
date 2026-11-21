import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/lib/auth";
import { virtualDb, virtualKey, loadSettings } from "@/lib/virtual-school/client";
import { sections, type Section, type Activity } from "@/lib/virtual-school/types";
import { schoolTime } from "@/lib/attendance-time";
import { shiftDate } from "@/lib/fa";
import { schoolDateTime } from "@/lib/virtual-school/rules";
import { ActivityForm } from "./activity-form";
import { ClassFilter, Pager, VirtualNav, ErrorState, dateTime, useVirtualReferences } from "./shared";
import { VirtualProgress } from "./progress";
export function VirtualActivityList({section}:{section:Section}){
 const {data:me}=useMe();const [classId,setClassId]=useState('');const [subject,setSubject]=useState('');const [search,setSearch]=useState('');const [page,setPage]=useState(0);
 const {classes,subjects}=useVirtualReferences(classId);
 const config=sections[section];const today=schoolTime(new Date()).date;
 const settings=useQuery({queryKey:[...virtualKey,'settings'],queryFn:loadSettings,retry:false});
 const query=useQuery({queryKey:[...virtualKey,'activities',section,classId,subject,search,page],enabled:config.kind!=='progress'&&settings.isSuccess&&(!!settings.data?.enabled||!!me?.isStaff),queryFn:async()=>{
  let q=virtualDb.from('vs_activities').select('*',{count:'exact'}).eq('kind',config.kind).order('pinned',{ascending:false}).order(section==='schedule'?'starts_at':'created_at',{ascending:section==='schedule'}).range(page*20,page*20+19);
  if(classId)q=q.eq('class_id',classId);if(subject)q=q.eq('subject_id',subject);if(search.trim())q=q.ilike('title',`%${search.replaceAll('%','').replaceAll('_','').trim()}%`);
  if(section==='schedule')q=q.gte('starts_at',schoolDateTime(today,'00:00')).lte('starts_at',schoolDateTime(shiftDate(today,6),'23:59'));
  const {data,error,count}=await q;if(error)throw error;return{rows:data as Activity[],count:count??0};
 }});
 const canCreate=config.kind!=='progress'&&(!!me?.isStaff||(section==='questions'&&me?.role==='student'));
 return <div className="mx-auto max-w-6xl"><VirtualNav active={section}/><PageHeader title={config.title} actions={canCreate&&settings.isSuccess?<ActivityForm kind={config.kind}/>:undefined}/>
 {settings.error?<ErrorState error={settings.error} retry={()=>void settings.refetch()}/>:settings.isSuccess&&!settings.data?.enabled&&!me?.isStaff?<p className="py-6 text-sm text-muted-foreground">آموزش مجازی هنوز فعال نشده است.</p>:section==='progress'?<VirtualProgress/>:<>
 <div className="mb-5 flex flex-wrap gap-3"><ClassFilter value={classId} onChange={v=>{setClassId(v);setSubject('');setPage(0);}}/>{classId&&<Select value={subject||'all'} onValueChange={v=>{setSubject(v==='all'?'':v);setPage(0);}}><SelectTrigger className="w-full sm:w-48" aria-label="درس مدرسه مجازی"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">همه دروس</SelectItem>{subjects.data?.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>}<div className="relative min-w-48 flex-1"><Search className="absolute right-3 top-3 size-4 text-muted-foreground"/><Input aria-label="جستجوی فعالیت" className="pr-9" placeholder="جستجوی عنوان…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></div></div>
 {query.error?<ErrorState error={query.error} retry={()=>void query.refetch()}/>:query.isFetching&&!query.data?<p role="status" className="py-6 text-sm text-muted-foreground">در حال دریافت فعالیت‌ها…</p>:query.data?.rows.length===0?<p className="border-y py-8 text-center text-sm text-muted-foreground">فعالیتی ثبت نشده است.</p>:<ul className="divide-y">{query.data?.rows.map(a=><li key={a.id} className="py-5"><Link to="/virtual/$section/$activityId" params={{section,activityId:a.id}} className="block space-y-2"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-primary">{a.pinned?'سنجاق‌شده · ':''}{a.title}</h2><span className="text-xs text-muted-foreground">{a.status==='draft'?'پیش‌نویس':a.status==='cancelled'?'لغوشده':a.kind==='question'?(a.resolved?'پاسخ داده شده':'در انتظار پاسخ'):''}</span></div><p className="text-xs text-muted-foreground">{classes.data?.find(c=>c.id===a.class_id)?.name} · {a.teacher_name}{a.chapter?' · '+a.chapter:''}</p><p className="line-clamp-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{a.body}</p>{a.ends_at&&<p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4"/>{a.starts_at?dateTime(a.starts_at)+' تا ':''}{dateTime(a.ends_at)}</p>}</Link></li>)}</ul>}
 {query.data&&<Pager page={page} onChange={setPage} hasNext={(page+1)*20<query.data.count}/>}
 </>}
 </div>;
}
