"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftIcon, CheckCircleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ClockIcon, RefreshIcon, XCircleIcon } from "@/components/icons";
import { FlagIcon } from "@/components/icons/icons-learn";
import { QueryError } from "@/components/site/query-state";
import { keys } from "./api";
import { learnMessages as m } from "./messages";

interface Option { id: number; content: string }
interface Question {
  id: number;
  type: string;
  content: string;
  points: number;
  options?: Option[];
  targets?: string[];
  /** cloze: the blanks of the text; a blank with options is a dropdown (or drag target). */
  blanks?: { id: string; options?: string[] }[];
  input?: string;
  /** classification: the groups the items are dragged into. */
  categories?: string[];
  /** Set on the sub-questions of a passage. */
  parent_id?: number;
  /** file_upload: what the learner may attach. */
  upload?: { max_files: number; max_size_mb: number; allowed_ext: string[] };
}
interface UploadedFile { id: number; name: string; size: number }
interface Attempt { id: number; status: string; remaining_time: number | null }
interface TakeResponse {
  attempt: Attempt;
  quiz: { id: number; title: string; description: string | null; time_limit: number | null; pass_score: number };
  questions: Question[];
  saved_answers: Record<string, unknown>;
  resumed: boolean;
}
interface ReviewQuestion extends Question {
  answer?: unknown;
  answered?: boolean;
  is_correct?: boolean | null;
  score?: number;
  grader_comment?: string | null;
  correct_answer?: unknown;
  explanation?: string | null;
  feedback?: string | null;
  general_feedback?: string | null;
  needs_manual?: boolean;
  partial?: boolean;
  manual?: boolean;
}
export interface Review {
  review_available?: boolean;
  score?: number;
  passed?: boolean | null;
  points_earned?: number;
  points_max?: number;
  pending_manual?: boolean;
  overall_feedback?: string | null;
  questions?: ReviewQuestion[];
  lesson_completed?: boolean;
  auto_submitted?: boolean;
}

type Answers = Record<string, unknown>;

const q_ = {
  loading: "Đang chuẩn bị bài kiểm tra...",
  question: (i: number, n: number) => `Câu ${i}/${n}`,
  points: (p: number) => `${p} điểm`,
  flag: "Đánh dấu xem lại",
  unflag: "Bỏ đánh dấu",
  palette: "Danh sách câu hỏi",
  answered: "Đã trả lời",
  unanswered: "Chưa trả lời",
  flagged: "Đã đánh dấu",
  prev: "Câu trước",
  next: "Câu sau",
  submit: "Nộp bài",
  submitting: "Đang nộp...",
  confirmTitle: "Nộp bài kiểm tra?",
  confirmText: (un: number, fl: number) =>
    un || fl ? `Bạn còn ${un} câu chưa trả lời${fl ? ` và ${fl} câu đánh dấu xem lại` : ""}. Sau khi nộp sẽ không sửa được.` : "Bạn đã trả lời tất cả câu hỏi. Sau khi nộp sẽ không sửa được.",
  timeLeft: "Thời gian còn lại",
  saved: "Đã lưu tự động",
  saving: "Đang lưu...",
  saveFail: "Chưa lưu được, sẽ thử lại",
  result: "Kết quả",
  passed: "Đạt",
  failed: "Chưa đạt",
  pending: "Đang chờ giảng viên chấm",
  score: "Điểm",
  earned: (a: number, b: number) => `${a}/${b} điểm`,
  retry: "Làm lại",
  backToLesson: "Về bài học",
  yourAnswer: "Bài làm của bạn",
  correctAnswer: "Đáp án đúng",
  explanation: "Giải thích",
  reviewHidden: "Giảng viên chưa mở xem chi tiết đáp án.",
  notAnswered: "Chưa trả lời",
  essayPlaceholder: "Nhập câu trả lời của bạn...",
  shortPlaceholder: "Nhập đáp án",
  numPlaceholder: "Nhập số",
  matchPick: "Chọn đáp án ghép",
  orderHint: "Dùng nút mũi tên để sắp xếp đúng thứ tự.",
  classifyHint: "Kéo mục vào đúng nhóm, hoặc bấm vào mục rồi bấm \"Đặt vào nhóm\". Bấm mục đã xếp để bỏ ra.",
  clozeDragHint: "Kéo từ vào chỗ trống, hoặc bấm vào từ rồi bấm chỗ trống. Bấm chỗ trống đã điền để bỏ từ ra.",
  placeHere: "Đặt vào nhóm",
  allPlaced: "Đã xếp hết",
  blankLabel: (id: string) => `Chỗ trống ${id}`,
  pickWord: "Chọn",
  passage: "Đoạn văn",
  uploadPick: "Chọn tệp",
  uploading: "Đang tải lên...",
  uploadRemove: "Xóa tệp",
  uploadRules: (n: number, mb: number, ext: string[]) => `Tối đa ${n} tệp, mỗi tệp không quá ${mb} MB${ext.length ? `. Định dạng: ${ext.join(", ")}` : ""}.`,
  uploadFull: (n: number) => `Đã đủ ${n} tệp. Xóa bớt để tải tệp khác.`,
  uploadFail: "Không tải được tệp.",
  partial: "Đúng một phần",
  multiHint: "Chọn tất cả đáp án đúng.",
  paused: "Bài thi đang tạm dừng.",
  expiredAuto: "Hết giờ, bài làm đã được nộp tự động.",
  noQuestions: "Bài kiểm tra nhanh chưa có câu hỏi.",
};

