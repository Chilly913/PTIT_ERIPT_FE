"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaperclipIcon, TrashIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { Drawer } from "@/features/studio/drawer";
import { RichTextEditor } from "@/features/studio/rich-text-editor";
import { courseMessages as m } from "../messages";
import { LessonTypeIcon } from "../parts";
import { FileDropzone } from "@/components/file-dropzone";
import { QuizForm } from "./quiz-form";
import type { Assignment, Attachment, Lesson, VirtualClass } from "../types";
import { fromLocalInput, isHttpUrl, parseVideoUrl, toLocalInput } from "../utils";
import type { useCurriculumOps } from "./curriculum-ops";

type Ops = ReturnType<typeof useCurriculumOps>;
const t = m.lesson;

const TYPE_OPTIONS = ["video", "page", "document", "assignment", "scorm", "virtual_class", "quiz"] as const;
const URL_TYPES = new Set(["video", "audio", "live"]);
const RICH_TYPES = new Set(["page", "document"]);

function errText(e: unknown) {
  return isApiError(e) ? e.message : m.common.loadError;
}

function VideoPreview({ url }: { url: string }) {
  const v = parseVideoUrl(url);
  if (!v) return <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border-control bg-surface-subtle text-sm text-muted">{t.video.empty}</div>;
  return (
    <div className="aspect-video overflow-hidden rounded-lg border border-border bg-surface-muted">
      {v.kind === "file" ? (
        <video src={v.src} controls preload="metadata" className="size-full bg-surface-muted" />
      ) : (
        <iframe src={v.src} title={t.video.previewTitle} className="size-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
      )}
    </div>
  );
}

function VirtualClassForm({ courseId, lesson, ops }: { courseId: number; lesson: Lesson; ops: Ops }) {
  const vc: VirtualClass | null | undefined = lesson.virtual_class;
  const toast = useToast();
  const [f, setF] = useState({
    provider: vc?.provider ?? "zoom",
    join_url: vc?.join_url ?? "",
    start_url: vc?.start_url ?? "",
    meeting_id: vc?.meeting_id ?? "",
    meeting_password: vc?.meeting_password ?? "",
    start_at: toLocalInput(vc?.start_at),
    duration: String(vc?.duration ?? 60),
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErr((e) => ({ ...e, [k]: "" }));
  };
  const save = useMutation({
    mutationFn: () =>
      api.post<{ virtual_class: VirtualClass }>(`/courses/${courseId}/lessons/${lesson.id}/virtual-class`, {
        provider: f.provider,
        join_url: f.join_url.trim(),
        start_url: f.start_url.trim() || null,
        meeting_id: f.meeting_id.trim() || null,
        meeting_password: f.meeting_password.trim() || null,
        start_at: fromLocalInput(f.start_at),
        duration: Number(f.duration),
      }),
    onSuccess: (r) => {
      ops.patchLesson(lesson.id, { virtual_class: r.virtual_class, type: lesson.type === "video" || lesson.type === "page" ? "virtual_class" : lesson.type });
      toast.success(t.savedContent);
    },
    onError: (e) => {
      if (isApiError(e) && e.errors) setErr(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
      toast.error(errText(e));
    },
  });
  function submit() {
    const e: Record<string, string> = {};
    if (!isHttpUrl(f.join_url.trim())) e.join_url = t.virtual.joinRequired;
    if (f.start_url.trim() && !isHttpUrl(f.start_url.trim())) e.start_url = t.virtual.joinRequired;
    if (!f.start_at) e.start_at = t.virtual.startRequired;
    if (!(Number(f.duration) >= 1)) e.duration = t.virtual.durationInvalid;
    setErr(e);
    if (!Object.keys(e).length) save.mutate();
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.virtual.provider}>
          <Select value={f.provider} onChange={(e) => set("provider", e.target.value)}>
            {Object.entries(t.virtual.providers).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label={t.virtual.duration} error={err.duration}>
          <Input value={f.duration} inputMode="numeric" onChange={(e) => set("duration", e.target.value.replace(/\D/g, ""))} />
        </Field>
      </div>
      <Field label={t.virtual.joinUrl} required error={err.join_url}>
        <Input value={f.join_url} onChange={(e) => set("join_url", e.target.value)} placeholder="https://zoom.us/j/..." inputMode="url" />
      </Field>
      <Field label={t.virtual.startAt} required error={err.start_at}>
        <DateTimePicker value={f.start_at} onChange={(v) => set("start_at", v)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.virtual.meetingId}><Input value={f.meeting_id} onChange={(e) => set("meeting_id", e.target.value)} /></Field>
        <Field label={t.virtual.passcode}><Input value={f.meeting_password} onChange={(e) => set("meeting_password", e.target.value)} autoComplete="off" /></Field>
      </div>
      <Field label={t.virtual.startUrl} error={err.start_url}>
        <Input value={f.start_url} onChange={(e) => set("start_url", e.target.value)} inputMode="url" />
      </Field>
      <Button onClick={submit} loading={save.isPending}>{t.virtual.save}</Button>
    </div>
  );
}

function ScormForm({ courseId, lesson, ops }: { courseId: number; lesson: Lesson; ops: Ops }) {
  const toast = useToast();
  const [err, setErr] = useState<string | null>(null);
  const pkg = lesson.scorm_package;
  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post<{ lesson: Lesson }>(`/courses/${courseId}/lessons/${lesson.id}/scorm`, fd);
    },
    onSuccess: (r) => {
      ops.patchLesson(lesson.id, { scorm_package: r.lesson.scorm_package, type: "scorm" });
      setErr(null);
      toast.success(t.scorm.uploaded);
    },
    onError: (e) => setErr(isApiError(e) ? (e.errors?.file?.[0] ?? e.message) : m.common.loadError),
  });
  return (
    <div className="space-y-3">
      {pkg ? (
        <Alert tone="success" title={pkg.title ?? "SCORM"}>{t.scorm.current(pkg.version === "2004" ? "SCORM 2004" : "SCORM 1.2")}</Alert>
      ) : (
        <Alert tone="warning">{t.scorm.none}</Alert>
      )}
      {err && <Alert tone="danger">{err}</Alert>}
      <FileDropzone accept=".zip" maxBytes={300 * 1024 * 1024} label={t.scorm.pick} disabled={upload.isPending} onReject={setErr} onFile={(f) => { setErr(null); upload.mutate(f); }}>
        {({ dragging }) => (
          <span className="flex min-h-24 flex-col items-center justify-center gap-1 px-4 py-4 text-center">
            <span className="text-sm font-medium">{upload.isPending ? t.scorm.uploading : dragging ? t.scorm.drop : pkg ? t.scorm.replace : t.scorm.dropHere}</span>
            <span className="text-xs text-muted">{t.scorm.hint}</span>
          </span>
        )}
      </FileDropzone>
    </div>
  );
}

