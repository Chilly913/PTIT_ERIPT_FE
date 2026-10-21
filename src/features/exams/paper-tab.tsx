"use client";

import { Combobox } from "@/components/ui/combobox";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, XIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { useUnsavedGuard } from "@/features/settings/use-unsaved-guard";
import { CourseSelect, errText } from "@/features/studio/common";
import { qbMessages } from "@/features/qbank/messages";
import { questionPoints, type Bank, type BankDetail } from "@/features/qbank/types";
import { examKey } from "./exam-detail-page";
import { examMessages as m } from "./messages";
import type { ExamDetail, QuizQuestion, RandomRule } from "./types";

const t = m.paper;

interface FixedQ {
  question_id: number;
  code: string;
  type: string;
  content: string;
  default_score: number;
  points: string; // "" = default
}
interface Rule extends Omit<RandomRule, "points" | "difficulty"> {
  key: number;
  points: string;
  difficulty: string;
}
let seq = 0;

const fromQuiz = (q: QuizQuestion): FixedQ => ({ question_id: q.question_id, code: q.code, type: q.type, content: q.content, default_score: q.default_score, points: q.points == null ? "" : String(q.points) });
const fromRule = (r: RandomRule): Rule => ({ ...r, key: ++seq, points: r.points == null ? "" : String(r.points), difficulty: r.difficulty ? String(r.difficulty) : "" });

