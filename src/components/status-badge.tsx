import { cn } from "@/lib/utils";
import { statusLabel, type AttendanceStatus } from "@/lib/fa";

const styles: Record<AttendanceStatus | "none", string> = {
  present: "bg-success-soft text-success",
  absent: "bg-destructive-soft text-destructive",
  late: "bg-warning-soft text-warning-foreground",
  none: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: AttendanceStatus | null | undefined; className?: string }) {
  const key = status ?? "none";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        styles[key],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status ? statusLabel[status] : "ثبت نشده"}
    </span>
  );
}
