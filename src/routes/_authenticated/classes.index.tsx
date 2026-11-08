import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { fa, faNum, todayISO } from "@/lib/fa";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/classes/")({
  head: () => ({
    meta: [
      { title: "کلاس‌ها | سامانه مدیریت مدرسه" },
      { name: "description", content: "فهرست کلاس‌ها و وضعیت حضور امروز هر کلاس" },
      { property: "og:title", content: "کلاس‌ها | سامانه مدیریت مدرسه" },
      { property: "og:description", content: "فهرست کلاس‌ها و وضعیت حضور امروز هر کلاس" },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const today = todayISO();
  const { data } = useQuery({
    queryKey: ["classes-overview", today],
    queryFn: async () => {
      const [{ data: classes, error }, { data: att, error: e2 }] = await Promise.all([
        supabase.from("classes").select("id,name,sort_order,students(id)").order("sort_order"),
        supabase.from("attendance").select("status,students!inner(class_id)").eq("date", today).range(0, 4999),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      return classes.map((c) => {
        const rows = att.filter((a) => a.students.class_id === c.id);
        const here = rows.filter((r) => r.status !== "absent").length;
        return { ...c, count: c.students.length, marked: rows.length, here };
      });
    },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="کلاس‌ها" subtitle="برای ثبت حضور و غیاب، یک کلاس را انتخاب کنید." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c, i) => (
          <Link
            key={c.id}
            to="/classes/$classId"
            params={{ classId: c.id }}
            className="group animate-rise rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-xl bg-hero text-lg font-bold text-primary-foreground">{fa(c.sort_order)}</div>
                <div>
                  <p className="text-lg font-semibold">کلاس {c.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="size-3.5" />{faNum(c.count)} دانش‌آموز</p>
                </div>
              </div>
              <ChevronLeft className="size-5 text-muted-foreground transition-transform group-hover:-translate-x-1" />
            </div>
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>ثبت حضور امروز</span>
                <span>{faNum(c.marked)} از {faNum(c.count)}</span>
              </div>
              <Progress value={c.count ? (c.marked / c.count) * 100 : 0} className="h-2" />
              <p className="text-xs text-muted-foreground">حاضرین: {faNum(c.here)} نفر</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
