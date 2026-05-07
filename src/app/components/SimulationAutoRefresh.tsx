"use client";

import { startTransition, useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";

type Props = {
  enabled: boolean;
};

const REFRESH_INTERVAL_MS = 30_000;

export function SimulationAutoRefresh({ enabled }: Props) {
  const router = useRouter();

  const refreshRoute = useEffectEvent(() => {
    if (!enabled) return;
    if (document.visibilityState !== "visible") return;
    if (!window.navigator.onLine) return;

    startTransition(() => {
      router.refresh();
    });
  });

  useEffect(() => {
    if (!enabled) return;

    const intervalId = window.setInterval(() => {
      refreshRoute();
    }, REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshRoute();
      }
    };

    window.addEventListener("focus", refreshRoute);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshRoute);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, refreshRoute]);

  return null;
}
