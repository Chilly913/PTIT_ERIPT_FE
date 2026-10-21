import { CourseCardSkeleton } from "@/components/site/course-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-16">
          <div className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-14 w-4/5" />
            <div className="flex gap-3"><Skeleton className="h-11 w-44" /><Skeleton className="h-11 w-36" /></div>
          </div>
          <Skeleton className="aspect-[7/5] w-full max-w-lg justify-self-end rounded-2xl" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
