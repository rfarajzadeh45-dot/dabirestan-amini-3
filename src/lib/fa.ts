export type AttendanceStatus = "present" | "absent" | "late";
export type NoteCategory = "general" | "behavior" | "strength" | "improvement";

export const statusLabel: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غایب",
  late: "تأخیر",
};

export const noteCategoryLabel: Record<NoteCategory, string> = {
  general: "یادداشت آموزشی",
  behavior: "مشاهده رفتاری",
  strength: "نقطه قوت",
  improvement: "نیازمند بهبود",
};

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
export function fa(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\d/g, (d) => faDigits[Number(d)] ?? d);
}

export function faNum(n: number, digits = 0): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

/** Local YYYY-MM-DD */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export const todayISO = () => toISODate(new Date());

export function shiftDate(iso: string, days: number): string {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

function parseISO(iso: string) {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function jalali(iso: string, opts: "long" | "short" = "short"): string {
  const dt = parseISO(iso);
  return new Intl.DateTimeFormat(
    "fa-IR-u-ca-persian",
    opts === "long"
      ? { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      : { year: "numeric", month: "2-digit", day: "2-digit" },
  ).format(dt);
}

export function average(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function fullName(s: { first_name: string; last_name: string }) {
  return `${s.first_name} ${s.last_name}`;
}
