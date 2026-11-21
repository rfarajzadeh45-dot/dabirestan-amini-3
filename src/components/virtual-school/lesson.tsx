import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { virtualDb, virtualKey, friendlyError } from "@/lib/virtual-school/client";
import type { Activity, Student } from "@/lib/virtual-school/types";
export function LessonPlayer({activity,students,lowBandwidth}:{activity:Activity;students:Student[];lowBandwidth:boolean}){
 const {data:me}=useMe();const mine=students.find(s=>s.user_id===me?.id);const player=useRef<HTMLVideoElement>(null);const lastSaved=useRef(0);const [showVideo,setShowVideo]=useState(!lowBandwidth);
 const native=/\.(mp4|webm)(\?|$)/i.test(activity.url);
 const query=useQuery({queryKey:[...virtualKey,'watch',activity.id,mine?.id],enabled:!!mine&&native,queryFn:async()=>{const {data,error}=await virtualDb.from('vs_watch_progress').select('seconds').eq('activity_id',activity.id).eq('student_id',mine?.id).maybeSingle();if(error)throw error;return data as {seconds:number}|null;}});
 useEffect(()=>{setShowVideo(!lowBandwidth);},[lowBandwidth]);
 const save=async(completed=false)=>{if(!mine||!player.current)return;const {error}=await virtualDb.from('vs_watch_progress').upsert({activity_id:activity.id,student_id:mine.id,seconds:Math.floor(player.current.currentTime),completed,updated_at:new Date().toISOString()},{onConflict:'activity_id,student_id'});if(error)toast.error(friendlyError(error));};
 if(!activity.url)return null;
 return <section className="space-y-3">{native?<>{!showVideo&&<Button variant="outline" onClick={()=>setShowVideo(true)}>پخش ویدئو</Button>}{showVideo&&<video ref={player} controls playsInline preload={lowBandwidth?'none':'metadata'} className="aspect-video w-full bg-muted" src={activity.url} onLoadedMetadata={()=>{if(player.current&&query.data)player.current.currentTime=query.data.seconds;}} onPause={()=>void save()} onEnded={()=>void save(true)} onTimeUpdate={()=>{if(Date.now()-lastSaved.current>15000){lastSaved.current=Date.now();void save();}}}/>}</>:<Button asChild variant="outline"><a href={activity.url} target="_blank" rel="noopener noreferrer"><ExternalLink/>مشاهده درس یا منبع</a></Button>}</section>;
}
