import { useEffect, useState } from "react";
import { Bell, Coffee } from "lucide-react";
import { durationClock, periodClock, periodStatus, schoolSeconds, schoolTime, SCHOOL_PERIODS } from "@/lib/attendance-time";
import { Progress } from "@/components/ui/progress";
import { fa, faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";

export function SchoolSchedule() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  const sec = now ? schoolSeconds(now) : null;
  const st = sec !== null ? periodStatus(sec) : null;
  const title = !st ? "—" : st.current ? st.current.name : st.phase === "before" ? "پیش از شروع مدرسه" : "پایان ساعات مدرسه";
  const countdownLabel = !st ? "" : st.phase === "class" ? "تا پایان این زنگ" : st.phase === "break" ? `تا شروع ${st.next?.name ?? ""}` : "تا شروع زنگ اول";

  return (
    <section className="animate-rise mt-6 rounded-2xl border bg-card p-5 shadow-card" aria-label="برنامه زمانی مدرسه">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">برنامه زمانی مدرسه</h2>
        <span className="text-xs text-muted-foreground">به وقت تهران</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-xl bg-primary p-5 text-primary-foreground">
          <p className="text-xs opacity-75">ساعت مدرسه</p>
          <p dir="ltr" className="text-right text-4xl font-bold tabular-nums" aria-label="ساعت زنده">{now ? fa(schoolTime(now).clock) : "—"}</p>
          <div className="mt-4 flex items-center gap-2">
            {st?.phase === "break" ? <Coffee className="size-4" /> : <Bell className="size-4" />}
            <p className="font-semibold" aria-label="زنگ فعلی">{title}</p>
          </div>
          <p className="mt-3 text-xs opacity-75">{countdownLabel}</p>
          <p dir="ltr" className="text-right text-2xl font-semibold tabular-nums" aria-label="شمارش معکوس">{st ? fa(durationClock(st.remainingSeconds)) : "—"}</p>
          {st?.current && (
            <div className="mt-3">
              <Progress value={st.progress * 100} className="h-2 bg-primary-foreground/20 [&>div]:bg-primary-foreground" />
              <p className="mt-1 text-xs opacity-75">{faNum(st.progress * 100)}٪ سپری شده</p>
            </div>
          )}
          <p className="mt-3 text-xs opacity-75">
            زنگ بعدی: {st?.next ? `${st.next.name} · ${fa(periodClock(st.next.start))}` : `زنگ اول فردا · ${fa("07:30")}`}
          </p>
        </div>
        <ol className="space-y-1.5">
          {SCHOOL_PERIODS.map((p, i) => {
            const active = st?.index === i;
            const done = sec !== null && sec >= p.end;
            return (
              <li
                key={i}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                  p.kind === "break" ? "border-dashed bg-muted/40" : "bg-card",
                  active && "border-primary bg-primary-soft font-semibold text-primary",
                  done && !active && "opacity-50",
                )}
              >
                <span className="flex items-center gap-2">
                  {p.kind === "break" ? <Coffee className="size-3.5" /> : <Bell className="size-3.5" />}
                  {p.name}
                  {active && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">در حال برگزاری</span>}
                </span>
                <span dir="ltr" className="tabular-nums text-muted-foreground">{fa(`${periodClock(p.start)} – ${periodClock(p.end)}`)}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
