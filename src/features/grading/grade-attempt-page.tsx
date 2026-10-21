"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api";
import { LoadError } from "@/features/courses/parts";
import { fmtDateTime } from "@/features/courses/utils";
import { BackLink, errText } from "@/features/studio/common";
import { qbMessages } from "@/features/qbank/messages";
import type { QType } from "@/features/qbank/types";
import { gradingMessages as m } from "./messages";
import type { GradingDetail, GradingFile, GradingQuestion } from "./types";

const fmtSize = (b: number) => (b >= 1 << 20 ? `${(b / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const BLANK = /\{\{\s*(\d{1,2})\s*\}\}/g;

interface Draft { score: string; comment: string }

function initialDrafts(d: GradingDetail): Record<number, Draft> {
  const out: Record<number, Draft> = {};
  for (const q of d.questions) if (q.manual) out[q.id] = { score: q.grade ? String(q.grade.score) : "", comment: q.grade?.comment ?? "" };
  return out;
}

function AnswerView({ q, attemptId }: { q: GradingQuestion; attemptId: number }) {
  if (q.type === "file_upload") {
    const files: GradingFile[] = q.files ?? [];
    if (!files.length) return <p className="text-sm text-muted">{m.noAnswer}</p>;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">{m.files}</p>
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
              <span className="text-sm text-muted tabular-nums">{fmtSize(f.size)}</span>
              <a href={`/bff/attempts/${attemptId}/files/${f.id}`} download className="text-sm font-medium text-primary hover:underline">{m.download}</a>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const text = typeof q.answer === "string" ? q.answer.trim() : "";
  return text ? <p className="rounded-lg bg-surface-muted p-3 whitespace-pre-line">{text}</p> : <p className="text-sm text-muted">{m.noAnswer}</p>;
}

function GradeForm({ data }: { data: GradingDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [drafts, setDrafts] = useState(() => initialDrafts(data));
  const [overall, setOverall] = useState(data.overall_feedback ?? "");
  const [errs, setErrs] = useState<Record<number, string>>({});
  const [formErr, setFormErr] = useState("");
  const numbering = new Map(data.questions.filter((q) => q.type !== "passage").map((q, i) => [q.id, i + 1] as const));
  const total = numbering.size;

  const save = useMutation({
    mutationFn: (body: unknown) => api.put<GradingDetail>(`/grading/attempts/${data.id}`, body),
    onSuccess: (fresh) => {
      qc.setQueryData(["studio", "grading-attempt", String(data.id)], fresh);
      void qc.invalidateQueries({ queryKey: ["studio", "grading"] });
      toast.success(fresh.pending ? m.saved : m.savedAllGraded);
    },
    onError: (e) => {
      setFormErr(errText(e));
      toast.error(errText(e));
    },
  });

  function submit() {
    const body: Record<string, { score: number; comment: string }> = {};
    const next: Record<number, string> = {};
    for (const q of data.questions) {
      const d = drafts[q.id];
      if (!q.manual || !d || d.score.trim() === "") continue;
      const v = Number(d.score.replace(",", "."));
      if (!Number.isFinite(v) || v < 0) next[q.id] = m.scoreInvalid;
      else if (v > q.points) next[q.id] = m.scoreTooHigh(q.points);
      else body[String(q.id)] = { score: v, comment: d.comment.trim() };
    }
    setErrs(next);
    setFormErr("");
    if (Object.keys(next).length) return;
    if (!Object.keys(body).length) return setFormErr(m.nothingToSave);
    save.mutate({ questions: body, overall_feedback: overall.trim() });
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted">{m.student}</p>
          <p className="font-semibold">{data.student.name}{data.student.student_code ? ` · ${data.student.student_code}` : ""}</p>
          <p className="text-sm text-muted">{data.student.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted">{m.total}</p>
          <p className="text-3xl font-extrabold tabular-nums">{data.score}<span className="text-lg text-muted">/100</span></p>
          <p className="text-sm text-muted">{data.points_earned}/{data.points_max} điểm · {m.passScore(data.pass_score)}</p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-2">
          {data.pending ? <Badge tone="warning">{m.status.pending}</Badge> : data.passed ? <Badge tone="success">{m.passed}</Badge> : <Badge tone="danger">{m.failed}</Badge>}
          <p className="text-xs text-muted">{fmtDateTime(data.submitted_at)}</p>
        </div>
      </Card>
      {data.pending && <Alert tone="info">{m.pendingNote}</Alert>}

      <ol className="space-y-3">
        {data.questions.map((q) => {
          if (q.type === "passage") {
            return (
              <li key={q.id} className="rounded-xl border border-dashed border-border bg-surface-muted p-4">
                <p className="text-sm font-semibold text-muted">{m.passage}</p>
                <p className="mt-1 whitespace-pre-line">{q.content}</p>
              </li>
            );
          }
          const d = drafts[q.id];
          return (
            <li key={q.id} className={`rounded-xl border border-border bg-surface p-5 ${q.parent_id ? "ml-4 sm:ml-8" : ""}`}>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="font-semibold text-foreground">{m.question(numbering.get(q.id) ?? 0, total)}</span>
                <Badge tone="primary">{qbMessages.type[q.type as QType] ?? q.type}</Badge>
                <span>{q.points} điểm</span>
                {!q.manual && <Badge tone={q.is_correct ? "success" : q.partial ? "warning" : "danger"}>{m.auto}: {m.autoResult(q.score ?? 0, q.points)}</Badge>}
              </div>
              <p className="mt-2 font-medium whitespace-pre-line">{q.type === "cloze" ? q.content.replace(BLANK, (_x, id: string) => `(${Number(id)}) ____`) : q.content}</p>
              {q.manual && (
                <>
                  <div className="mt-3"><AnswerView q={q} attemptId={data.id} /></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[12rem_1fr]">
                    <Field label={m.yourGrade} error={errs[q.id]} hint={m.outOf(q.points)}>
                      <Input
                        inputMode="decimal"
                        value={d?.score ?? ""}
                        onChange={(e) => { setDrafts((x) => ({ ...x, [q.id]: { ...(x[q.id] ?? { comment: "" }), score: e.target.value.replace(/[^\d.,]/g, "") } })); setErrs((x) => ({ ...x, [q.id]: "" })); }}
                      />
                    </Field>
                    <Field label={m.comment}>
                      <Textarea rows={2} value={d?.comment ?? ""} onChange={(e) => setDrafts((x) => ({ ...x, [q.id]: { ...(x[q.id] ?? { score: "" }), comment: e.target.value } }))} />
                    </Field>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>

      <Card className="space-y-3 p-5">
        <Field label={m.overall}><Textarea rows={3} value={overall} onChange={(e) => setOverall(e.target.value)} /></Field>
        {formErr && <p role="alert" className="text-sm text-danger">{formErr}</p>}
        <div className="flex justify-end"><Button onClick={submit} loading={save.isPending}>{m.save}</Button></div>
      </Card>
    </div>
  );
}

export function GradeAttemptPage({ attemptId }: { attemptId: string }) {
  const q = useQuery({
    queryKey: ["studio", "grading-attempt", attemptId],
    queryFn: () => api.get<GradingDetail>(`/grading/attempts/${attemptId}`),
    staleTime: 0,
    retry: false,
  });
  return (
    <div>
      <BackLink href="/studio/grading">{m.back}</BackLink>
      {q.isPending ? (
        <div aria-hidden className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-48 w-full" /></div>
      ) : q.isError ? (
        isApiError(q.error) && q.error.status === 404 ? <Alert tone="danger">{m.notFound}</Alert> : <LoadError onRetry={() => void q.refetch()} />
      ) : (
        <>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">{q.data.title}</h1>
          <p className="mb-5 text-muted">{m.kind[q.data.kind]}{q.data.course_title ? ` · ${q.data.course_title}` : ""}</p>
          <GradeForm key={`${q.data.id}:${q.data.graded_at ?? ""}`} data={q.data} />
        </>
      )}
    </div>
  );
}
