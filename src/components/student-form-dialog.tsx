import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  first_name: z.string().trim().min(1, "نام را وارد کنید").max(60),
  last_name: z.string().trim().min(1, "نام خانوادگی را وارد کنید").max(60),
  student_code: z.string().trim().regex(/^[0-9]{3,12}$/, "شماره دانش‌آموزی باید عددی باشد (۳ تا ۱۲ رقم)"),
  class_id: z.string().uuid("کلاس را انتخاب کنید"),
});

type Student = { id: string; first_name: string; last_name: string; student_code: string; class_id: string };

export function StudentFormDialog({ trigger, student, defaultClassId }: { trigger: ReactNode; student?: Student; defaultClassId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ first_name: "", last_name: "", student_code: "", class_id: defaultClassId ?? "" });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id,name,sort_order").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!open) return;
    if (student) setF({ ...student });
    else {
      setF({ first_name: "", last_name: "", student_code: "", class_id: defaultClassId ?? "" });
      supabase
        .from("students")
        .select("student_code")
        .order("student_code", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          const last = Number(data?.[0]?.student_code ?? "1403000");
          setF((p) => ({ ...p, student_code: String(last + 1) }));
        });
    }
  }, [open, student, defaultClassId]);

  const save = useMutation({
    mutationFn: async () => {
      const p = schema.safeParse(f);
      if (!p.success) throw new Error(p.error.issues[0]?.message ?? "ورودی نامعتبر");
      const { error } = student
        ? await supabase.from("students").update(p.data).eq("id", student.id)
        : await supabase.from("students").insert(p.data);
      if (error) throw new Error(error.code === "23505" ? "این شماره دانش‌آموزی قبلاً ثبت شده است" : error.message);
    },
    onSuccess: () => {
      toast.success(student ? "اطلاعات دانش‌آموز ویرایش شد" : "دانش‌آموز جدید اضافه شد");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent dir="rtl" className="text-right">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{student ? "ویرایش دانش‌آموز" : "افزودن دانش‌آموز"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>نام</Label><Input value={f.first_name} maxLength={60} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>نام خانوادگی</Label><Input value={f.last_name} maxLength={60} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>شماره دانش‌آموزی</Label><Input dir="ltr" value={f.student_code} onChange={(e) => setF({ ...f, student_code: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>کلاس</Label>
              <Select value={f.class_id} onValueChange={(v) => setF({ ...f, class_id: v })} dir="rtl">
                <SelectTrigger><SelectValue placeholder="انتخاب کلاس" /></SelectTrigger>
                <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>کلاس {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 sm:justify-start">
            <Button type="submit" disabled={save.isPending}>ذخیره</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
