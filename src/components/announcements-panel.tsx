import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Pin, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { jalali } from "@/lib/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function AnnouncementsPanel() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,body,pinned,created_at")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({ title: title.trim(), body: body.trim(), pinned });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("اطلاعیه منتشر شد");
      setOpen(false);
      setTitle("");
      setBody("");
      setPinned(false);
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: () => toast.error("انتشار اطلاعیه ناموفق بود"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("اطلاعیه حذف شد");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: () => toast.error("حذف ناموفق بود"),
  });

  return (
    <section className="animate-rise rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Megaphone className="size-4 text-primary" />تابلوی اطلاعیه‌ها
        </h2>
        {me?.isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus />اطلاعیه جدید</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>اطلاعیه جدید</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-title">عنوان</Label>
                  <Input id="ann-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ann-body">متن</Label>
                  <Textarea id="ann-body" rows={4} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={pinned} onCheckedChange={setPinned} />سنجاق در بالای فهرست
                </label>
              </div>
              <DialogFooter>
                <Button disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>انتشار</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <ul className="space-y-2">
        {items?.map((a, i) => (
          <li
            key={a.id}
            className="animate-rise group rounded-xl border bg-background/60 p-3 transition-colors hover:border-primary/30"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  {a.pinned && <Pin className="size-3.5 shrink-0 text-primary" />}
                  <span className="truncate">{a.title}</span>
                </p>
                {a.body && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>}
                <p className="mt-1.5 text-xs text-muted-foreground">{jalali(a.created_at.slice(0, 10))}</p>
              </div>
              {me?.isAdmin && (
                <ConfirmDialog
                  description="این اطلاعیه برای همه حذف می‌شود."
                  onConfirm={() => remove.mutate(a.id)}
                  trigger={
                    <Button size="icon" variant="ghost" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" aria-label="حذف اطلاعیه">
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              )}
            </div>
          </li>
        ))}
        {items && items.length === 0 && <p className="text-sm text-muted-foreground">اطلاعیه‌ای منتشر نشده است.</p>}
      </ul>
    </section>
  );
}
