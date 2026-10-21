import { CourseCardSkeleton } from "@/components/site/course-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-2 h-5 w-80" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <div className="hidden space-y-3 rounded-xl border border-border bg-surface p-4 lg:block">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
        <div>
          <div className="flex gap-3"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-44" /></div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
