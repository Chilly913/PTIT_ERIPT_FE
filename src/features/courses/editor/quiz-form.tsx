"use client";

import { Combobox } from "@/components/ui/combobox";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import type { Paginated } from "@/lib/types";
import type { Bank, BankDetail } from "@/features/qbank/types";
import { courseMessages as m } from "../messages";
import type { Lesson } from "../types";

const t = m.lesson.quizForm;

interface PickedQ { question_id: number; content: string; type: string; points: string }
interface QuizRes { quiz: { id: number; title: string; time_limit: number | null; pass_score: number; questions: Array<{ question_id: number; content: string; type: string; points: number | null }> } | null }

/** Authoring of the "Bài kiểm tra nhanh" attached to a lesson: pick questions from the course's question banks. */
export function QuizForm({ courseId, lesson }: { courseId: number; lesson: Lesson }) {
  const current = useQuery({ queryKey: ["studio", "lesson-quiz", courseId, lesson.id], queryFn: () => api.get<QuizRes>(`/courses/${courseId}/lessons/${lesson.id}/quiz`), staleTime: 15_000 });
  if (current.isPending) return <p className="text-sm text-muted">{m.common.saving}</p>;
  return <QuizEditor key={current.dataUpdatedAt} courseId={courseId} lesson={lesson} initial={current.data?.quiz ?? null} onSaved={() => void current.refetch()} />;
}

function QuizEditor({ courseId, lesson, initial, onSaved }: { courseId: number; lesson: Lesson; initial: QuizRes["quiz"]; onSaved: () => void }) {
  const toast = useToast();
  const [minutes, setMinutes] = useState(initial ? (initial.time_limit ? String(initial.time_limit) : "") : "10");
  const [pass, setPass] = useState(initial ? String(initial.pass_score) : "50");
  const [picked, setPicked] = useState<PickedQ[]>(() => (initial?.questions ?? []).map((x) => ({ question_id: x.question_id, content: x.content, type: x.type, points: x.points == null ? "" : String(x.points) })));
  const [bank, setBank] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const banks = useQuery({ queryKey: ["studio", "banks", String(courseId), "picker"], queryFn: () => api.get<Paginated<Bank>>(`/courses/${courseId}/question-banks`, { query: { per_page: 100 } }), staleTime: 30_000 });
  const detail = useQuery({ queryKey: ["studio", "bank", String(courseId), bank, "picker"], queryFn: () => api.get<BankDetail>(`/courses/${courseId}/question-banks/${bank}`, { query: { per_page: 100 } }), enabled: !!bank, staleTime: 30_000 });
  const chosen = new Set(picked.map((p) => p.question_id));
  const options = (detail.data?.questions.data ?? []).filter((q) => !chosen.has(q.id));

  const save = useMutation({
    mutationFn: () =>
      api.post(`/courses/${courseId}/lessons/${lesson.id}/quiz`, {
        time_limit: minutes ? Number(minutes) : null,
        pass_score: Number(pass),
        questions: picked.map((p) => ({ question_id: p.question_id, points: p.points === "" ? null : Number(p.points) })),
      }),
    onSuccess: () => { setErr(null); toast.success(t.saved); onSaved(); },
    onError: (e) => setErr(isApiError(e) ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : m.common.loadError),
  });

  return (
    <div className="space-y-3">
      <Alert tone="info">{t.hint}</Alert>
      {err && <Alert tone="danger">{err}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.minutes} hint={t.minutesHint}><Input value={minutes} inputMode="numeric" onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} /></Field>
        <Field label={t.pass}><Input value={pass} inputMode="numeric" onChange={(e) => setPass(e.target.value.replace(/\D/g, ""))} /></Field>
      </div>
      <div className="rounded-lg border border-border">
        <p className="border-b border-border px-3 py-2 text-sm font-medium">{t.selected(picked.length)}</p>
        {picked.length === 0 ? <p className="p-3 text-sm text-muted">{t.none}</p> : (
          <ul className="divide-y divide-border">
            {picked.map((p, i) => (
              <li key={p.question_id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-6 shrink-0 text-muted tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate" title={p.content}>{p.content}</span>
                <Input value={p.points} inputMode="decimal" aria-label={t.points} placeholder={t.points} className="h-8 w-20" onChange={(e) => setPicked((l) => l.map((x) => (x.question_id === p.question_id ? { ...x, points: e.target.value.replace(/[^\d.]/g, "") } : x)))} />
                <Button variant="ghost" size="sm" onClick={() => setPicked((l) => l.filter((x) => x.question_id !== p.question_id))}>{t.remove}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Field label={t.bank}>
        <Combobox value={bank} onChange={setBank} placeholder={t.bankNone} searchPlaceholder="Tìm ngân hàng..."
          options={(banks.data?.data ?? []).map((b) => ({ value: String(b.id), label: b.name, hint: `${b.question_count} câu hỏi` }))} />
      </Field>
      {bank && (
        <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
          {options.length === 0 ? <p className="p-3 text-sm text-muted">{detail.isPending ? m.common.saving : t.noMore}</p> : (
            <ul className="divide-y divide-border">
              {options.map((q) => (
                <li key={q.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate" title={q.content}>{q.content}</span>
                  <Button variant="outline" size="sm" onClick={() => setPicked((l) => [...l, { question_id: q.id, content: q.content, type: q.type, points: "" }])}>{t.add}</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Button onClick={() => { setErr(null); if (!picked.length) return setErr(t.none); save.mutate(); }} loading={save.isPending}>{t.save}</Button>
    </div>
  );
}
