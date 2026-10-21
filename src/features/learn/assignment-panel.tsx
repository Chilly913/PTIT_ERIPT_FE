"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileDropzone } from "@/components/file-dropzone";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { CheckCircleIcon, ClockIcon, ExternalLinkIcon } from "@/components/icons";
import { ClientHtml } from "@/components/site/client-html";
import { formatDateTime } from "@/features/site/format";
import type { AssignmentInfo, SubmissionInfo } from "@/features/site/types";
import { isHttpUrl } from "./embed";
import { learnMessages as m } from "./messages";

const storeKey = (lessonId: number) => `eript:submission:${lessonId}`;

/** Last submission is remembered per browser: the API has no "my submission" read endpoint yet. */
function writeStored(lessonId: number, s: SubmissionInfo) {
  try {
    window.localStorage.setItem(storeKey(lessonId), JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

const listeners = new Set<() => void>();
function useStoredSubmission(lessonId: number): SubmissionInfo | null {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      try {
        return window.localStorage.getItem(storeKey(lessonId));
      } catch {
        return null;
      }
    },
    () => null,
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SubmissionInfo;
  } catch {
    return null;
  }
}

function splitNote(note: string | null): { text: string; link: string } {
  const lines = (note ?? "").split("\n");
  const idx = lines.findIndex((l) => l.startsWith("Liên kết: "));
  if (idx < 0) return { text: note ?? "", link: "" };
  const link = lines[idx].slice("Liên kết: ".length);
  lines.splice(idx, 1);
  return { text: lines.join("\n").trim(), link };
}

export function AssignmentPanel({ course, lessonId, assignment }: { course: string; lessonId: number; assignment: AssignmentInfo }) {
  const toast = useToast();
  const stored = useStoredSubmission(lessonId);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);

  const exts = assignment.allowed_extensions.split(",").map((e) => e.trim().replace(/^\./, "")).filter(Boolean);
  // Pick up the submission made on another device / browser.
  const mine = useQuery({
    queryKey: ["learn", "submission", course, lessonId],
    queryFn: () => api.get<{ submission: SubmissionInfo | null }>(`/courses/${course}/lessons/${lessonId}/assignment/submission`),
    retry: false,
    staleTime: 30_000,
  });
  useEffect(() => {
    const s = mine.data?.submission;
    if (s) {
      writeStored(lessonId, s);
      listeners.forEach((l) => l());
    }
  }, [mine.data, lessonId]);

  const [now] = useState(() => Date.now());
  const opensAt = assignment.submission_open_at ? new Date(assignment.submission_open_at).getTime() : 0;
  const dueAt = assignment.due_at ? new Date(assignment.due_at).getTime() : 0;
  const notOpen = opensAt > now;
  const overdue = dueAt > 0 && dueAt < now;

  const submit = useMutation({
    mutationFn: () => {
      const note = [text.trim(), link.trim() ? `Liên kết: ${link.trim()}` : ""].filter(Boolean).join("\n");
      const fd = new FormData();
      fd.set("student_note", note);
      if (file) fd.set("file", file);
      return api.post<{ submission: SubmissionInfo }>(`/courses/${course}/lessons/${lessonId}/assignment/submit`, fd);
    },
    onSuccess: (r) => {
      const s: SubmissionInfo = { ...r.submission, student_note: r.submission.student_note ?? [text.trim(), link.trim() ? `Liên kết: ${link.trim()}` : ""].filter(Boolean).join("\n") };
      writeStored(lessonId, s);
      listeners.forEach((l) => l());
      setEditing(false);
      setText("");
      setLink("");
      setFile(null);
      toast.success(m.assignment.submitted);
    },
    onError: (e) => {
      if (isApiError(e) && (e.status >= 500 || e.status === 404 || e.status === 502)) setErr(m.assignment.notReady);
      else setErr(isApiError(e) ? e.message : m.assignment.notReady);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!text.trim() && !link.trim() && !file) return setErr(m.assignment.needContent);
    if (link.trim() && !isHttpUrl(link.trim())) return setErr(m.assignment.badLink);
    submit.mutate();
  };

  const showForm = !stored || editing;
  const parts = splitNote(stored?.student_note ?? null);

  return (
    <section aria-labelledby="assign-h" className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="assign-h" className="text-lg font-bold">{m.assignment.title}</h2>
        <div className="flex flex-wrap gap-2">
          {stored && <Badge tone="success"><CheckCircleIcon size={12} />{m.assignment.submitted}</Badge>}
          {overdue && !stored && <Badge tone="danger">Quá hạn</Badge>}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-muted">{m.assignment.instructions}</p>
        <ClientHtml html={assignment.instructions} />
      </div>

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {assignment.due_at && (
          <div className="flex items-center gap-2"><ClockIcon size={14} className="text-muted" /><dt className="text-muted">{m.assignment.due}:</dt><dd className="font-medium">{formatDateTime(assignment.due_at)}</dd></div>
        )}
        {assignment.submission_open_at && (
          <div className="flex items-center gap-2"><dt className="text-muted">{m.assignment.opens}:</dt><dd className="font-medium">{formatDateTime(assignment.submission_open_at)}</dd></div>
        )}
      </dl>

      {stored && !editing && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-4">
          <p className="font-semibold">{m.assignment.yourSubmission}</p>
          {stored.submitted_at && <p className="text-sm text-muted">{m.assignment.submittedAt} {formatDateTime(stored.submitted_at)}</p>}
          {stored.file_url && <p className="text-sm"><a href={stored.file_url} download className="font-medium text-primary underline underline-offset-2">{m.assignment.attached}</a></p>}
          {parts.text && <p className="whitespace-pre-line break-words">{parts.text}</p>}
          {parts.link && isHttpUrl(parts.link) && (
            <a href={parts.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{parts.link}<ExternalLinkIcon size={12} /></a>
          )}
          <div className="border-t border-border pt-2 text-sm">
            {stored.grade !== null ? (
              <p><span className="text-muted">{m.assignment.grade}: </span><span className="font-bold">{stored.grade}</span></p>
            ) : (
              <p className="text-muted">{m.assignment.notGraded}</p>
            )}
            {stored.feedback && <p className="mt-1"><span className="text-muted">{m.assignment.feedback}: </span>{stored.feedback}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => { setErr(""); setEditing(true); }}>{m.assignment.resubmit}</Button>
        </div>
      )}

      {showForm && (
        notOpen ? (
          <Alert tone="warning">{m.assignment.closed}</Alert>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            {editing && <p className="text-sm text-muted">{m.assignment.resubmitHint}</p>}
            <Field label={m.assignment.text}>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={5000} placeholder={m.assignment.textPlaceholder} />
            </Field>
            <Field label={m.assignment.link}>
              <Input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={m.assignment.linkPlaceholder} />
            </Field>
            <Field label={m.assignment.file} hint={m.assignment.fileHint(exts.join(", "), Math.round(assignment.max_file_size / 1024))}>
              <FileDropzone accept={exts.map((e) => `.${e}`).join(",")} maxBytes={assignment.max_file_size * 1024} label={m.assignment.file} onReject={setErr} onFile={(f) => { setErr(""); setFile(f); }}>
                {({ dragging }) => (
                  <span className="flex min-h-20 flex-col items-center justify-center gap-1 px-4 py-3 text-center">
                    <span className="text-sm font-medium">{dragging ? m.assignment.dropNow : file ? `${m.assignment.picked}: ${file.name}` : m.assignment.dropHere}</span>
                    <span className="text-xs text-muted">{m.assignment.orClick}</span>
                  </span>
                )}
              </FileDropzone>
            </Field>
            {err && <Alert tone="danger">{err}</Alert>}
            <div className="flex gap-2">
              <Button type="submit" loading={submit.isPending}>{stored ? m.assignment.resubmit : m.assignment.submit}</Button>
              {editing && <Button variant="ghost" onClick={() => setEditing(false)}>Hủy</Button>}
            </div>
          </form>
        )
      )}
    </section>
  );
}
