import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-2 h-5 w-64" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Skeleton className="h-8 w-48" />
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="space-y-2 p-4"><Skeleton className="h-5 w-20" /><Skeleton className="h-11 w-full" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-2 w-full" /><Skeleton className="h-8 w-full" /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
      </div>
    </div>
  );
}
