import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-96 max-w-full" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <div className="order-first space-y-4 rounded-xl border border-border bg-surface p-4 lg:order-last">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
