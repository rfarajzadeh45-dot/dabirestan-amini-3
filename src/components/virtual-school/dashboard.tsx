import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check, ChevronLeft, Wifi } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMe } from "@/lib/auth";
import { virtualDb, virtualKey, loadSettings, friendlyError } from "@/lib/virtual-school/client";
import { sections, type Section, type Activity, type Notification } from "@/lib/virtual-school/types";
import { sectionIcons, ErrorState, dateTime } from "./shared";
import { VirtualAdmin } from "./admin";
import { fa } from "@/lib/fa";
export function useLowBandwidth(){
 const [low,setLow]=useState(false);useEffect(()=>{setLow(window.localStorage.getItem('school-low-bandwidth')==='1');},[]);
 const change=(value:boolean)=>{setLow(value);window.localStorage.setItem('school-low-bandwidth',value?'1':'0');};return[low,change] as const;
}
export function VirtualDashboard(){
 const {data:me}=useMe();const qc=useQueryClient();const [low,setLow]=useLowBandwidth();
 const settings=useQuery({queryKey:[...virtualKey,'settings'],queryFn:loadSettings,retry:false});
 const activities=useQuery({queryKey:[...virtualKey,'upcoming'],enabled:settings.isSuccess&&!!settings.data?.enabled,queryFn:async()=>{const {data,error}=await virtualDb.from('vs_activities').select('*').in('kind',['session','assignment','exam','announcement','question']).order('created_at',{ascending:false}).limit(30);if(error)throw error;return data as Activity[];}});
 const notifications=useQuery({queryKey:[...virtualKey,'notifications',me?.id],enabled:settings.isSuccess&&!!me,refetchInterval:low?120000:60000,queryFn:async()=>{const {data,error}=await virtualDb.from('vs_notifications').select('*').eq('user_id',me?.id).order('created_at',{ascending:false}).limit(20);if(error)throw error;return data as Notification[];}});
 const read=useMutation({mutationFn:async(id:string)=>{const {error}=await virtualDb.from('vs_notifications').update({read_at:new Date().toISOString()}).eq('id',id);if(error)throw error;},onSuccess:()=>void qc.invalidateQueries({queryKey:[...virtualKey,'notifications']}),onError:e=>toast.error(friendlyError(e))});
 useEffect(()=>{if(!activities.data||!settings.data?.notifications_enabled)return;const timers:number[]=[];for(const activity of activities.data){if(activity.kind!=='session'||!activity.starts_at||activity.status!=='published')continue;const ms=Date.parse(activity.starts_at)-Date.now()-10*60000;if(ms>0&&ms<86400000)timers.push(window.setTimeout(()=>toast.info('کلاس تا ۱۰ دقیقه دیگر: '+activity.title),ms));}return()=>timers.forEach(t=>window.clearTimeout(t));},[activities.data,settings.data?.notifications_enabled]);
 const now=Date.now();const upcoming=activities.data?.filter(a=>a.status==='published'&&a.ends_at&&Date.parse(a.ends_at)>now&&a.kind!=='question')??[];
 return <div className="mx-auto max-w-6xl space-y-6"><PageHeader title="مدرسه مجازی" actions={<label className="flex items-center gap-2 text-xs"><Wifi className="size-4"/><Switch checked={low} onCheckedChange={setLow}/>اینترنت کم‌سرعت</label>}/>
 {settings.error&&<ErrorState error={settings.error} retry={()=>void settings.refetch()}/>}
 {settings.isLoading&&<p role="status" className="text-sm text-muted-foreground">در حال دریافت وضعیت مدرسه…</p>}
 {settings.isSuccess&&<div className="border-y py-4"><p className={settings.data?.enabled?'font-semibold text-success':'font-semibold text-muted-foreground'}>{settings.data?.enabled?'آموزش مجازی فعال است':'آموزش مجازی غیرفعال است'}</p>{settings.data?.announcement&&<p className="mt-2 whitespace-pre-wrap text-sm leading-7">{settings.data.announcement}</p>}</div>}
 <nav aria-label="امکانات مدرسه مجازی" className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(Object.keys(sections) as Section[]).map(key=>{const Icon=sectionIcons[key];return <Link key={key} to="/virtual/$section" params={{section:key}} className="flex min-h-24 items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted"><Icon className="size-6 shrink-0 text-primary"/><span className="min-w-0 flex-1 text-sm font-semibold leading-6">{sections[key].title}</span><ChevronLeft className="size-4 shrink-0 text-muted-foreground"/></Link>;})}</nav>
 {settings.isSuccess&&settings.data?.enabled&&<><section className="space-y-3 border-t pt-5"><h2 className="font-semibold">{me?.isStaff?'کلاس‌ها و فعالیت‌های پیش رو':'برنامه و تکالیف پیش رو'}</h2>{activities.error&&<ErrorState error={activities.error} retry={()=>void activities.refetch()}/>}{upcoming.length===0&&<p className="text-sm text-muted-foreground">فعالیت پیش رویی ثبت نشده است.</p>}{upcoming.slice(0,8).map(a=><Link key={a.id} to="/virtual/$section/$activityId" params={{section:a.kind==='session'?'sessions':a.kind==='exam'?'exams':'assignments',activityId:a.id}} className="flex flex-wrap items-center justify-between gap-2 border-b py-3"><span className="text-sm font-medium">{a.title}</span><span className="text-xs text-muted-foreground">{dateTime(a.starts_at??a.ends_at)}</span></Link>)}</section>
 <section className="space-y-3"><h2 className="flex items-center gap-2 font-semibold"><Bell className="size-4"/>اعلان‌ها · {fa(notifications.data?.filter(n=>!n.read_at).length??0)}</h2>{notifications.error&&<ErrorState error={notifications.error} retry={()=>void notifications.refetch()}/>}{notifications.data?.length===0&&<p className="text-sm text-muted-foreground">اعلانی ندارید.</p>}{notifications.data?.map(n=><div key={n.id} className="flex items-start justify-between gap-3 border-b py-3"><div><p className="text-sm font-semibold">{n.title}</p><p className="text-xs leading-6 text-muted-foreground">{n.body} · {dateTime(n.created_at)}</p></div>{!n.read_at&&<Button size="icon" variant="ghost" title="خوانده شد" aria-label="اعلان خوانده شد" onClick={()=>read.mutate(n.id)}><Check/></Button>}</div>)}</section></>}
 {me?.isAdmin&&settings.isSuccess&&<VirtualAdmin key={JSON.stringify(settings.data)} settings={settings.data}/>}</div>;
}
