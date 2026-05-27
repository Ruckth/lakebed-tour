"use client";

import { useEffect, useState } from "react";

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function useDeferredReady(timeoutMs = 900) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const idleWindow = window as IdleWindow;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(() => setReady(true), {
        timeout: timeoutMs,
      });
    } else {
      timeoutId = window.setTimeout(() => setReady(true), timeoutMs);
    }

    return () => {
      if (idleId !== null) {
        idleWindow.cancelIdleCallback?.(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [ready, timeoutMs]);

  return ready;
}
