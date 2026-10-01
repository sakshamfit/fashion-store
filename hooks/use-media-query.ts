"use client";

import { useCallback, useSyncExternalStore } from "react";

/** SSR-safe media preferences, including changes made while the page is open. */
export function useMediaQuery(query: string, serverValue = false) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    [query],
  );
  const snapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const serverSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
