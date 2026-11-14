import { useEffect, useState } from "react";

/** Animates the numeric part of a formatted value from 0; non-numeric values render as-is. */
export function CountUp({ value, duration = 900 }: { value: string; duration?: number }) {
  const latin = value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/٫/g, ".").replace(/٬/g, "");
  const match = latin.match(/\d+(\.\d+)?/);
  const target = match ? Number(match[0]) : null;
  const decimals = match?.[1] ? match[1].length - 1 : 0;
  const [n, setN] = useState(target ?? 0);
  useEffect(() => {
    if (target === null || typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(target ?? 0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  if (target === null || !match) return <>{value}</>;
  const shown = new Intl.NumberFormat("fa-IR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  const before = value.slice(0, value.search(/[0-9۰-۹]/));
  const after = latin.slice((match.index ?? 0) + match[0].length);
  return <>{before}{shown}{after}</>;
}
