"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { CalendarIcon, ClockIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, MapPinIcon, VideoIcon } from "@/components/icons";
import { HelpCircleIcon } from "@/components/icons/icons-learn";
import { api } from "@/lib/api";
import { formatDateTime } from "@/features/site/format";
import type { OfflineSession, QuizInfo, VirtualClass } from "@/features/site/types";
import { isHttpUrl, isPdf } from "./embed";
import { learnMessages as m } from "./messages";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
      <span><span className="text-muted">{label}: </span><span className="font-medium select-all">{value}</span></span>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-primary hover:underline"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
        }}
      >
        <CopyIcon size={12} />{copied ? m.virtual.copied : m.virtual.copy}
      </button>
    </div>
  );
}

export function VirtualClassCard({ vc }: { vc: VirtualClass | null }) {
  const [now] = useState(() => Date.now());
  if (!vc) return <Alert tone="info">{m.virtual.none}</Alert>;
  const start = vc.start_at ? new Date(vc.start_at).getTime() : 0;
  const end = start ? start + vc.duration * 60_000 : 0;
  const state = !start ? null : now < start ? m.virtual.upcoming : now <= end ? m.virtual.live : m.virtual.ended;
  const live = state === m.virtual.live;
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5" aria-labelledby="vc-h">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-lg bg-info-soft text-info"><VideoIcon size={20} /></span>
        <h2 id="vc-h" className="text-lg font-bold">{m.virtual.title}</h2>
        {state && <Badge tone={live ? "success" : state === m.virtual.ended ? "neutral" : "info"}>{state}</Badge>}
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2"><dt className="text-muted">{m.virtual.provider}:</dt><dd className="font-medium capitalize">{vc.provider.replace("_", " ")}</dd></div>
        {vc.start_at && <div className="flex items-center gap-2"><CalendarIcon size={14} className="text-muted" /><dt className="sr-only">{m.virtual.start}</dt><dd className="font-medium">{formatDateTime(vc.start_at)}</dd></div>}
        {vc.duration > 0 && <div className="flex items-center gap-2"><ClockIcon size={14} className="text-muted" /><dd>{m.virtual.duration(vc.duration)}</dd></div>}
      </dl>
      {vc.meeting_id && <CopyField label={m.virtual.meetingId} value={vc.meeting_id} />}
      {vc.meeting_password && <CopyField label={m.virtual.password} value={vc.meeting_password} />}
      {vc.join_url && isHttpUrl(vc.join_url) && (
        <a href={vc.join_url} target="_blank" rel="noopener noreferrer" className={buttonStyles({ size: "lg" })}>
          <ExternalLinkIcon size={16} />{m.virtual.join}
        </a>
      )}
    </section>
  );
}

export function OfflineCard({ s }: { s: OfflineSession }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold"><MapPinIcon size={18} />{s.title ?? m.offline.title}</h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">{m.offline.location}</dt><dd className="font-medium">{s.location}</dd></div>
        {s.room && <div><dt className="text-muted">{m.offline.room}</dt><dd className="font-medium">{s.room}</dd></div>}
        {s.start_at && <div><dt className="text-muted">{m.offline.time}</dt><dd className="font-medium">{formatDateTime(s.start_at)}{s.duration ? ` · ${s.duration} phút` : ""}</dd></div>}
      </dl>
    </section>
  );
}

export function DocumentCard({ url }: { url: string | null }) {
  if (!url || !(isHttpUrl(url) || url.startsWith("/"))) {
    return <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border bg-surface-subtle text-muted">{m.document.none}</div>;
  }
  return (
    <div className="space-y-3">
      {isPdf(url) && <iframe src={url} title="Tài liệu" className="h-[70dvh] min-h-96 w-full rounded-xl border border-border" />}
      <div className="flex flex-wrap gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: isPdf(url) ? "outline" : "primary" })}><ExternalLinkIcon size={16} />{m.document.open}</a>
        <a href={url} download className={buttonStyles({ variant: "outline" })}><DownloadIcon size={16} />{m.document.download}</a>
      </div>
    </div>
  );
}

interface AttemptRow {
  id: number;
  status: string;
  score: number;
  passed: boolean;
  grading_status: "none" | "pending" | "graded";
  submitted_at: string | null;
}

/** The learner's earlier attempts at a quiz, each linking to its result (with the grades added later). */
function AttemptHistory({ lessonId }: { lessonId: number }) {
  const q = useQuery({
    queryKey: ["learn", "attempts", "lesson", lessonId],
    queryFn: () => api.get<{ data: AttemptRow[] }>("/my/attempts", { query: { lesson_id: lessonId } }),
    staleTime: 0,
    retry: false,
  });
  const rows = q.data?.data ?? [];
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{m.quiz.history}</h3>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((r, i) => (
          <li key={r.id}>
            <Link href={`/attempts/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-surface-subtle">
              <span className="font-medium">{m.quiz.attemptN(rows.length - i)}</span>
              <span className="text-sm text-muted">{r.submitted_at ? formatDateTime(r.submitted_at) : ""}</span>
              <span className="ml-auto text-sm tabular-nums">{r.score}/100</span>
              {r.grading_status === "pending" ? <Badge tone="warning">{m.quiz.pendingGrade}</Badge> : r.passed ? <Badge tone="success">{m.quiz.passedBadge}</Badge> : <Badge tone="danger">{m.quiz.failedBadge}</Badge>}
              <span className="text-sm font-medium text-primary">{m.quiz.viewResult}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function QuizCard({ quiz, lessonId, onStart }: { quiz: QuizInfo | null; lessonId: number; onStart: () => void }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-warning-soft text-warning"><HelpCircleIcon size={22} /></span>
        <div>
          <h2 className="text-lg font-bold">{quiz?.title ?? m.quiz.title}</h2>
          {quiz && (
            <p className="text-sm text-muted">
              {m.quiz.passScore(quiz.pass_score)} · {quiz.time_limit ? m.quiz.timeLimit(quiz.time_limit) : m.quiz.noLimit}
            </p>
          )}
        </div>
      </div>
      {quiz?.description && <p className="whitespace-pre-line text-muted">{quiz.description}</p>}
      <Button size="lg" onClick={onStart}>{m.quiz.start}</Button>
      <AttemptHistory lessonId={lessonId} />
    </section>
  );
}
