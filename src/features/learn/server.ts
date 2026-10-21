import "server-only";
import { cache } from "react";
import { serverApi } from "@/lib/server-api";
import type { CourseDetail, CourseProgress } from "@/features/site/types";

/** Memoised per request: layout and page both need them. */
export const loadCourse = cache((course: string) => serverApi<CourseDetail>(`/courses/${encodeURIComponent(course)}`));
export const loadProgress = cache((course: string) => serverApi<CourseProgress>(`/courses/${encodeURIComponent(course)}/progress`));
