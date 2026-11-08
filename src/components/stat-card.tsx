import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "destructive" | "warning";
  hint?: string;
  delay?: number;
}) {
  const toneCls = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    destructive: "bg-destructive-soft text-destructive",
    warning: "bg-warning-soft text-warning-foreground",
  }[tone];
  return (
    <div
      className="animate-rise rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("grid size-11 place-items-center rounded-xl", toneCls)}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