function isAnswered(a: unknown): boolean {
  if (a === undefined || a === null) return false;
  if (typeof a === "string") return a.trim() !== "";
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === "object") return Object.values(a as object).some((v) => v !== "" && v !== null);
  return true;
}

function fmtClock(s: number) {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const mm = String(Math.floor((t % 3600) / 60)).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(t % 60).padStart(2, "0")}`;
}

/* ---------- inputs ---------- */

function OptionRow({ type, checked, onChange, children, name, state }: { type: "radio" | "checkbox"; checked: boolean; onChange: () => void; children: React.ReactNode; name: string; state?: "right" | "wrong" | null }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-surface-subtle", checked ? "border-primary bg-primary-soft" : "border-border", state === "right" && "border-success bg-success-soft", state === "wrong" && "border-danger bg-danger-soft")}>
      <input type={type} name={name} checked={checked} onChange={onChange} className="mt-1 size-4 accent-(--primary)" />
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </label>
  );
}

const BLANK_RE = /\{\{\s*(\d{1,2})\s*\}\}/g;

function Chip({ children, selected, onClick, dragData, title }: { children: React.ReactNode; selected?: boolean; onClick: () => void; dragData?: string; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={selected}
      draggable={dragData !== undefined}
      onDragStart={(e) => { if (dragData !== undefined) e.dataTransfer.setData("text/plain", dragData); }}
      onClick={onClick}
      className={cn("cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors", selected ? "border-primary bg-primary-soft font-semibold" : "border-border bg-surface hover:bg-surface-subtle")}
    >
      {children}
    </button>
  );
}

function asMap(value: unknown): Record<string, string> {
  return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, string>;
}

/** Drag items into groups (or tap an item, then tap the group). */
function ClassificationInput({ q, value, onChange }: { q: Question; value: unknown; onChange: (v: unknown) => void }) {
  const cur = asMap(value);
  const [picked, setPicked] = useState<number | null>(null);
  const items = q.options ?? [];
  const unplaced = items.filter((o) => !cur[o.id]);
  const place = (id: number, cat: string) => {
    if (!items.some((o) => o.id === id)) return;
    onChange({ ...cur, [id]: cat });
    setPicked(null);
  };
  const unplace = (id: number) => {
    const next = { ...cur };
    delete next[id];
    onChange(next);
  };
  const dropped = (e: React.DragEvent) => {
    e.preventDefault();
    return Number(e.dataTransfer.getData("text/plain"));
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{q_.classifyHint}</p>
      <div
        className="flex min-h-12 flex-wrap gap-2 rounded-lg border border-dashed border-border p-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => unplace(dropped(e))}
      >
        {unplaced.map((o) => <Chip key={o.id} selected={picked === o.id} dragData={String(o.id)} onClick={() => setPicked(picked === o.id ? null : o.id)}>{o.content}</Chip>)}
        {unplaced.length === 0 && <span className="self-center px-1 text-sm text-muted">{q_.allPlaced}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(q.categories ?? []).map((cat) => (
          <div key={cat} className="rounded-lg border border-border p-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => place(dropped(e), cat)}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{cat}</p>
              <Button variant="outline" size="sm" disabled={picked === null} onClick={() => picked !== null && place(picked, cat)}>{q_.placeHere}</Button>
            </div>
            <div className="mt-2 flex min-h-10 flex-wrap gap-2">
              {items.filter((o) => cur[o.id] === cat).map((o) => <Chip key={o.id} dragData={String(o.id)} title="Bấm để bỏ ra" onClick={() => unplace(o.id)}>{o.content} ×</Chip>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Text with blanks: text boxes, dropdowns, or draggable words. */
function ClozeInput({ q, value, onChange }: { q: Question; value: unknown; onChange: (v: unknown) => void }) {
  const cur = asMap(value);
  const blanks = new Map((q.blanks ?? []).map((b) => [b.id, b]));
  const drag = q.input === "drag";
  const [picked, setPicked] = useState<string | null>(null);
  const set = (id: string, word: string) => {
    onChange({ ...cur, [id]: word });
    setPicked(null);
  };
  const clear = (id: string) => {
    const next = { ...cur };
    delete next[id];
    onChange(next);
  };
  const words = [...new Set((q.blanks ?? []).flatMap((b) => b.options ?? []))];
  const used = new Set(Object.values(cur));
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const mt of q.content.matchAll(BLANK_RE)) {
    const id = String(Number(mt[1]));
    const at = mt.index ?? 0;
    if (at > last) parts.push(<span key={`t${at}`}>{q.content.slice(last, at)}</span>);
    last = at + mt[0].length;
    const b = blanks.get(id);
    const label = q_.blankLabel(id);
    if (b?.options && drag) {
      parts.push(
        <button
          key={`b${at}`}
          type="button"
          aria-label={label}
          onClick={() => (picked ? set(id, picked) : cur[id] ? clear(id) : undefined)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const w = e.dataTransfer.getData("text/plain"); if (words.includes(w)) set(id, w); }}
          className={cn("mx-1 inline-flex min-h-9 min-w-24 items-center justify-center rounded-lg border border-dashed px-3 align-middle", cur[id] ? "border-primary bg-primary-soft font-semibold" : "border-border-control text-muted", picked && "ring-2 ring-ring")}
        >
          {cur[id] || `(${id})`}
        </button>,
      );
    } else if (b?.options) {
      parts.push(
        <select key={`b${at}`} aria-label={label} value={cur[id] ?? ""} onChange={(e) => (e.target.value ? set(id, e.target.value) : clear(id))} className="mx-1 h-9 rounded-lg border border-border-control bg-surface px-2 align-middle">
          <option value="">{`(${id})`}</option>
          {b.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>,
      );
    } else {
      parts.push(<Input key={`b${at}`} aria-label={label} value={cur[id] ?? ""} onChange={(e) => (e.target.value ? set(id, e.target.value) : clear(id))} placeholder={`(${id})`} className="mx-1 inline-block h-9 w-40 align-middle" />);
    }
  }
  if (last < q.content.length) parts.push(<span key="end">{q.content.slice(last)}</span>);
  return (
    <div className="space-y-4">
      <p className="text-base leading-10 font-medium whitespace-pre-line">{parts}</p>
      {drag && words.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted">{q_.clozeDragHint}</p>
          <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border p-2" onDragOver={(e) => e.preventDefault()}>
            {words.filter((w) => !used.has(w)).map((w) => <Chip key={w} selected={picked === w} dragData={w} onClick={() => setPicked(picked === w ? null : w)}>{w}</Chip>)}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtSize(b: number) {
  return b >= 1 << 20 ? `${(b / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

/** Attach files to the attempt; the server keeps them and rebuilds the answer from what it stored. */
function FileUploadInput({ q, value, onChange, attemptId }: { q: Question; value: unknown; onChange: (v: unknown) => void; attemptId: number }) {
  const files = ((value as { files?: UploadedFile[] } | undefined)?.files ?? []) as UploadedFile[];
  const rules = q.upload ?? { max_files: 1, max_size_mb: 10, allowed_ext: [] };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function pick(list: FileList | null) {
    if (!list?.length) return;
    setErr("");
    let cur = files;
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        if (cur.length >= rules.max_files) {
          setErr(q_.uploadFull(rules.max_files));
          break;
        }
        const fd = new FormData();
        fd.append("question_id", String(q.id));
        fd.append("file", file);
        cur = [...cur, await api.post<UploadedFile>(`/attempts/${attemptId}/files`, fd)];
        onChange({ files: cur });
      }
    } catch (e) {
      setErr(isApiError(e) && e.message ? e.message : q_.uploadFail);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function remove(f: UploadedFile) {
    setErr("");
    try {
      await api.delete(`/attempts/${attemptId}/files/${f.id}`);
      const next = files.filter((x) => x.id !== f.id);
      onChange(next.length ? { files: next } : undefined);
    } catch (e) {
      setErr(isApiError(e) && e.message ? e.message : q_.uploadFail);
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{q_.uploadRules(rules.max_files, rules.max_size_mb, rules.allowed_ext)}</p>
      <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label={q_.uploadPick} multiple={rules.max_files > 1} accept={rules.allowed_ext.map((e) => `.${e}`).join(",")} onChange={(e) => void pick(e.target.files)} />
      <Button variant="outline" loading={busy} disabled={files.length >= rules.max_files} onClick={() => input.current?.click()}>{busy ? q_.uploading : q_.uploadPick}</Button>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
              <span className="text-sm text-muted tabular-nums">{fmtSize(f.size)}</span>
              <Button variant="ghost" size="sm" aria-label={`${q_.uploadRemove}: ${f.name}`} onClick={() => void remove(f)}>{q_.uploadRemove}</Button>
            </li>
          ))}
        </ul>
      )}
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
    </div>
  );
}

