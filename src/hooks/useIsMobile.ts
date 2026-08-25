import { useSyncExternalStore } from "react";

const mobileQuery =
  typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)") : null;

export function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      mobileQuery?.addEventListener("change", cb);
      return () => mobileQuery?.removeEventListener("change", cb);
    },
    () => mobileQuery?.matches ?? false,
    () => false,
  );
}

export default useIsMobile;
