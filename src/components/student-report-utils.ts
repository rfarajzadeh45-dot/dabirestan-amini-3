import { faNum } from "@/lib/fa";
export function formatDelay(sec: number): string {
  return `${faNum(Math.max(1, Math.round(sec / 60)))} دقیقه تأخیر`;
}
