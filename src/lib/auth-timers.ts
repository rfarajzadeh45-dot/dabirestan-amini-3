import { useEffect, useState } from "react";

export const RESET_RESEND_SECONDS = 60;
export const SIGNUP_RESEND_SECONDS = 10;
export const MAX_CODE_ATTEMPTS = 5;
export const CODE_LIFETIME_SECONDS = 300;

/** Seconds remaining until `until` (ms epoch); ticks every second. */
export function useCountdown(until: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
}

export function isRateLimited(err: { status?: number | undefined; code?: string | undefined; message?: string } | null) {
  return !!err && (err.status === 429 || /rate|limit|seconds/i.test(err.code ?? err.message ?? ""));
}
