import { createFileRoute, notFound } from "@tanstack/react-router";
import { VirtualActivityList } from "@/components/virtual-school/activity-list";
import { isSection, sections } from "@/lib/virtual-school/types";
export const Route=createFileRoute('/_authenticated/virtual/$section')({
 beforeLoad:({params})=>{if(!isSection(params.section))throw notFound();},
 head:({params})=>{const title=(isSection(params.section)?sections[params.section].title:'بخش در دسترس نیست')+' | مدرسه مجازی';const description='برنامه و فعالیت‌های آموزشی کلاس‌های مدرسه';return{meta:[{title},{name:'description',content:description},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]};},
 component:VirtualSection,
});
function VirtualSection(){const {section}=Route.useParams();if(!isSection(section))return null;return <VirtualActivityList key={section} section={section}/>;}
