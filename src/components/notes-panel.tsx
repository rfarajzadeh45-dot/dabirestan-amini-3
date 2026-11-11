import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SolarDatePicker } from "@/components/solar-date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { jalali, noteCategoryLabel, todayISO, type NoteCategory } from "@/lib/fa";
import { cn } from "@/lib/utils";

const catStyle: Record<NoteCategory, string> = {
  general: "bg-primary-soft text-primary",
  behavior: "bg-accent text-accent-foreground",
  strength: "bg-success-soft text-success",
  improvement: "bg-warning-soft text-warning-foreground",
};

type Note = { id: string; category: NoteCategory; content: string; date: string };

export function NotesPanel({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const key = ["notes", studentId];
  const { data: notes } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id,category,content,date")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });

  const [form, setForm] = useState<{ id?: string; category: NoteCategory; content: string; date: string }>({
    category: "general",
    content: "",
    date: todayISO(),
  });
  const [filter, setFilter] = useState<NoteCategory | "all">("all");

  const save = useMutation({
    mutationFn: async () => {
      const content = form.content.trim();
      if (!content) throw new Error("متن یادداشت خالی است");
      if (content.length > 2000) throw new Error("متن یادداشت بیش از حد طولانی است");
      const { data: u } = await supabase.auth.getUser();
      if (form.id) {
        const { error } = await supabase.from("notes").update({ category: form.category, content, date: form.date }).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notes")
          .insert({ student_id: studentId, category: form.category, content, date: form.date, author_id: u.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "یادداشت ویرایش شد" : "یادداشت ثبت شد");
      setForm({ category: "general", content: "", date: todayISO() });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("یادداشت حذف شد");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = notes?.filter((n) => filter === "all" || n.category === filter) ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/40 p-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as NoteCategory })} dir="rtl">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(noteCategoryLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <SolarDatePicker label="تاریخ یادداشت" value={form.date} onChange={(date) => setForm({ ...form, date })} />
        </div>
        <Textarea
          placeholder="یادداشت آموزشی، مشاهده رفتاری، نقاط قوت یا موارد نیازمند بهبود…"
          value={form.content}
          maxLength={2000}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={3}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {form.id ? <Save /> : <Plus />}
            {form.id ? "ذخیره تغییرات" : "افزودن یادداشت"}
          </Button>
          {form.id && (
            <Button size="sm" variant="ghost" onClick={() => setForm({ category: "general", content: "", date: todayISO() })}>
              <X />انصراف
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...Object.keys(noteCategoryLabel)] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k as NoteCategory | "all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {k === "all" ? "همه" : noteCategoryLabel[k as NoteCategory]}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {list.map((n) => (
          <li key={n.id} className="animate-rise rounded-xl border bg-card p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", catStyle[n.category])}>{noteCategoryLabel[n.category]}</span>
                <span className="text-xs text-muted-foreground">{jalali(n.date)}</span>
              </div>
              <div className="flex">
                <Button size="icon" variant="ghost" className="size-7" aria-label="ویرایش" onClick={() => setForm({ ...n })}>
                  <Pencil className="size-3.5" />
                </Button>
                <ConfirmDialog
                  description="این یادداشت برای همیشه حذف می‌شود."
                  onConfirm={() => del.mutate(n.id)}
                  trigger={
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label="حذف">
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                />
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7">{n.content}</p>
          </li>
        ))}
        {notes && list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">یادداشتی وجود ندارد.</p>}
      </ul>
    </div>
  );
}
