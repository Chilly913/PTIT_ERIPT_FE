import { LearnShell } from "@/features/learn/learn-shell";
import { loadCourse, loadProgress } from "@/features/learn/server";
import { requireUser } from "@/lib/guards";

export default async function LearnCourseLayout({ params, children }: { params: Promise<{ course: string }>; children: React.ReactNode }) {
  const { course } = await params;
  const user = await requireUser(`/learn/${course}`);
  const [c, p] = await Promise.all([loadCourse(course), loadProgress(course)]);
  return (
    <>
      <LearnShell course={course} userId={user.id} initialCourse={c.ok ? c.data : null} initialProgress={p.ok ? p.data : null} />
      {children}
    </>
  );
}
