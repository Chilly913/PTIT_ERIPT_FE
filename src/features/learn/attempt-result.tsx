"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { QueryError } from "@/components/site/query-state";
import { learnMessages as m } from "./messages";
import { ReviewView, type Review } from "./quiz-runner";

interface Result extends Review {
  id: number;
  title: string;
  kind: "exam" | "quiz";
  grading_status: "none" | "pending" | "graded";
  pass_score: number;
}

/** The result of a submitted attempt, including what a grader added after the learner submitted. */
export function AttemptResult({ attemptId }: { attemptId: number }) {
  const router = useRouter();
  const q = useQuery({
    queryKey: ["learn", "attempt-result", attemptId],
    queryFn: () => api.get<Result>(`/attempts/${attemptId}/result`),
    staleTime: 0,
    retry: false,
  });
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {q.isPending ? (
        <div className="space-y-4" aria-busy="true"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : q.isError ? (
        <QueryError error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-bold tracking-tight">{q.data.title}</h1>
          <ReviewView r={q.data} passScore={q.data.pass_score} onBack={() => router.back()} backLabel={m.quiz.resultBack} />
        </>
      )}
    </div>
  );
}
