"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * The player shell lives in a layout and navigates between lessons with history.pushState (integrated with
 * the Next router): no server round trip, the curriculum and caches stay mounted. Pages under /learn render null.
 */
export function useLearnRoute(course: string) {
  const pathname = usePathname();
  const m = new RegExp(`^/learn/[^/]+/(\\d+)(/quiz)?/?$`).exec(pathname);
  const lessonId = m ? Number(m[1]) : null;
  const view: "lesson" | "quiz" | "index" = m ? (m[2] ? "quiz" : "lesson") : "index";

  const hrefFor = useCallback((id: number, quiz = false) => `/learn/${course}/${id}${quiz ? "/quiz" : ""}`, [course]);
  const go = useCallback((href: string, mode: "push" | "replace" = "push") => {
    if (mode === "push") window.history.pushState(null, "", href);
    else window.history.replaceState(null, "", href);
    window.scrollTo({ top: 0 });
    document.getElementById("learn-content")?.scrollTo({ top: 0 });
  }, []);

  return { lessonId, view, hrefFor, go };
}
