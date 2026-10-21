"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useUnsavedGuard } from "@/features/settings/use-unsaved-guard";
import { LoadError } from "@/features/courses/parts";
import { fromLocalInput, toLocalInput } from "@/features/courses/utils";
import { BackLink, errText, fieldErrors } from "@/features/studio/common";
import { ExamStatusBadge } from "./exams-page";
import { CandidatesTab } from "./candidates-tab";
import { examMessages as m } from "./messages";
import { PaperTab } from "./paper-tab";
import { ResultsTab } from "./results-tab";
import type { ExamDetail, ExamStatus } from "./types";

const t = m.detail;
const TABS = ["settings", "paper", "candidates", "results"] as const;
type Tab = (typeof TABS)[number];
export const examKey = (id: string | number) => ["studio", "exam", String(id)] as const;

const NEXT: Record<ExamStatus, ExamStatus[]> = {
  draft: ["active", "scheduled", "archived"],
  scheduled: ["active", "draft", "closed", "archived"],
  active: ["closed", "draft", "archived"],
  closed: ["active", "archived"],
  archived: ["draft", "closed"],
};

function Settings({ exam }: { exam: ExamDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const init = useMemo(
    () => ({
      title: exam.title,
      description: exam.description ?? "",
      duration: exam.duration ? String(exam.duration) : "",
      pass_score: String(exam.pass_score),
      max_attempts: String(exam.max_attempts),
      variant_count: String(exam.variant_count),
      starts_at: toLocalInput(exam.starts_at),
      ends_at: toLocalInput(exam.ends_at),
      room: exam.room ?? "",
      shuffle_questions: exam.shuffle_questions,
      shuffle_answers: exam.shuffle_answers,
      proctoring: exam.proctoring_enabled,
      show_score: exam.review_options?.show_score ?? true,
      show_answers: exam.review_options?.show_answers ?? false,
      show_correct_answers: exam.review_options?.show_correct_answers ?? false,
      show_explanation: exam.review_options?.show_explanation ?? false,
      when: exam.review_options?.when ?? "immediately",
    }),
    [exam],
  );
  const [f, setF] = useState(init);
  const [snap, setSnap] = useState(JSON.stringify(init));
  const [err, setErr] = useState<Record<string, string>>({});
  const [delOpen, setDelOpen] = useState(false);
  const dirty = JSON.stringify(f) !== snap;
  const guard = useUnsavedGuard(dirty);
  const archived = exam.status === "archived";
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, [k]: "" })); };

  const save = useMutation({
    mutationFn: () =>
      api.put<ExamDetail>(`/exams/${exam.id}`, {
        title: f.title.trim(),
        description: f.description.trim() || null,
        duration: f.duration ? Number(f.duration) : null,
        pass_score: Number(f.pass_score),
        max_attempts: Number(f.max_attempts),
        variant_count: Number(f.variant_count),
        starts_at: fromLocalInput(f.starts_at),
        ends_at: fromLocalInput(f.ends_at),
        room: f.room.trim() || null,
        shuffle_questions: f.shuffle_questions,
        shuffle_answers: f.shuffle_answers,
        proctoring: { enabled: f.proctoring },
        review_options: { show_score: f.show_score, show_answers: f.show_answers, show_correct_answers: f.show_correct_answers, show_explanation: f.show_explanation, when: f.when },
      }),
    onSuccess: () => {
      setSnap(JSON.stringify(f));
      toast.success(t.saved);
      void qc.invalidateQueries({ queryKey: examKey(exam.id) });
      void qc.invalidateQueries({ queryKey: ["studio", "exams"] });
    },
    onError: (e) => { setErr(fieldErrors(e)); toast.error(errText(e)); },
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/exams/${exam.id}`),
    onSuccess: () => { toast.success(t.deleted); void qc.invalidateQueries({ queryKey: ["studio", "exams"] }); router.replace("/studio/exams"); },
    onError: (e) => toast.error(errText(e)),
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = m.list.titleRequired;
    if (f.starts_at && f.ends_at && new Date(f.ends_at) < new Date(f.starts_at)) e.ends_at = t.endBeforeStart;
    setErr(e);
    if (!Object.keys(e).length) save.mutate();
  }

  return (
    <fieldset disabled={archived} className="space-y-6 pb-20">
      {archived && <Alert tone="info">{m.paper.archived}</Alert>}
      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <Field label={t.title} required error={err.title}><Input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={255} /></Field>
        <Field label={t.description}><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={3} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t.duration} hint={t.durationHint} error={err.duration}><Input value={f.duration} inputMode="numeric" onChange={(e) => set("duration", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label={t.passScore} error={err.pass_score}><Input value={f.pass_score} inputMode="numeric" onChange={(e) => set("pass_score", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label={t.maxAttempts} error={err.max_attempts}><Input value={f.max_attempts} inputMode="numeric" onChange={(e) => set("max_attempts", e.target.value.replace(/\D/g, ""))} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t.startsAt} error={err.starts_at}><DateTimePicker value={f.starts_at} onChange={(v) => set("starts_at", v)} /></Field>
          <Field label={t.endsAt} error={err.ends_at}><DateTimePicker value={f.ends_at} onChange={(v) => set("ends_at", v)} /></Field>
          <Field label={t.room}><Input value={f.room} onChange={(e) => set("room", e.target.value)} maxLength={64} /></Field>
        </div>
        <Field label={t.variants} className="max-w-40" error={err.variant_count}><Input value={f.variant_count} inputMode="numeric" onChange={(e) => set("variant_count", e.target.value.replace(/\D/g, ""))} /></Field>
      </section>
      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <h3 className="font-semibold">{t.options}</h3>
        <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
          <Switch checked={f.shuffle_questions} onCheckedChange={(v) => set("shuffle_questions", v)} label={t.shuffleQ} />
          <Switch checked={f.shuffle_answers} onCheckedChange={(v) => set("shuffle_answers", v)} label={t.shuffleA} />
          <Switch checked={f.proctoring} onCheckedChange={(v) => set("proctoring", v)} label={t.proctoring} />
        </div>
      </section>
      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <h3 className="font-semibold">{t.review}</h3>
        <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <Switch checked={f.show_score} onCheckedChange={(v) => set("show_score", v)} label={t.showScore} />
          <Switch checked={f.show_answers} onCheckedChange={(v) => set("show_answers", v)} label={t.showAnswers} />
          <Switch checked={f.show_correct_answers} onCheckedChange={(v) => set("show_correct_answers", v)} label={t.showCorrect} />
          <Switch checked={f.show_explanation} onCheckedChange={(v) => set("show_explanation", v)} label={t.showExplain} />
        </div>
        <Field label="Thời điểm cho xem" className="max-w-64">
          <Select value={f.when} onChange={(e) => set("when", e.target.value)}>
            {Object.entries(t.reviewWhen).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
      </section>
      <div><Button variant="danger" onClick={() => setDelOpen(true)}>{t.delete}</Button></div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface lg:left-64">
        <div className="mx-auto flex max-w-[104rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-muted" aria-live="polite">{dirty ? m.paper.dirty : ""}</p>
          <div className="flex gap-2">
            {dirty && <Button variant="outline" onClick={() => { setF(JSON.parse(snap)); setErr({}); }}>Hủy</Button>}
            <Button onClick={submit} loading={save.isPending} disabled={!dirty}>{t.save}</Button>
          </div>
        </div>
      </div>
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)} destructive title={t.deleteTitle} description={t.deleteText} confirmLabel="Xóa" loading={remove.isPending} onConfirm={() => remove.mutate()} />
      <Dialog open={guard.pendingHref !== null} onClose={guard.cancel} title="Rời khỏi trang?" description="Bạn có thay đổi chưa lưu." size="sm"
        footer={<><Button variant="outline" onClick={guard.cancel}>Ở lại</Button><Button variant="danger" onClick={guard.proceed}>Rời đi</Button></>} />
    </fieldset>
  );
}

export function ExamDetailPage({ examId }: { examId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const initial = ((): Tab => {
    if (typeof window === "undefined") return "settings";
    const p = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    return p && TABS.includes(p) ? p : "settings";
  })();
  const [tab, setTab] = useState<Tab>(initial);
  const [visited, setVisited] = useState<Set<Tab>>(new Set(["settings", initial]));

  const q = useQuery({ queryKey: examKey(examId), queryFn: () => api.get<ExamDetail>(`/exams/${examId}/detail`), staleTime: 30_000 });

  const setStatus = useMutation({
    mutationFn: (status: ExamStatus) => api.post<ExamDetail>(`/exams/${examId}/status`, { status }),
    onSuccess: () => { toast.success(t.statusChanged); void qc.invalidateQueries({ queryKey: examKey(examId) }); void qc.invalidateQueries({ queryKey: ["studio", "exams"] }); },
    onError: (e) => toast.error(errText(e)),
  });

  if (q.isPending) return <div aria-hidden><Skeleton className="h-4 w-32" /><Skeleton className="mt-4 h-8 w-80" /><Skeleton className="mt-6 h-96 w-full" /></div>;
  if (q.isError || !q.data) return <LoadError onRetry={() => void q.refetch()} />;
  const exam = q.data;
  const go = (k: Tab) => { setTab(k); setVisited((v) => new Set(v).add(k)); const u = new URL(window.location.href); u.searchParams.set("tab", k); window.history.replaceState(null, "", u); };

  return (
    <div>
      <BackLink href="/studio/exams">{t.back}</BackLink>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight"><span className="min-w-0 truncate">{exam.title}</span><ExamStatusBadge status={exam.status} /></h1>
          <p className="mt-1 text-muted">{exam.type === "course_final" ? (exam.course_title ?? m.kind.course_final) : m.kind.standalone} · {m.list.questions(exam.question_count)} · {m.list.candidates(exam.candidates_count)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {NEXT[exam.status].map((s) => (
            <Button key={s} variant={s === "active" ? "primary" : "outline"} size="sm" loading={setStatus.isPending && setStatus.variables === s} disabled={setStatus.isPending} onClick={() => setStatus.mutate(s)}>
              {t.statusActions[s]}
            </Button>
          ))}
        </div>
      </div>
      <div role="tablist" aria-label="Kỳ thi" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => go(k)} className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${tab === k ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>
            {t.tabs[k]}
          </button>
        ))}
      </div>
      <div hidden={tab !== "settings"} role="tabpanel"><Settings exam={exam} /></div>
      {visited.has("paper") && <div hidden={tab !== "paper"} role="tabpanel"><PaperTab exam={exam} /></div>}
      {visited.has("candidates") && <div hidden={tab !== "candidates"} role="tabpanel"><CandidatesTab exam={exam} /></div>}
      {visited.has("results") && <div hidden={tab !== "results"} role="tabpanel"><ResultsTab exam={exam} /></div>}
    </div>
  );
}
