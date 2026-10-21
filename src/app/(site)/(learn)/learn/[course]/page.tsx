import { redirect } from "next/navigation";
import { completedSet, firstUnfinished, flattenCurriculum } from "@/features/learn/api";
import { loadCourse, loadProgress } from "@/features/learn/server";

/** /learn/:course -> the first lesson that is not completed yet (the shell explains empty / forbidden cases). */
export default async function LearnIndex({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  const [c, p] = await Promise.all([loadCourse(course), loadProgress(course)]);
  if (c.ok && c.data) {
    const { flat } = flattenCurriculum(c.data);
    const target = firstUnfinished(flat, completedSet(p.ok ? p.data ?? undefined : undefined));
    if (target) redirect(`/learn/${course}/${target.id}`);
  }
  return null;
}
