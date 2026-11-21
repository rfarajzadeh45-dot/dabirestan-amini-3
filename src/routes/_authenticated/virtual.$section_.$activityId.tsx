import { createFileRoute, notFound } from "@tanstack/react-router";
import { VirtualActivityDetail } from "@/components/virtual-school/activity-detail";
import { isSection, sections } from "@/lib/virtual-school/types";
export const Route=createFileRoute('/_authenticated/virtual/$section_/$activityId')({
 beforeLoad:({params})=>{if(!isSection(params.section)||! /^[0-9a-f-]{36}$/i.test(params.activityId))throw notFound();},
 head:({params})=>{const title='جزئیات '+(isSection(params.section)?sections[params.section].title:'فعالیت آموزشی')+' | مدرسه مجازی';const description='جزئیات درس، پاسخ‌ها و پیوست‌های فعالیت آموزشی';return{meta:[{title},{name:'description',content:description},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]};},
 component:VirtualDetail,
});
function VirtualDetail(){const {section,activityId}=Route.useParams();if(!isSection(section))return null;return <VirtualActivityDetail section={section} activityId={activityId}/>;}
