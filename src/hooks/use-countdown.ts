"use client";

import { useCallback, useEffect, useState } from "react";

/** Counts down whole seconds. `start(n)` begins/restarts; `remaining` is 0 when idle. */
export function useCountdown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!until) return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n >= until) setUntil(0);
    };
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const n = Date.now();
    setNow(n);
    setUntil(n + seconds * 1000);
  }, []);

  const remaining = until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
  return { remaining, start };
}