function AssignmentForm({ courseId, lesson, ops }: { courseId: number; lesson: Lesson; ops: Ops }) {
  const a: Assignment | null | undefined = lesson.assignment;
  const toast = useToast();
  const [f, setF] = useState({
    instructions: a?.instructions ?? "",
    max_mb: String(a ? Math.max(1, Math.round((a.max_file_size / 1024) * 10) / 10) : 10),
    allowed_extensions: a?.allowed_extensions ?? "pdf,doc,docx,zip",
    available_from: toLocalInput(a?.available_from),
    submission_open_at: toLocalInput(a?.submission_open_at),
    due_at: toLocalInput(a?.due_at),
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErr((e) => ({ ...e, [k]: "" }));
  };
  const save = useMutation({
    mutationFn: () =>
      api.post<{ assignment: Assignment }>(`/courses/${courseId}/lessons/${lesson.id}/assignment`, {
        instructions: f.instructions.trim(),
        max_file_size: Math.round(Number(f.max_mb) * 1024),
        allowed_extensions: f.allowed_extensions.trim() || null,
        available_from: fromLocalInput(f.available_from),
        submission_open_at: fromLocalInput(f.submission_open_at),
        due_at: fromLocalInput(f.due_at),
      }),
    onSuccess: (r) => {
      ops.patchLesson(lesson.id, { assignment: r.assignment, type: "assignment" });
      toast.success(t.savedContent);
    },
    onError: (e) => {
      if (isApiError(e) && e.errors) setErr(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
      toast.error(errText(e));
    },
  });
  function submit() {
    const e: Record<string, string> = {};
    if (!f.instructions.trim()) e.instructions = t.assignment.instructionsRequired;
    if (!(Number(f.max_mb) > 0)) e.max_file_size = t.assignment.sizeInvalid;
    setErr(e);
    if (!Object.keys(e).length) save.mutate();
  }
  return (
    <div className="space-y-3">
      <Field label={t.assignment.instructions} required error={err.instructions}>
        <Textarea value={f.instructions} onChange={(e) => set("instructions", e.target.value)} rows={5} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.assignment.maxSize} error={err.max_file_size}>
          <Input value={f.max_mb} inputMode="decimal" onChange={(e) => set("max_mb", e.target.value.replace(/[^\d.]/g, ""))} />
        </Field>
        <Field label={t.assignment.extensions} hint={t.assignment.extensionsHint} error={err.allowed_extensions}>
          <Input value={f.allowed_extensions} onChange={(e) => set("allowed_extensions", e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.assignment.availableFrom} error={err.available_from}><DateTimePicker value={f.available_from} onChange={(v) => set("available_from", v)} /></Field>
        <Field label={t.assignment.openAt} error={err.submission_open_at}><DateTimePicker value={f.submission_open_at} onChange={(v) => set("submission_open_at", v)} /></Field>
      </div>
      <Field label={t.assignment.dueAt} hint={t.assignment.scale} error={err.due_at}>
        <DateTimePicker value={f.due_at} onChange={(v) => set("due_at", v)} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={submit} loading={save.isPending}>{t.assignment.save}</Button>
        {lesson.assignment && (
          <Link href={`/studio/courses/${courseId}/assignments`} className={buttonStyles({ variant: "outline" })}>{t.assignment.gradeLink}</Link>
        )}
      </div>
    </div>
  );
}

function Attachments({ courseId, lesson, ops }: { courseId: number; lesson: Lesson; ops: Ops }) {
  const toast = useToast();
  const list: Attachment[] = lesson.attachments ?? [];
  const del = useMutation({
    mutationFn: (a: Attachment) => api.delete(`/courses/${courseId}/lessons/${lesson.id}/attachments/${a.id}`),
    onMutate: (a) => {
      const prev = lesson.attachments ?? [];
      ops.patchLesson(lesson.id, { attachments: prev.filter((x) => x.id !== a.id) });
      return { prev };
    },
    onError: (e, _a, ctx) => {
      ops.patchLesson(lesson.id, { attachments: ctx?.prev ?? [] });
      toast.error(errText(e));
    },
    onSuccess: () => toast.success(t.document.removed),
  });
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t.document.attachments}</p>
      {list.length === 0 ? (
        <p className="text-sm text-muted">{t.document.none}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2">
              <PaperclipIcon className="size-4 text-muted" />
              <span className="min-w-0 flex-1 truncate">{a.original_name}</span>
              <span className="shrink-0 text-sm text-muted">{a.file_size}</span>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => del.mutate(a)} aria-label={t.document.remove}><TrashIcon className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted">{t.document.attachmentsNote}</p>
    </div>
  );
}

function LessonForm({ courseId, lesson, ops, onDirty, onType, formId }: { courseId: number; lesson: Lesson; ops: Ops; onDirty: (d: boolean) => void; onType: (t: string) => void; formId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({
    title: lesson.title,
    type: lesson.type as string,
    minutes: lesson.duration ? String(Math.round(lesson.duration / 60)) : "",
    preview: lesson.is_preview,
    video_url: lesson.video_url ?? "",
    description: lesson.description ?? "",
  });
  const [titleErr, setTitleErr] = useState<string | null>(null);
  const [urlErr, setUrlErr] = useState<string | null>(null);
  const initial = useMemo(() => JSON.stringify(f), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [savedSnap, setSavedSnap] = useState(initial);
  const dirty = JSON.stringify(f) !== savedSnap;
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => onType(f.type), [f.type, onType]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const typeOptions = TYPE_OPTIONS.includes(f.type as (typeof TYPE_OPTIONS)[number]) ? [...TYPE_OPTIONS] : [f.type, ...TYPE_OPTIONS];
  const isUrl = URL_TYPES.has(f.type);
  const isRich = RICH_TYPES.has(f.type);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        title: f.title.trim(),
        type: f.type,
        is_preview: f.preview,
        duration: Math.max(0, Math.round(Number(f.minutes) || 0)) * 60,
      };
      if (isUrl) body.video_url = f.video_url.trim() || null;
      if (isRich) body.description = f.description || null;
      return api.put<{ lesson: Lesson }>(`/courses/${courseId}/lessons/${lesson.id}`, body);
    },
    onMutate: () => {
      const prev = { title: lesson.title, type: lesson.type, is_preview: lesson.is_preview, duration: lesson.duration, video_url: lesson.video_url, description: lesson.description };
      ops.patchLesson(lesson.id, {
        title: f.title.trim(),
        type: f.type,
        is_preview: f.preview,
        duration: Math.max(0, Math.round(Number(f.minutes) || 0)) * 60,
        ...(isUrl ? { video_url: f.video_url.trim() || null } : {}),
        ...(isRich ? { description: f.description || null } : {}),
      });
      return { prev };
    },
    onSuccess: (r) => {
      ops.patchLesson(lesson.id, r.lesson);
      setSavedSnap(JSON.stringify(f));
      toast.success(t.saved);
      void qc.invalidateQueries({ queryKey: ["studio", "course", String(courseId)] });
    },
    onError: (e, _v, ctx) => {
      if (ctx) ops.patchLesson(lesson.id, ctx.prev as Partial<Lesson>);
      toast.error(errText(e));
    },
  });

  function submit() {
    setTitleErr(null);
    setUrlErr(null);
    if (!f.title.trim()) return setTitleErr(m.info.titleRequired);
    if (isUrl && f.video_url.trim() && !isHttpUrl(f.video_url.trim())) return setUrlErr(t.video.invalid);
    save.mutate();
  }

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6"
    >
      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{t.general}</h3>
        <Field label={t.title} required error={titleErr}>
          <Input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={255} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.type} hint={t.typeHelp}>
            <Select value={f.type} onChange={(e) => set("type", e.target.value)}>
              {typeOptions.map((o) => <option key={o} value={o}>{m.lessonType[o] ?? o}</option>)}
            </Select>
          </Field>
          <Field label={t.duration}>
            <Input value={f.minutes} inputMode="numeric" onChange={(e) => set("minutes", e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </Field>
        </div>
        <Switch checked={f.preview} onCheckedChange={(v) => set("preview", v)} label={t.preview} />
        <p className="-mt-1 text-sm text-muted">{t.previewHint}</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{t.content}</h3>
        {isUrl && (
          <>
            <Field label={t.video.url} hint={urlErr ? undefined : t.video.hint} error={urlErr}>
              <Input value={f.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." inputMode="url" />
            </Field>
            <VideoPreview url={f.video_url} />
            <p className="text-sm text-muted">{m.common.uploadHint}</p>
          </>
        )}
        {isRich && (
          <div>
            <p className="mb-1 text-sm font-medium">{f.type === "document" ? t.document.label : t.page.label}</p>
            <p className="mb-2 text-sm text-muted">{f.type === "document" ? t.document.hint : t.page.hint}</p>
            <RichTextEditor key={lesson.id} value={f.description} onChange={(h) => set("description", h)} minHeight={200} label={t.page.label} />
          </div>
        )}
        {f.type === "scorm" && <Alert tone="info">{t.scorm.note}</Alert>}
        {f.type === "offline" && <Alert tone="info">{t.offline.note}</Alert>}
      </section>
    </form>
  );
}

export function LessonDrawer({
  courseId,
  courseTitle,
  lesson,
  onClose,
  ops,
}: {
  courseId: number;
  courseTitle: string;
  lesson: Lesson | null;
  onClose: () => void;
  ops: Ops;
  onOpenAssignments?: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [formType, setFormType] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const formId = "lesson-form";

  function request() {
    if (dirty) setConfirm(true);
    else onClose();
  }

  return (
    <>
      <Drawer
        open={!!lesson}
        onRequestClose={request}
        title={lesson ? <span className="flex items-center gap-2"><LessonTypeIcon type={lesson.type} className="text-muted" />{lesson.title}</span> : t.editTitle}
        description={courseTitle}
        footer={
          lesson ? (
            <>
              <Button variant="outline" onClick={request}>{m.common.cancel}</Button>
              <Button type="submit" form={formId} disabled={!dirty}>{m.common.save}</Button>
            </>
          ) : null
        }
      >
        {lesson && (
          <div className="space-y-6">
            <LessonForm key={lesson.id} courseId={courseId} lesson={lesson} ops={ops} onDirty={setDirty} onType={setFormType} formId={formId} />
            {["virtual_class", "zoom", "meet", "live"].includes(formType ?? lesson.type) && (
              <section className="space-y-3 border-t border-border pt-5">
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{m.lessonType.virtual_class}</h3>
                <VirtualClassForm key={`vc-${lesson.id}`} courseId={courseId} lesson={lesson} ops={ops} />
              </section>
            )}
            {(formType ?? lesson.type) === "quiz" && (
              <section className="space-y-3 border-t border-border pt-5">
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{m.lessonType.quiz}</h3>
                <QuizForm key={`qz-${lesson.id}`} courseId={courseId} lesson={lesson} />
              </section>
            )}
            {(formType ?? lesson.type) === "scorm" && (
              <section className="space-y-3 border-t border-border pt-5">
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{m.lessonType.scorm}</h3>
                <ScormForm key={`sc-${lesson.id}`} courseId={courseId} lesson={lesson} ops={ops} />
              </section>
            )}
            {(formType ?? lesson.type) === "assignment" && (
              <section className="space-y-3 border-t border-border pt-5">
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{m.lessonType.assignment}</h3>
                <AssignmentForm key={`as-${lesson.id}`} courseId={courseId} lesson={lesson} ops={ops} />
              </section>
            )}
            {((formType ?? lesson.type) === "document" || (lesson.attachments?.length ?? 0) > 0) && (
              <section className="border-t border-border pt-5">
                <Attachments courseId={courseId} lesson={lesson} ops={ops} />
              </section>
            )}
          </div>
        )}
      </Drawer>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={m.common.unsavedTitle}
        description={m.common.unsavedText}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>{m.common.unsavedStay}</Button>
            <Button variant="danger" onClick={() => { setConfirm(false); setDirty(false); onClose(); }}>{m.common.unsavedLeave}</Button>
          </>
        }
      />
    </>
  );
}
