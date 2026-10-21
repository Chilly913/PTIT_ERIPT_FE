"use client";

import { useRouter } from "next/navigation";
import { QuizRunner } from "./quiz-runner";

/** Candidate screen of an exam: the same runner as the quick quiz, pointed at the exam endpoints. */
export function ExamTake({ examId }: { examId: number }) {
  const router = useRouter();
  if (!Number.isInteger(examId) || examId < 1) return null;
  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-6">
      <QuizRunner exam={examId} onBack={() => router.push("/my")} />
    </div>
  );
}