function QuestionInput({ q, value, onChange, attemptId }: { q: Question; value: unknown; onChange: (v: unknown) => void; attemptId: number }) {
  const opts = q.options ?? [];
  const name = `q${q.id}`;
  switch (q.type) {
    case "single_choice":
    case "true_false": {
      const cur = Array.isArray(value) ? value[0] : value;
      return (
        <div className="space-y-2" role="radiogroup">
          {opts.map((o) => <OptionRow key={o.id} type="radio" name={name} checked={cur === o.id} onChange={() => onChange(o.id)}>{o.content}</OptionRow>)}
        </div>
      );
    }
    case "multiple_choice": {
      const cur = Array.isArray(value) ? (value as number[]) : [];
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted">{q_.multiHint}</p>
          {opts.map((o) => (
            <OptionRow key={o.id} type="checkbox" name={name} checked={cur.includes(o.id)} onChange={() => onChange(cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id])}>{o.content}</OptionRow>
          ))}
        </div>
      );
    }
    case "matching": {
      const cur = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, string>;
      return (
        <ul className="space-y-2">
          {opts.map((o) => (
            <li key={o.id} className="grid items-center gap-2 sm:grid-cols-2">
              <span className="rounded-lg bg-surface-muted p-3">{o.content}</span>
              <select
                aria-label={o.content}
                value={cur[o.id] ?? ""}
                onChange={(e) => onChange({ ...cur, [o.id]: e.target.value })}
                className="h-11 rounded-lg border border-border-control bg-surface px-3"
              >
                <option value="">{q_.matchPick}</option>
                {(q.targets ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </li>
          ))}
        </ul>
      );
    }
    case "ordering": {
      const ids = Array.isArray(value) && value.length === opts.length ? (value as number[]) : opts.map((o) => o.id);
      const move = (i: number, d: number) => {
        const n = [...ids];
        const j = i + d;
        if (j < 0 || j >= n.length) return;
        [n[i], n[j]] = [n[j], n[i]];
        onChange(n);
      };
      const byId = new Map(opts.map((o) => [o.id, o]));
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted">{q_.orderHint}</p>
          <ol className="space-y-2">
            {ids.map((id, i) => (
              <li key={id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold">{i + 1}</span>
                <span className="min-w-0 flex-1 break-words">{byId.get(id)?.content}</span>
                <Button variant="ghost" size="icon" aria-label="Lên" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUpIcon size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label="Xuống" disabled={i === ids.length - 1} onClick={() => move(i, 1)}><ChevronDownIcon size={16} /></Button>
              </li>
            ))}
          </ol>
        </div>
      );
    }
    case "file_upload":
      return <FileUploadInput q={q} value={value} onChange={onChange} attemptId={attemptId} />;
    case "cloze":
      return <ClozeInput q={q} value={value} onChange={onChange} />;
    case "classification":
      return <ClassificationInput q={q} value={value} onChange={onChange} />;
    case "essay":
      return <Textarea rows={8} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder={q_.essayPlaceholder} aria-label={q.content} />;
    case "numerical":
      return <Input inputMode="decimal" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder={q_.numPlaceholder} aria-label={q.content} className="max-w-xs" />;
    default:
      return <Input value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder={q_.shortPlaceholder} aria-label={q.content} className="max-w-md" />;
  }
}

