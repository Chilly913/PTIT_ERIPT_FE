"use client";

import { Combobox } from "@/components/ui/combobox";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, XIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { Drawer } from "@/features/studio/drawer";
import { errText, fieldErrors } from "@/features/studio/common";
import { qbMessages as m } from "./messages";
import { blankIds, type Answer, type Group, type QMetadata, type QType, type Question } from "./types";

const t = m.detail;
const ALL_TYPES = Object.keys(m.type) as QType[];

interface Row {
  key: number;
  content: string;
  /** matching: right side; classification: category; cloze: blank id. */
  sub: string;
  correct: boolean;
}
let seq = 0;
const row = (content = "", correct = false, sub = ""): Row => ({ key: ++seq, content, sub, correct });
const blankOf = (r: Row) => (r.sub.trim() === "" ? "" : String(Number(r.sub)));

function initialRows(q: Question | null, type: QType): Row[] {
  if (q && q.type === type) return q.answers.map((a) => row(a.content, a.is_correct, a.sub_content ?? ""));
  if (type === "true_false") return [row(t.trueLabel, true), row(t.falseLabel, false)];
  if (type === "single_choice" || type === "multiple_choice") return [row("", true), row(""), row(""), row("")];
  if (type === "matching" || type === "classification") return [row("", false, ""), row("", false, "")];
  if (type === "ordering") return [row(), row(), row()];
  if (type === "short_answer") return [row("", true)];
  if (type === "numerical") return [row("", true)];
  return [];
}

interface Props {
  courseId: string;
  bankId: number;
  groups: Group[];
  /** The question being edited, or null to create one. */
  question: Question | null;
  /** Creating a sub-question of this passage. */
  parent?: Question | null;
  locked?: boolean;
  onClose: () => void;
}

