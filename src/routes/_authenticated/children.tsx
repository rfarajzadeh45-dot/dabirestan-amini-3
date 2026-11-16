import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StudentReport } from "@/components/student-report";
import { useMe } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/children")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "فرزندان من | سامانه مدیریت مدرسه" },
      { name: "description", content: "پیگیری حضور، نمرات و یادداشت‌های فرزندان برای والدین" },
      { property: "og:title", content: "فرزندان من | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "پیگیری حضور، نمرات و یادداشت‌های فرزندان برای والدین" },
    ],
  }),
  component: Children,
});

function Children() {
  const { data: me } = useMe();
  const { data: kids, isLoading } = useQuery({
    queryKey: ["my-children", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("parent_children").select("student_id,students(id,first_name,last_name,classes(name))").eq("parent_id", me!.id);
      if (error) throw error;
      return data.flatMap((r) => (r.students ? [r.students] : []));
    },
  });
  const [sel, setSel] = useState<string | null>(null);
  if (isLoading || !me) return <p className="text-muted-foreground">در حال بارگذاری…</p>;
  if (!kids?.length) return <p className="text-muted-foreground">هنوز فرزندی به حساب شما وصل نشده است. با مدیر مدرسه تماس بگیرید.</p>;
  const current = sel && kids.some((k) => k.id === sel) ? sel : kids[0]!.id;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {kids.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {kids.map((k) => (
            <button key={k.id} type="button" onClick={() => setSel(k.id)}
              className={cn("rounded-full border px-4 py-2 text-sm transition", k.id === current ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
              {k.first_name} {k.last_name} <span className="opacity-70">· {k.classes?.name}</span>
            </button>
          ))}
        </div>
      )}
      <StudentReport key={current} studentId={current} />
    </div>
  );
}