/* ---------- review ---------- */

function show(q: ReviewQuestion, v: unknown): string {
  if (v === undefined || v === null || v === "") return q_.notAnswered;
  const opts = new Map((q.options ?? []).map((o) => [o.id, o.content]));
  if (typeof v === "number") return opts.get(v) ?? String(v);
  if (typeof v === "boolean") return v ? "Đúng" : "Sai";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "number" ? (opts.get(x) ?? String(x)) : String(x))).join(q.type === "ordering" ? " → " : "; ");
  if (q.type === "file_upload" && typeof v === "object" && v) {
    const list = ((v as { files?: UploadedFile[] }).files ?? []).map((f) => f.name);
    return list.length ? list.join(", ") : q_.notAnswered;
  }
  if (q.type === "cloze" && typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).map(([k, val]) => `(${k}) ${Array.isArray(val) ? val.join(" / ") : String(val || "…")}`).join("; ");
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("value" in o) return `${o.value}${o.tolerance ? ` (±${o.tolerance}${o.tolerance_type === "percent" ? "%" : ""})` : ""}`;
    return Object.entries(o).map(([k, val]) => `${opts.get(Number(k)) ?? k} ↔ ${String(val)}`).join("; ");
  }
  return String(v);
}

export function ReviewView({ r, passScore, onRetry, onBack, backLabel }: { r: Review; passScore: number; onRetry?: () => void; onBack: () => void; backLabel?: string }) {
  const hasScore = r.score !== undefined;
  const pass = r.passed;
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-6 text-center" aria-live="polite">
        <p className="text-sm font-semibold tracking-wide text-muted uppercase">{q_.result}</p>
        {hasScore ? (
          <>
            <p className="mt-2 text-5xl font-extrabold">{Math.round((r.score ?? 0) * 100) / 100}<span className="text-2xl text-muted">/100</span></p>
            <div className="mt-2 flex justify-center">
              {r.pending_manual || pass === null || pass === undefined ? <Badge tone="warning">{q_.pending}</Badge> : pass ? <Badge tone="success"><CheckCircleIcon size={12} />{q_.passed}</Badge> : <Badge tone="danger"><XCircleIcon size={12} />{q_.failed}</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted">{r.points_max !== undefined && r.points_earned !== undefined ? `${q_.earned(r.points_earned, r.points_max)} · ` : ""}{m.quiz.passScore(passScore)}</p>
            {r.overall_feedback && <p className="mt-2">{r.overall_feedback}</p>}
          </>
        ) : (
          <p className="mt-2 text-muted">{q_.reviewHidden}</p>
        )}
        {r.auto_submitted && <p className="mt-2 text-sm text-warning">{q_.expiredAuto}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {onRetry && <Button onClick={onRetry}><RefreshIcon size={16} />{q_.retry}</Button>}
          <Button variant="outline" onClick={onBack}><ArrowLeftIcon size={16} />{backLabel ?? q_.backToLesson}</Button>
        </div>
      </section>

      {r.questions && r.questions.length > 0 && (
        <ol className="space-y-4">
          {(() => {
            const total = r.questions.filter((x) => x.type !== "passage").length;
            let n = 0;
            return r.questions.map((q) => {
              if (q.type === "passage") {
                return (
                  <li key={q.id} className="rounded-xl border border-dashed border-border bg-surface-muted p-4">
                    <p className="text-sm font-semibold text-muted">{q_.passage}</p>
                    <p className="mt-1 whitespace-pre-line">{q.content}</p>
                  </li>
                );
              }
              n += 1;
              return (
                <li key={q.id} className={cn("rounded-xl border border-border bg-surface p-4", q.parent_id && "ml-4 sm:ml-8")}>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span className="font-semibold text-foreground">{q_.question(n, total)}</span>
                    {q.is_correct === true && <Badge tone="success">{q_.passed}</Badge>}
                    {q.is_correct === false && q.partial && <Badge tone="warning">{q_.partial}</Badge>}
                    {q.is_correct === false && !q.partial && <Badge tone="danger">{q_.failed}</Badge>}
                    {q.needs_manual && <Badge tone="warning">{q_.pending}</Badge>}
                    {q.score !== undefined && <span>{q.score}/{q.points}</span>}
                  </div>
                  <p className="mt-2 font-medium whitespace-pre-line">{q.type === "cloze" ? q.content.replace(BLANK_RE, (_m, d: string) => `(${Number(d)}) ____`) : q.content}</p>
                  {"answer" in q && (
                    <p className="mt-3 text-sm"><span className="text-muted">{q_.yourAnswer}: </span><span className={cn("font-medium", q.is_correct === true && "text-success", q.is_correct === false && "text-danger")}>{show(q, q.answer)}</span></p>
                  )}
                  {q.correct_answer !== undefined && q.is_correct !== true && (
                    <p className="mt-1 text-sm"><span className="text-muted">{q_.correctAnswer}: </span><span className="font-medium text-success">{show(q, q.correct_answer)}</span></p>
                  )}
                  {(q.explanation || q.feedback || q.general_feedback) && (
                    <p className="mt-2 rounded-lg bg-surface-muted p-3 text-sm"><span className="font-semibold">{q_.explanation}: </span>{q.explanation || q.feedback || q.general_feedback}</p>
                  )}
                  {q.grader_comment && <p className="mt-2 text-sm text-muted">{q.grader_comment}</p>}
                </li>
              );
            });
          })()}
        </ol>
      )}
    </div>
  );
}

/* ---------- runner ---------- */

interface Page { passage?: Question; items: Question[] }

/** Groups a passage with its sub-questions (they follow it in the list); other questions get one page each. */
function buildPages(qs: Question[]): { pages: Page[]; items: Question[] } {
  const pages: Page[] = [];
  const items: Question[] = [];
  for (const x of qs) {
    if (x.type === "passage") {
      pages.push({ passage: x, items: [] });
      continue;
    }
    const last = pages[pages.length - 1];
    if (x.parent_id && last?.passage?.id === x.parent_id) last.items.push(x);
    else pages.push({ items: [x] });
    items.push(x);
  }
  return { pages: pages.filter((pg) => pg.items.length > 0), items };
}

function Runner({ submitPath, data, onFinished, onBack, onRetry }: { submitPath: (quizId: number) => string; data: TakeResponse; onFinished: (completed: boolean) => void; onBack: () => void; onRetry: () => void }) {
  const attemptId = data.attempt.id;
  const flagKey = `eript:quiz-flags:${attemptId}`;
  const [answers, setAnswers] = useState<Answers>(data.saved_answers ?? {});
  const [idx, setIdx] = useState(0);
  const [flags, setFlags] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(window.localStorage.getItem(flagKey) ?? "[]") as number[]); } catch { return new Set(); }
  });
  const [confirm, setConfirm] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [deadline] = useState<number | null>(() => (data.attempt.remaining_time === null ? null : Date.now() + data.attempt.remaining_time * 1000));
  const [left, setLeft] = useState<number | null>(data.attempt.remaining_time);
  const answersRef = useRef(answers);
  const dirty = useRef(false);
  const submitting = useRef(false);

  useEffect(() => { answersRef.current = answers; });

  // A passage and its sub-questions share one page; every other question has a page of its own.
  const { pages, items } = useMemo(() => buildPages(data.questions), [data.questions]);

  const save = useCallback(async () => {
    if (!dirty.current || submitting.current) return;
    dirty.current = false;
    setSaveState("saving");
    try {
      await api.post(`/attempts/${attemptId}/auto-save`, { answers: answersRef.current });
      setSaveState("saved");
    } catch {
      dirty.current = true;
      setSaveState("error");
    }
  }, [attemptId]);

  // Debounced autosave + periodic retry.
  useEffect(() => {
    const t = window.setTimeout(save, 1500);
    return () => window.clearTimeout(t);
  }, [answers, save]);
  useEffect(() => {
    const id = window.setInterval(save, 15_000);
    return () => window.clearInterval(id);
  }, [save]);

  useEffect(() => {
    try { window.localStorage.setItem(flagKey, JSON.stringify([...flags])); } catch { /* ignore */ }
  }, [flags, flagKey]);

  const submit = useMutation({
    mutationFn: () => api.post<Review>(submitPath(data.quiz.id), { attempt_id: attemptId, answers: answersRef.current }),
    onMutate: () => { submitting.current = true; setConfirm(false); setError(""); },
    onSuccess: (r) => {
      setReview(r);
      onFinished(!!r.lesson_completed);
      try { window.localStorage.removeItem(flagKey); } catch { /* ignore */ }
    },
    onError: (e) => {
      submitting.current = false;
      setError(isApiError(e) && e.message ? e.message : m.progressSaveError);
    },
  });
  const doSubmit = submit.mutate;

  // Countdown from the server-provided remaining time; auto-submit on expiry.
  useEffect(() => {
    if (deadline === null || review) return;
    const id = window.setInterval(() => {
      const s = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0 && !submitting.current) doSubmit();
    }, 1000);
    return () => window.clearInterval(id);
  }, [review, doSubmit, deadline]);

  // Warn before leaving mid-attempt.
  useEffect(() => {
    if (review) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [review]);

  // Keyboard: arrows move between questions when not typing.
  useEffect(() => {
    if (review) return;
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "ArrowRight") setIdx((i) => Math.min(pages.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [review, pages.length]);

  const setAnswer = (id: number, v: unknown) => {
    dirty.current = true;
    setSaveState("idle");
    setAnswers((a) => ({ ...a, [id]: v }));
  };

  if (review) return <ReviewView r={review} passScore={data.quiz.pass_score} onRetry={onRetry} onBack={onBack} />;
  if (!items.length) return <Alert tone="info">{q_.noQuestions}</Alert>;

  const unanswered = items.filter((x) => !isAnswered(answers[x.id])).length;
  const low = left !== null && left <= 60;
  const page = pages[Math.min(idx, pages.length - 1)];

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{data.quiz.title}</h1>
          <p className="text-xs text-muted" aria-live="polite">
            {saveState === "saving" ? q_.saving : saveState === "saved" ? q_.saved : saveState === "error" ? q_.saveFail : `${items.length - unanswered}/${items.length} ${q_.answered.toLowerCase()}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {left !== null && (
            <span role="timer" aria-label={q_.timeLeft} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-base font-bold tabular-nums", low ? "bg-danger-soft text-danger" : "bg-surface-muted")}>
              <ClockIcon size={16} />{fmtClock(left)}
            </span>
          )}
          <Button onClick={() => setConfirm(true)} loading={submit.isPending}>{q_.submit}</Button>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
        <section aria-label={q_.question(items.indexOf(page.items[0]) + 1, items.length)} className="rounded-xl border border-border bg-surface p-5">
          <div className={cn(page.passage && "gap-5 lg:grid lg:grid-cols-2")}>
            {page.passage && (
              <div className="mb-4 max-h-[60vh] overflow-y-auto rounded-lg bg-surface-muted p-4 whitespace-pre-line lg:sticky lg:top-24 lg:mb-0">
                <p className="mb-2 text-sm font-semibold text-muted">{q_.passage}</p>
                {page.passage.content}
              </div>
            )}
            <div className="space-y-8">
              {page.items.map((q) => {
                const n = items.indexOf(q) + 1;
                return (
                  <div key={q.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-muted">{q_.question(n, items.length)} · {q_.points(q.points)}</p>
                      <button
                        type="button"
                        aria-pressed={flags.has(q.id)}
                        onClick={() => setFlags((f) => { const nf = new Set(f); if (nf.has(q.id)) nf.delete(q.id); else nf.add(q.id); return nf; })}
                        className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm", flags.has(q.id) ? "bg-warning-soft font-semibold text-warning" : "text-muted hover:bg-surface-muted")}
                      >
                        <FlagIcon size={14} />{flags.has(q.id) ? q_.unflag : q_.flag}
                      </button>
                    </div>
                    {q.type !== "cloze" && <p className="mt-3 text-base font-medium whitespace-pre-line">{q.content}</p>}
                    <div className="mt-4"><QuestionInput key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} attemptId={attemptId} /></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-6 flex justify-between gap-2">
            <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeftIcon size={16} />{q_.prev}</Button>
            {idx < pages.length - 1 ? (
              <Button onClick={() => setIdx(idx + 1)}>{q_.next}<ChevronRightIcon size={16} /></Button>
            ) : (
              <Button onClick={() => setConfirm(true)}>{q_.submit}</Button>
            )}
          </div>
        </section>

        <nav aria-label={q_.palette} className="rounded-xl border border-border bg-surface p-3">
          <p className="mb-2 text-sm font-semibold">{q_.palette}</p>
          <ul className="grid grid-cols-6 gap-1.5 lg:grid-cols-4">
            {items.map((x, i) => {
              const a = isAnswered(answers[x.id]);
              const target = pages.findIndex((pg) => pg.items.includes(x));
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setIdx(target)}
                    aria-current={target === idx ? "step" : undefined}
                    aria-label={`${q_.question(i + 1, items.length)}: ${a ? q_.answered : q_.unanswered}${flags.has(x.id) ? `, ${q_.flagged}` : ""}`}
                    className={cn("relative flex h-9 w-full items-center justify-center rounded-md border text-sm font-medium", a ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border", target === idx && "ring-2 ring-ring")}
                  >
                    {i + 1}
                    {flags.has(x.id) && <span aria-hidden className="absolute -top-1 -right-1 size-2.5 rounded-full bg-warning" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => doSubmit()}
        title={q_.confirmTitle}
        description={q_.confirmText(unanswered, items.filter((x) => flags.has(x.id)).length)}
        confirmLabel={q_.submit}
        loading={submit.isPending}
      />
    </div>
  );
}

/** Runs a lesson quiz (course + lessonId) or an exam (exam id). */
export function QuizRunner({ course = "", lessonId = 0, exam, onBack }: { course?: string; lessonId?: number; exam?: number; onBack: () => void }) {
  const takePath = exam ? `/exams/${exam}/take` : `/courses/${course}/lessons/${lessonId}/quiz/take`;
  const submitPath = (quizId: number) => (exam ? `/exams/${exam}/submit` : `/courses/${course}/lessons/${lessonId}/quiz/${quizId}/submit`);
  const qc = useQueryClient();
  const [round, setRound] = useState(0);
  const take = useQuery({
    queryKey: ["learn", "quiz-take", exam ?? course, lessonId, round],
    queryFn: () => api.get<TakeResponse>(takePath),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const finished = useMemo(
    () => (completed: boolean) => {
      if (completed) {
        void qc.invalidateQueries({ queryKey: keys.progress(course) });
        void qc.invalidateQueries({ queryKey: ["site", "enrollments"] });
        void qc.invalidateQueries({ queryKey: ["site", "dashboard"] });
      }
    },
    [qc, course],
  );

  if (take.isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={q_.loading}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (take.isError) {
    return (
      <div className="space-y-4">
        <QueryError error={take.error} onRetry={() => take.refetch()} />
        <div className="flex justify-center"><Button variant="outline" onClick={onBack}><ArrowLeftIcon size={16} />{q_.backToLesson}</Button></div>
      </div>
    );
  }
  return <Runner key={take.data.attempt.id} submitPath={submitPath} data={take.data} onFinished={finished} onBack={onBack} onRetry={() => setRound((r) => r + 1)} />;
}