export function QuestionEditor({ courseId, bankId, groups, question, parent = null, locked, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const isChild = !!parent || !!question?.parent_question_id;
  const types = isChild ? ALL_TYPES.filter((k) => k !== "passage") : ALL_TYPES;
  const [type, setType] = useState<QType>(question?.type ?? "single_choice");
  const [rows, setRows] = useState<Row[]>(() => initialRows(question, question?.type ?? "single_choice"));
  const [content, setContent] = useState(question?.content ?? "");
  const [difficulty, setDifficulty] = useState(String(question?.difficulty ?? 1));
  const [score, setScore] = useState(String(question?.default_score ?? 1));
  const [group, setGroup] = useState(question?.question_group_id ? String(question.question_group_id) : "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [tolerance, setTolerance] = useState(String(question?.metadata?.tolerance ?? 0));
  const [partial, setPartial] = useState(question?.metadata?.partial_credit ?? true);
  const [caseSensitive, setCaseSensitive] = useState(question?.metadata?.case_sensitive ?? false);
  const [input, setInput] = useState<"select" | "drag">(question?.metadata?.input ?? "select");
  const [maxFiles, setMaxFiles] = useState(String(question?.metadata?.max_files ?? 1));
  const [maxSize, setMaxSize] = useState(String(question?.metadata?.max_size_mb ?? 10));
  const [exts, setExts] = useState((question?.metadata?.allowed_ext ?? []).join(", "));
  const [err, setErr] = useState<Record<string, string>>({});
  const frozenKey = locked && !!question;

  const blanks = useMemo(() => (type === "cloze" ? blankIds(content) : []), [type, content]);

  function changeType(next: QType) {
    setType(next);
    setRows(initialRows(question, next));
    setErr({});
  }
  const setRow = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const setSingle = (key: number) => setRows((r) => r.map((x) => ({ ...x, correct: x.key === key })));
  const removeRow = (key: number) => setRows((x) => x.filter((y) => y.key !== key));

  const body = useMemo(() => {
    const keep = type === "cloze" ? rows.filter((r) => blanks.includes(blankOf(r)) && r.content.trim()) : rows;
    const answers: Answer[] = keep.map((r, i) => ({
      content: r.content.trim(),
      sub_content: type === "matching" || type === "classification" ? r.sub.trim() : type === "cloze" ? blankOf(r) : null,
      is_correct: ["ordering", "matching", "classification"].includes(type) ? false : r.correct,
      correct_position: type === "ordering" ? i + 1 : null,
    }));
    const b: Record<string, unknown> = {
      type,
      content: content.trim(),
      difficulty: Number(difficulty),
      default_score: type === "passage" ? 0 : Number(score) || 0,
      explanation: explanation.trim() || null,
      question_group_id: isChild ? null : group ? Number(group) : null,
      answers: type === "essay" || type === "passage" || type === "file_upload" ? [] : answers,
    };
    if (parent) b.parent_question_id = parent.id;
    const meta: QMetadata = {};
    if (type === "numerical") meta.tolerance = Number(tolerance) || 0;
    if (type === "cloze") Object.assign(meta, { partial_credit: partial, case_sensitive: caseSensitive, input });
    if (type === "classification") meta.partial_credit = partial;
    if (type === "file_upload") {
      meta.max_files = Number(maxFiles) || 1;
      meta.max_size_mb = Number(maxSize) || 10;
      const list = exts.split(/[,;\s]+/).map((e) => e.replace(/^\./, "").trim().toLowerCase()).filter(Boolean);
      if (list.length) meta.allowed_ext = list;
    }
    if (Object.keys(meta).length) b.metadata = meta;
    return b;
  }, [rows, blanks, type, content, difficulty, score, explanation, group, tolerance, partial, caseSensitive, input, isChild, parent, maxFiles, maxSize, exts]);

  const save = useMutation({
    mutationFn: () =>
      question
        ? api.put(`/courses/${courseId}/question-banks/${bankId}/questions/${question.id}`, body)
        : api.post(`/courses/${courseId}/question-banks/${bankId}/questions`, body),
    onSuccess: () => {
      toast.success(t.saved);
      void qc.invalidateQueries({ queryKey: ["studio", "bank", courseId, String(bankId)] });
      void qc.invalidateQueries({ queryKey: ["studio", "banks", courseId] });
      onClose();
    },
    onError: (e) => {
      setErr(fieldErrors(e));
      toast.error(errText(e));
    },
  });

  function submit() {
    if (!content.trim()) return setErr({ content: t.contentRequired });
    setErr({});
    save.mutate();
  }

  const multi = type === "multiple_choice";
  const choice = type === "single_choice" || multi;
  const pairs = type === "matching" || type === "classification";
  const ansErr = err.answers ?? Object.entries(err).find(([k]) => k.startsWith("answers"))?.[1];
  const hasWrongOption = rows.some((r) => !r.correct && blanks.includes(blankOf(r)) && r.content.trim());
  const categories = useMemo(() => [...new Set(rows.map((r) => r.sub.trim()).filter(Boolean))], [rows]);

  return (
    <Drawer
      open
      onRequestClose={onClose}
      title={question ? t.edit : parent ? t.addSub : t.create}
      description={parent ? t.subOf(parent.code) : question?.code}
      footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><Button loading={save.isPending} onClick={submit}>Lưu</Button></>}
      width="max-w-2xl"
    >
      <div className="space-y-4">
        {frozenKey && <Alert tone="warning">{t.frozen}</Alert>}
        <Field label={type === "passage" ? t.passageText : type === "cloze" ? t.clozeText : t.content} required error={err.content}>
          <Textarea value={content} onChange={(e) => { setContent(e.target.value); setErr((x) => ({ ...x, content: "" })); }} rows={type === "passage" ? 8 : 4} />
        </Field>
        <div className={`grid gap-3 ${type === "passage" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          <Field label={t.type}>
            <Select value={type} onChange={(e) => changeType(e.target.value as QType)} disabled={frozenKey}>
              {types.map((k) => <option key={k} value={k}>{m.type[k]}</option>)}
            </Select>
          </Field>
          <Field label={t.difficulty}>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{m.difficulty[d]}</option>)}
            </Select>
          </Field>
          {type !== "passage" && (
            <Field label={t.score} error={err.default_score}>
              <Input value={score} inputMode="decimal" onChange={(e) => setScore(e.target.value.replace(/[^\d.]/g, ""))} disabled={frozenKey} />
            </Field>
          )}
        </div>
        {groups.length > 0 && !isChild && (
          <Field label={t.group}>
            <Combobox value={group} onChange={setGroup} placeholder={t.noGroup} searchPlaceholder="Tìm nhóm..."
              options={groups.map((g) => ({ value: String(g.id), label: g.name }))} />
          </Field>
        )}

        <fieldset className="space-y-2" disabled={frozenKey}>
          {type !== "passage" && type !== "file_upload" && <legend className="mb-1 text-sm font-medium">{t.answers}</legend>}
          {type === "essay" && <p className="text-sm text-muted">{t.essayHint}</p>}
          {type === "short_answer" && <p className="text-sm text-muted">{t.shortHint}</p>}
          {type === "ordering" && <p className="text-sm text-muted">{t.orderingHint}</p>}
          {type === "passage" && <p className="text-sm text-muted">{t.passageHint}</p>}
          {type === "file_upload" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">{t.fileHint}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t.maxFiles} error={err["metadata.max_files"]}>
                  <Select value={maxFiles} onChange={(e) => setMaxFiles(e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
                </Field>
                <Field label={t.maxSize} error={err["metadata.max_size_mb"]}>
                  <Input value={maxSize} inputMode="numeric" onChange={(e) => setMaxSize(e.target.value.replace(/\D/g, ""))} />
                </Field>
              </div>
              <Field label={t.allowedExt} hint={t.allowedExtHint} error={err["metadata.allowed_ext"]}>
                <Input value={exts} onChange={(e) => setExts(e.target.value)} placeholder="pdf, docx, zip" />
              </Field>
            </div>
          )}
          {type === "classification" && <p className="text-sm text-muted">{t.classificationHint}</p>}

          {(choice || type === "true_false") &&
            rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm font-medium text-muted">{String.fromCharCode(65 + i)}</span>
                <Input value={r.content} onChange={(e) => setRow(r.key, { content: e.target.value })} placeholder={t.answerPlaceholder} aria-label={`${t.answerPlaceholder} ${i + 1}`} disabled={type === "true_false"} />
                {multi ? (
                  <Checkbox checked={r.correct} onChange={(e) => setRow(r.key, { correct: e.target.checked })} label={t.correct} />
                ) : (
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm">
                    <input type="radio" name="correct" checked={r.correct} onChange={() => setSingle(r.key)} className="size-4 accent-(--primary)" /> {t.correct}
                  </label>
                )}
                {choice && rows.length > 2 && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => removeRow(r.key)} aria-label="Xóa đáp án"><XIcon className="size-4" /></Button>
                )}
              </div>
            ))}

          {pairs && (
            <datalist id="qb-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          )}
          {pairs &&
            rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <Input value={r.content} onChange={(e) => setRow(r.key, { content: e.target.value })} placeholder={type === "matching" ? t.left : t.item} aria-label={`${type === "matching" ? t.left : t.item} ${i + 1}`} />
                <span aria-hidden className="text-muted">{type === "matching" ? "↔" : "→"}</span>
                <Input value={r.sub} list={type === "classification" ? "qb-categories" : undefined} onChange={(e) => setRow(r.key, { sub: e.target.value })} placeholder={type === "matching" ? t.right : t.category} aria-label={`${type === "matching" ? t.right : t.category} ${i + 1}`} />
                {rows.length > 2 && <Button variant="ghost" size="icon" className="size-8" onClick={() => removeRow(r.key)} aria-label="Xóa dòng"><XIcon className="size-4" /></Button>}
              </div>
            ))}

          {type === "ordering" &&
            rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm font-medium text-muted">{i + 1}</span>
                <Input value={r.content} onChange={(e) => setRow(r.key, { content: e.target.value })} placeholder={t.answerPlaceholder} aria-label={`${t.answerPlaceholder} ${i + 1}`} />
                {rows.length > 2 && <Button variant="ghost" size="icon" className="size-8" onClick={() => removeRow(r.key)} aria-label="Xóa mục"><XIcon className="size-4" /></Button>}
              </div>
            ))}

          {type === "short_answer" &&
            rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <Input value={r.content} onChange={(e) => setRow(r.key, { content: e.target.value, correct: true })} placeholder={t.answerPlaceholder} aria-label={`${t.answerPlaceholder} ${i + 1}`} />
                {rows.length > 1 && <Button variant="ghost" size="icon" className="size-8" onClick={() => removeRow(r.key)} aria-label="Xóa đáp án"><XIcon className="size-4" /></Button>}
              </div>
            ))}

          {type === "numerical" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.numericValue}><Input value={rows[0]?.content ?? ""} inputMode="decimal" onChange={(e) => setRows([row(e.target.value.replace(/[^\d.\-]/g, ""), true)])} /></Field>
              <Field label={t.tolerance} error={err["metadata.tolerance"]}><Input value={tolerance} inputMode="decimal" onChange={(e) => setTolerance(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
            </div>
          )}

          {type === "cloze" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">{t.clozeHint}</p>
              <Button variant="outline" size="sm" onClick={() => setContent((c) => `${c}${c && !c.endsWith(" ") ? " " : ""}{{${Math.max(0, ...blanks.map(Number)) + 1}}}`)}>
                <PlusIcon className="size-4" aria-hidden /> {t.addBlank}
              </Button>
              {blanks.map((id) => (
                <div key={id} className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold">{t.blank(id)}</p>
                  {!rows.some((r) => blankOf(r) === id) && <p className="text-sm text-muted">{t.noAnswerYet}</p>}
                  {rows.filter((r) => blankOf(r) === id).map((r, i) => (
                    <div key={r.key} className="flex items-center gap-2">
                      <Input value={r.content} onChange={(e) => setRow(r.key, { content: e.target.value })} placeholder={r.correct ? t.acceptedAnswer : t.wrongOption} aria-label={`${t.blank(id)} ${i + 1}`} />
                      <Checkbox checked={r.correct} onChange={(e) => setRow(r.key, { correct: e.target.checked })} label={t.correct} />
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => removeRow(r.key)} aria-label="Xóa"><XIcon className="size-4" /></Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setRows((x) => [...x, row("", true, id)])}>{t.addAccepted}</Button>
                    <Button variant="outline" size="sm" onClick={() => setRows((x) => [...x, row("", false, id)])}>{t.addWrong}</Button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <Checkbox checked={partial} onChange={(e) => setPartial(e.target.checked)} label={t.partial} />
                <Checkbox checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} label={t.caseSensitive} />
                {hasWrongOption && (
                  <label className="inline-flex items-center gap-2 text-sm">
                    {t.clozeInput}
                    <Select value={input} onChange={(e) => setInput(e.target.value as "select" | "drag")} className="w-40">
                      <option value="select">{t.clozeSelect}</option>
                      <option value="drag">{t.clozeDrag}</option>
                    </Select>
                  </label>
                )}
              </div>
            </div>
          )}

          {type === "classification" && <Checkbox checked={partial} onChange={(e) => setPartial(e.target.checked)} label={t.partial} />}

          {(choice || pairs || type === "ordering" || type === "short_answer") && (
            <Button variant="outline" size="sm" onClick={() => setRows((x) => [...x, row("", type === "short_answer")])}>
              <PlusIcon className="size-4" aria-hidden /> {type === "matching" ? t.addPair : type === "classification" ? t.addItem : t.addAnswer}
            </Button>
          )}
          {ansErr && <p role="alert" className="text-sm text-danger">{ansErr}</p>}
        </fieldset>

        {type !== "passage" && <Field label={t.explanation}><Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} /></Field>}
      </div>
    </Drawer>
  );
}
