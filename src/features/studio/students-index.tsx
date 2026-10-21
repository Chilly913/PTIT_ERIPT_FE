"use client";

import Link from "next/link";
import { BookIcon, PlusIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCourses } from "@/features/courses/api";
import { LoadError, StatusBadge, Thumb } from "@/features/courses/parts";
import { fmtNumber } from "@/features/courses/utils";
import { studioMessages } from "./messages";

const t = studioMessages.students;

export function StudentsIndexSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 mb-6 h-4 w-80" />
      <Card className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3"><Skeleton className="h-12 w-20" /><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-8 w-28" /></div>
        ))}
      </Card>
    </div>
  );
}

export function StudentsIndexPage() {
  const q = useMyCourses({ per_page: 100, sort: "learners" });
  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <Card>
        {q.isPending ? (
          <div className="divide-y divide-border" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-3"><Skeleton className="h-12 w-20" /><Skeleton className="h-4 w-1/3" /></div>)}
          </div>
        ) : q.isError ? (
          <LoadError onRetry={() => void q.refetch()} />
        ) : q.data.data.length === 0 ? (
          <EmptyState icon={<BookIcon />} title={t.empty} description={t.emptyText} action={<Link href="/studio/courses/new" className={buttonStyles()}><PlusIcon className="size-4" aria-hidden /> Tạo khóa học</Link>} />
        ) : (
          <ul className="divide-y divide-border">
            {q.data.data.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <Thumb src={c.thumbnail} className="h-12 w-20" rounded="rounded-md" />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="text-sm text-muted">{fmtNumber(c.enrollments_count ?? 0)} học viên · {fmtNumber(c.lessons_count ?? 0)} bài học</p>
                </div>
                <StatusBadge status={c.status} />
                <Link href={`/studio/courses/${c.id}?tab=students`} className={buttonStyles({ variant: "outline", size: "sm" })}>{t.open}</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
