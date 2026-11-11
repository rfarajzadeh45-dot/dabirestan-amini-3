import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { jalali, toISODate } from "@/lib/fa";
import { cn } from "@/lib/utils";

function fromISO(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function SolarDatePicker({ value, onChange, max, className, id, label = "تاریخ" }: {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  className?: string;
  id?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromISO(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" aria-label={label}
          className={cn("w-full justify-start gap-2 font-normal", className)}>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span dir="ltr">{value ? jalali(value) : "انتخاب تاریخ"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <Calendar mode="single" required selected={selected} {...(selected ? { defaultMonth: selected } : {})}
          captionLayout="dropdown" startMonth={new Date(1921, 2, 21)}
          endMonth={max ? fromISO(max) : new Date(2121, 2, 20)}
          {...(max ? { disabled: { after: fromISO(max) } } : {})}
          onSelect={(day) => {
            if (!day) return;
            const iso = toISODate(day);
            if (max && iso > max) return;
            onChange(iso);
            setOpen(false);
          }} />
      </PopoverContent>
    </Popover>
  );
}