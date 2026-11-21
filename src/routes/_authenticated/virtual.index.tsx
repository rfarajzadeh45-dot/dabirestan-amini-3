import { createFileRoute } from "@tanstack/react-router";
import { VirtualDashboard } from "@/components/virtual-school/dashboard";
export const Route=createFileRoute('/_authenticated/virtual/')({
 head:()=>({meta:[{title:'مدرسه مجازی | سامانه مدیریت مدرسه'},{name:'description',content:'برنامه آنلاین، تکالیف، آزمون‌ها و آموزش از راه دور مدرسه'},{property:'og:title',content:'مدرسه مجازی | سامانه مدیریت مدرسه'},{property:'og:description',content:'برنامه آنلاین، تکالیف، آزمون‌ها و آموزش از راه دور مدرسه'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:VirtualDashboard,
});
