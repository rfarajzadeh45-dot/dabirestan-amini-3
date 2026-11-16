import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudentReport } from "@/components/student-report";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/my-report")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "کارنامه من | سامانه مدیریت مدرسه" },
      { name: "description", content: "حضور و غیاب، نمرات، معدل و یادداشت‌های معلم برای دانش‌آموز" },
      { property: "og:title", content: "کارنامه من | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "حضور و غیاب، نمرات، معدل و یادداشت‌های معلم برای دانش‌آموز" },
    ],
  }),
  component: MyReport,
});

function MyReport() {
  const { data: me } = useMe();
  // Only the student's own row is readable; the database rejects any other.
  const { data: sid, isLoading } = useQuery({
    queryKey: ["my-student", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id").eq("user_id", me!.id).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });
  if (isLoading || !me) return <p className="text-muted-foreground">در حال بارگذاری…</p>;
  if (!sid) return <p className="text-muted-foreground">حساب شما هنوز به پرونده دانش‌آموزی وصل نشده است. با مدیر مدرسه تماس بگیرید.</p>;
  return <div className="mx-auto max-w-6xl"><StudentReport studentId={sid} /></div>;
}