function Picker({ exam, existing, onAdd, onClose }: { exam: ExamDetail; existing: Set<number>; onAdd: (qs: FixedQ[]) => void; onClose: () => void }) {
  const [course, setCourse] = useState(exam.course_id ? String(exam.course_id) : "");
  const [bank, setBank] = useState("");
  const [picked, setPicked] = useState<Map<number, FixedQ>>(new Map());
  const banks = useQuery({ queryKey: ["studio", "banks", course, "picker"], queryFn: () => api.get<Paginated<Bank>>(`/courses/${course}/question-banks`, { query: { per_page: 100 } }), enabled: !!course, staleTime: 30_000 });
  const detail = useQuery({ queryKey: ["studio", "bank", course, bank, "picker"], queryFn: () => api.get<BankDetail>(`/courses/${course}/question-banks/${bank}`, { query: { per_page: 100 } }), enabled: !!course && !!bank, staleTime: 30_000 });
  const list = detail.data?.questions.data ?? [];
  const toggle = (id: number, q: FixedQ | null) => setPicked((p) => { const n = new Map(p); if (n.has(id)) n.delete(id); else if (q) n.set(id, q); return n; });
  return (
    <Dialog open onClose={onClose} size="lg" title={t.pickTitle}
      footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><Button disabled={picked.size === 0} onClick={() => { onAdd([...picked.values()]); onClose(); }}>{t.pickAdd(picked.size)}</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {!exam.course_id && <Field label={t.pickCourse}><CourseSelect value={course} onChange={(v) => { setCourse(v); setBank(""); }} /></Field>}
          <Field label={t.pickBank}>
            <Combobox value={bank} onChange={setBank} disabled={!course} placeholder={t.pickBankNone} searchPlaceholder="Tìm ngân hàng..."
              options={(banks.data?.data ?? []).map((b) => ({ value: String(b.id), label: b.name, hint: `${b.question_count} câu hỏi` }))} />
          </Field>
        </div>
        {bank && !detail.isPending && list.length === 0 && <p className="py-6 text-center text-sm text-muted">{t.pickEmpty}</p>}
        <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {list.map((q) => {
            const used = existing.has(q.id);
            return (
              <li key={q.id} className="flex items-start gap-3 px-3 py-2.5">
                <Checkbox checked={used || picked.has(q.id)} disabled={used} onChange={() => toggle(q.id, { question_id: q.id, code: q.code, type: q.type, content: q.content, default_score: questionPoints(q), points: "" })} aria-label={q.code} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{q.content}</p>
                  <p className="mt-1 flex gap-2 text-xs text-muted"><Badge tone="primary">{qbMessages.type[q.type]}</Badge><span>{qbMessages.difficulty[q.difficulty]}</span><span>{questionPoints(q)} điểm</span></p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}

export function PaperTab({ exam }: { exam: ExamDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const quiz = exam.quiz;
  const [fixed, setFixed] = useState<FixedQ[]>(() => quiz.questions.map(fromQuiz));
  const [rules, setRules] = useState<Rule[]>(() => quiz.random_rules.map(fromRule));
  const [snap, setSnap] = useState(() => JSON.stringify([quiz.questions.map(fromQuiz), quiz.random_rules.map((r) => ({ ...fromRule(r), key: 0 }))]));
  const [picking, setPicking] = useState(false);
  const [rulePicker, setRulePicker] = useState(false);
  const current = JSON.stringify([fixed, rules.map((r) => ({ ...r, key: 0 }))]);
  const dirty = current !== snap;
  const guard = useUnsavedGuard(dirty);
  const locked = exam.attempts_count > 0 || exam.status === "archived";

  const save = useMutation({
    mutationFn: () =>
      api.post(`/exams/${exam.id}/quiz`, {
        questions: fixed.map((q) => ({ question_id: q.question_id, points: q.points === "" ? null : Number(q.points) })),
        random_rules: rules.map((r) => ({ bank_id: r.bank_id, group_id: r.group_id ?? null, difficulty: r.difficulty ? Number(r.difficulty) : null, count: Number(r.count), points: r.points === "" ? null : Number(r.points) })),
      }),
    onSuccess: () => { setSnap(current); toast.success(t.saved); void qc.invalidateQueries({ queryKey: examKey(exam.id) }); void qc.invalidateQueries({ queryKey: ["studio", "exams"] }); },
    onError: (e) => toast.error(errText(e)),
  });

  const move = (i: number, d: -1 | 1) => setFixed((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const total = fixed.reduce((n, q) => n + (q.points === "" ? q.default_score : Number(q.points) || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      {locked && <Alert tone="info">{exam.status === "archived" ? t.archived : t.locked}</Alert>}
      {quiz.summary.warnings?.length > 0 && <Alert tone="warning">{quiz.summary.warnings.join(" ")}</Alert>}
      <fieldset disabled={locked} className="space-y-6">
        <section className="rounded-xl border border-border bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
            <div><h2 className="font-semibold">{t.fixed}</h2><p className="text-sm text-muted">{t.summary(fixed.length, total)}</p></div>
            <Button variant="outline" size="sm" onClick={() => setPicking(true)}><PlusIcon className="size-4" aria-hidden /> {t.addFromBank}</Button>
          </header>
          {fixed.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">{t.emptyFixed}</p> : (
            <ol className="divide-y divide-border">
              {fixed.map((q, i) => (
                <li key={q.question_id} className="flex items-start gap-3 px-4 py-3">
                  <span className="w-6 pt-1.5 text-center text-sm font-medium text-muted tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2">{q.content}</p>
                    <p className="mt-1 flex gap-2 text-xs text-muted"><Badge tone="primary">{qbMessages.type[q.type as keyof typeof qbMessages.type] ?? q.type}</Badge><span>{q.code}</span></p>
                  </div>
                  <label className="flex w-24 shrink-0 flex-col text-xs text-muted">{t.points}
                    <Input value={q.points} placeholder={String(q.default_score)} inputMode="decimal" className="h-8" onChange={(e) => setFixed((l) => l.map((x, k) => (k === i ? { ...x, points: e.target.value.replace(/[^\d.]/g, "") } : x)))} />
                  </label>
                  <div className="flex shrink-0 pt-4">
                    <Button variant="ghost" size="icon" className="size-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t.moveUp}><ChevronUpIcon className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="size-8" disabled={i === fixed.length - 1} onClick={() => move(i, 1)} aria-label={t.moveDown}><ChevronDownIcon className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => setFixed((l) => l.filter((_, k) => k !== i))} aria-label={t.remove}><XIcon className="size-4" /></Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
            <h2 className="font-semibold">{t.random}</h2>
            <Button variant="outline" size="sm" onClick={() => setRulePicker(true)}><PlusIcon className="size-4" aria-hidden /> {t.addRule}</Button>
          </header>
          {rules.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">{t.emptyRules}</p> : (
            <ul className="divide-y divide-border">
              {rules.map((r) => (
                <li key={r.key} className="flex flex-wrap items-end gap-3 px-4 py-3">
                  <div className="min-w-40 flex-1"><p className="text-xs text-muted">{t.ruleBank}</p><p className="font-medium">{r.bank_name ?? `#${r.bank_id}`}{r.group_name ? ` · ${r.group_name}` : ""}</p>{r.available != null && <p className="text-xs text-muted">{t.available(r.available)}</p>}</div>
                  <label className="w-32 text-xs text-muted">{t.ruleDifficulty}
                    <Select value={r.difficulty} onChange={(e) => setRules((l) => l.map((x) => (x.key === r.key ? { ...x, difficulty: e.target.value } : x)))}>
                      <option value="">{t.anyDifficulty}</option>
                      {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{qbMessages.difficulty[d]}</option>)}
                    </Select>
                  </label>
                  <label className="w-20 text-xs text-muted">{t.ruleCount}<Input value={String(r.count)} inputMode="numeric" className="h-9" onChange={(e) => setRules((l) => l.map((x) => (x.key === r.key ? { ...x, count: Number(e.target.value.replace(/\D/g, "")) } : x)))} /></label>
                  <label className="w-24 text-xs text-muted">{t.rulePoints}<Input value={r.points} inputMode="decimal" className="h-9" onChange={(e) => setRules((l) => l.map((x) => (x.key === r.key ? { ...x, points: e.target.value.replace(/[^\d.]/g, "") } : x)))} /></label>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setRules((l) => l.filter((x) => x.key !== r.key))} aria-label={t.remove}><XIcon className="size-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </fieldset>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface lg:left-64">
        <div className="mx-auto flex max-w-[104rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-muted" aria-live="polite">{dirty ? t.dirty : t.summary(quiz.summary.total_questions, quiz.summary.total_points)}</p>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty || locked}>{t.save}</Button>
        </div>
      </div>

      {picking && <Picker exam={exam} existing={new Set(fixed.map((q) => q.question_id))} onAdd={(qs) => setFixed((l) => [...l, ...qs])} onClose={() => setPicking(false)} />}
      {rulePicker && <RuleDialog exam={exam} onAdd={(rs) => setRules((l) => [...l, ...rs])} onClose={() => setRulePicker(false)} />}
      <Dialog open={guard.pendingHref !== null} onClose={guard.cancel} title="Rời khỏi trang?" description="Đề thi có thay đổi chưa lưu." size="sm"
        footer={<><Button variant="outline" onClick={guard.cancel}>Ở lại</Button><Button variant="danger" onClick={guard.proceed}>Rời đi</Button></>} />
    </div>
  );
}

/** Splits `total` over the weights with the largest-remainder method so the counts always add up to `total`. */
function splitByPercent(total: number, pct: number[]): number[] {
  const sum = pct.reduce((a, b) => a + b, 0);
  if (!sum || !total) return pct.map(() => 0);
  const raw = pct.map((p) => (total * p) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((x, y) => y.frac - x.frac)
    .forEach(({ i }) => {
      if (left > 0 && pct[i] > 0) {
        out[i]++;
        left--;
      }
    });
  return out;
}

function RuleDialog({ exam, onAdd, onClose }: { exam: ExamDetail; onAdd: (r: Rule[]) => void; onClose: () => void }) {
  const [course, setCourse] = useState(exam.course_id ? String(exam.course_id) : "");
  const [bank, setBank] = useState("");
  const [mode, setMode] = useState<"count" | "percent">("count");
  const [diff, setDiff] = useState("");
  const [count, setCount] = useState("5");
  const [total, setTotal] = useState("20");
  const [pct, setPct] = useState<string[]>(["0", "30", "50", "20", "0"]); // Rất dễ ... Rất khó
  const banks = useQuery({ queryKey: ["studio", "banks", course, "picker"], queryFn: () => api.get<Paginated<Bank>>(`/courses/${course}/question-banks`, { query: { per_page: 100 } }), enabled: !!course, staleTime: 30_000 });
  const b = banks.data?.data.find((x) => String(x.id) === bank);

  const pctNums = pct.map((p) => Number(p) || 0);
  const pctSum = pctNums.reduce((a, c) => a + c, 0);
  const counts = splitByPercent(Number(total) || 0, pctNums);
  const avail = (d: number) => (b ? Number(b.difficulty_distribution[String(d)] ?? 0) : 0);
  const short = counts.map((c, i) => (c > avail(i + 1) ? i + 1 : 0)).filter(Boolean);

  const canAdd = !!b && (mode === "count" ? Number(count) > 0 : pctSum === 100 && Number(total) > 0 && short.length === 0);
  const add = () => {
    if (!b) return;
    if (mode === "count") {
      onAdd([{ key: ++seq, bank_id: b.id, bank_name: b.name, count: Number(count), difficulty: diff, points: "", available: diff ? b.difficulty_distribution[diff] : b.question_count }]);
    } else {
      onAdd(counts.flatMap((c, i) => (c > 0 ? [{ key: ++seq, bank_id: b.id, bank_name: b.name, count: c, difficulty: String(i + 1), points: "", available: avail(i + 1) } as Rule] : [])));
    }
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={t.addRule} footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><Button disabled={!canAdd} onClick={add}>Thêm</Button></>}>
      <div className="space-y-3">
        {!exam.course_id && <Field label={t.pickCourse}><CourseSelect value={course} onChange={(v) => { setCourse(v); setBank(""); }} /></Field>}
        <Field label={t.ruleBank}>
          <Combobox value={bank} onChange={setBank} disabled={!course} placeholder={t.pickBankNone} searchPlaceholder="Tìm ngân hàng..."
            options={(banks.data?.data ?? []).map((x) => ({ value: String(x.id), label: x.name, hint: `${x.question_count} câu hỏi` }))} />
        </Field>
        <div role="tablist" aria-label={t.ruleMode} className="inline-flex rounded-lg border border-border p-0.5 text-sm">
          {(["count", "percent"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`rounded-md px-3 py-1 font-medium ${mode === k ? "bg-primary-soft text-primary-soft-foreground" : "text-muted hover:text-foreground"}`}>{k === "count" ? t.modeCount : t.modePercent}</button>
          ))}
        </div>
        {mode === "count" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.ruleDifficulty}><Select value={diff} onChange={(e) => setDiff(e.target.value)}><option value="">{t.anyDifficulty}</option>{[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{qbMessages.difficulty[d]}</option>)}</Select></Field>
            <Field label={t.ruleCount}><Input value={count} inputMode="numeric" onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} /></Field>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label={t.totalQuestions} className="max-w-40"><Input value={total} inputMode="numeric" onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} /></Field>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="pb-1.5 font-medium">{t.ruleDifficulty}</th><th className="pb-1.5 font-medium">{t.percent}</th><th className="pb-1.5 text-right font-medium">{t.drawn}</th><th className="pb-1.5 text-right font-medium">{t.inBank}</th></tr></thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((d, i) => (
                  <tr key={d} className="border-t border-border">
                    <td className="py-1.5">{qbMessages.difficulty[d]}</td>
                    <td className="py-1.5"><Input value={pct[i]} inputMode="numeric" aria-label={`${t.percent}: ${qbMessages.difficulty[d]}`} className="h-8 w-20" onChange={(e) => setPct((l) => l.map((x, k) => (k === i ? e.target.value.replace(/\D/g, "").slice(0, 3) : x)))} /></td>
                    <td className={`py-1.5 text-right tabular-nums ${counts[i] > avail(d) && b ? "font-medium text-danger" : ""}`}>{counts[i]}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted">{b ? avail(d) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={`text-sm ${pctSum === 100 ? "text-muted" : "text-danger"}`} aria-live="polite">{t.percentSum(pctSum)}</p>
            {short.length > 0 && b && <p className="text-sm text-danger">{t.notEnough(short.map((d) => qbMessages.difficulty[d]).join(", "))}</p>}
          </div>
        )}
      </div>
    </Dialog>
  );
}
