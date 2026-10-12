import { useEffect, useState } from "react";

/** Мобильный breakpoint дизайн-системы — 720px (см. docs/design/design-system.md). */
export const MOBILE_MEDIA = "(max-width: 719px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(MOBILE_MEDIA).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA);
    const onChange = () => setIsMobile(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
