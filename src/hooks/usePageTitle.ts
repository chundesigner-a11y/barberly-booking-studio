import { useEffect } from "react";

/** Sets document.title for the current page (client-side SPA replacement for route `head`). */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
