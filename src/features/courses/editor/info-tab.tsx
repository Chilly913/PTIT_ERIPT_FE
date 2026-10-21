"use client";

import { Combobox } from "@/components/ui/combobox";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { useUnsavedGuard } from "@/features/settings/use-unsaved-guard";
import { EditableList, fromItems, toItems, type ListItem } from "@/features/studio/editable-list";
import { RichTextEditor } from "@/features/studio/rich-text-editor";
import { qk, useCategories } from "../api";
import { courseMessages as m } from "../messages";
import { SectionCard, Thumb } from "../parts";
import type { Course, CourseLevel } from "../types";
import { fromLocalInput, isHttpUrl, parseVideoUrl, slugify, toLocalInput } from "../utils";
import { UploadField } from "@/components/upload-field";

const t = m.info;

interface InfoForm {
  title: string;
  description: string;
  category_id: string;
  level: string;
  price: string;
  thumbnail: string;
  trailer_url: string;
  learning_mode: string;
  issue_certificate: boolean;
  opens_at: string;
  closes_at: string;
  outcomes: ListItem[];
  requirements: ListItem[];
  benefits: ListItem[];
}

function fromCourse(c: Course | null): InfoForm {
  return {
    title: c?.title ?? "",
    description: c?.description ?? "",
    category_id: c?.category_id ? String(c.category_id) : "",
    level: c?.level ?? "",
    price: c ? String(c.price ?? 0) : "0",
    thumbnail: c?.thumbnail ?? "",
    trailer_url: c?.trailer_url ?? "",
    learning_mode: c?.learning_mode ?? "free",
    issue_certificate: !!c?.certificate_template_id,
    opens_at: toLocalInput(c?.opens_at),
    closes_at: toLocalInput(c?.closes_at),
    outcomes: toItems(c?.learning_outcomes),
    requirements: toItems(c?.requirements),
    benefits: toItems(c?.benefits),
  };
}

/** Comparable representation (list ids and blank rows ignored). */
function snapshot(f: InfoForm) {
  return JSON.stringify({ ...f, outcomes: fromItems(f.outcomes), requirements: fromItems(f.requirements), benefits: fromItems(f.benefits) });
}

function buildBody(f: InfoForm) {
  return {
    title: f.title.trim(),
    description: f.description || null,
    category_id: f.category_id ? Number(f.category_id) : null,
    level: (f.level || null) as CourseLevel | null,
    price: Math.max(0, Math.round(Number(f.price) || 0)),
    thumbnail: f.thumbnail.trim() || null,
    trailer_url: f.trailer_url.trim() || null,
    learning_mode: f.learning_mode,
    issue_certificate: f.issue_certificate,
    opens_at: fromLocalInput(f.opens_at),
    closes_at: fromLocalInput(f.closes_at),
    learning_outcomes: fromItems(f.outcomes),
    requirements: fromItems(f.requirements),
    benefits: fromItems(f.benefits),
  };
}

/** A course image is an http(s) URL or a file uploaded through the API (/uploads/...). */
const isImageRef = (v: string) => isHttpUrl(v) || /^\/uploads\/[\w./-]+$/.test(v);

type Errors = Partial<Record<"title" | "price" | "thumbnail" | "trailer_url" | "category_id" | "level" | "description" | "opens_at" | "closes_at" | "learning_mode", string>>;

function draftKey(id: number | null) {
  return `studio:draft:course:${id ?? "new"}`;
}
function readDraft(id: number | null): { form: Omit<InfoForm, "outcomes" | "requirements" | "benefits"> & { outcomes: string[]; requirements: string[]; benefits: string[] } } | null {
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(id: number | null, f: InfoForm | null) {
  try {
    if (!f) window.localStorage.removeItem(draftKey(id));
    else window.localStorage.setItem(draftKey(id), JSON.stringify({ form: { ...f, outcomes: f.outcomes.map((i) => i.text), requirements: f.requirements.map((i) => i.text), benefits: f.benefits.map((i) => i.text) } }));
  } catch {
    /* storage unavailable: drafts are a convenience only */
  }
}

export function InfoTab({ course, onDirtyChange }: { course: Course | null; onDirtyChange?: (dirty: boolean) => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const categories = useCategories();

  const baseline = useRef<string>("");
  const [form, setForm] = useState<InfoForm>(() => fromCourse(course));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [draft, setDraft] = useState<ReturnType<typeof readDraft>>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const courseId = course?.id ?? null;

  // First render: baseline = server state; look for a leftover local draft.
  useEffect(() => {
    baseline.current = snapshot(fromCourse(course));
    const d = readDraft(courseId);
    if (d) {
      const cand: InfoForm = { ...d.form, outcomes: toItems(d.form.outcomes), requirements: toItems(d.form.requirements), benefits: toItems(d.form.benefits) };
      if (snapshot(cand) !== baseline.current) setDraft(d);
      else writeDraft(courseId, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [serverSnap, setServerSnap] = useState(() => snapshot(fromCourse(course)));
  const dirty = useMemo(() => snapshot(form) !== serverSnap, [form, serverSnap]);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  const guard = useUnsavedGuard(dirty);

  // Debounced local draft (never touches the server, so a published course is never changed silently).
  useEffect(() => {
    if (!dirty) return;
    const id = window.setTimeout(() => {
      writeDraft(courseId, form);
      setDraftSaved(true);
    }, 800);
    return () => window.clearTimeout(id);
  }, [form, dirty, courseId]);

  const set = useCallback(<K extends keyof InfoForm>(k: K, v: InfoForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setDraftSaved(false);
  }, []);

  function validate(): boolean {
    const e: Errors = {};
    if (!form.title.trim()) e.title = t.titleRequired;
    if (form.price.trim() === "" || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) e.price = t.priceInvalid;
    if (form.thumbnail.trim() && !isImageRef(form.thumbnail.trim())) e.thumbnail = t.thumbnailInvalid;
    if (form.trailer_url.trim() && !isHttpUrl(form.trailer_url.trim())) e.trailer_url = m.lesson.video.invalid;
    if (form.opens_at && form.closes_at && new Date(form.closes_at) <= new Date(form.opens_at)) e.closes_at = t.scheduleInvalid;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const save = useMutation({
    mutationFn: async () => {
      const body = buildBody(form);
      if (courseId == null) {
        const created = await api.post<{ course: Course }>("/courses", { title: body.title, price: body.price, description: body.description, category_id: body.category_id, thumbnail: body.thumbnail });
        const extra = { level: body.level, trailer_url: body.trailer_url, learning_mode: body.learning_mode, issue_certificate: body.issue_certificate, opens_at: body.opens_at, closes_at: body.closes_at, learning_outcomes: body.learning_outcomes, requirements: body.requirements, benefits: body.benefits };
        try {
          const upd = await api.put<{ course: Course }>(`/courses/${created.course.id}`, extra);
          return { course: upd.course, created: true };
        } catch (e) {
          // The course exists already: continue to the editor so nothing is lost; the user can resave.
          if (isApiError(e)) toast.error(e.message);
          return { course: created.course, created: true };
        }
      }
      const upd = await api.put<{ course: Course }>(`/courses/${courseId}`, body);
      return { course: upd.course, created: false };
    },
    onSuccess: ({ course: saved, created }) => {
      writeDraft(courseId, null);
      setDraft(null);
      setDraftSaved(false);
      const next = fromCourse(saved);
      setForm((f) => ({ ...f, thumbnail: next.thumbnail, price: next.price }));
      setServerSnap(snapshot({ ...form, thumbnail: next.thumbnail, price: next.price }));
      qc.setQueryData(qk.course(saved.id), (old: Course | undefined) => ({ ...(old ?? {}), ...saved }) as Course);
      void qc.invalidateQueries({ queryKey: qk.myCoursesAll });
      toast.success(created ? m.editor.created : m.editor.updated);
      if (created) router.replace(`/studio/courses/${saved.id}?tab=curriculum`);
    },
    onError: (e) => {
      if (isApiError(e) && e.errors) {
        const fe: Errors = {};
        for (const [k, v] of Object.entries(e.errors)) {
          if (k === "title" || k === "price" || k === "thumbnail" || k === "trailer_url" || k === "category_id" || k === "level" || k === "description" || k === "opens_at" || k === "closes_at" || k === "learning_mode") fe[k] = v[0];
        }
        setErrors(fe);
      }
      setFormError(isApiError(e) ? e.message : m.common.loadError);
    },
  });

  function submit() {
    setFormError(null);
    if (validate()) save.mutate();
  }

  function restoreDraft() {
    if (!draft) return;
    setForm({ ...draft.form, outcomes: toItems(draft.form.outcomes), requirements: toItems(draft.form.requirements), benefits: toItems(draft.form.benefits) });
    setEditorKey((k) => k + 1);
    setDraft(null);
  }
  function discardDraft() {
    writeDraft(courseId, null);
    setDraft(null);
  }
  function revert() {
    setForm(fromCourse(course ? { ...course, ...(qc.getQueryData<Course>(qk.course(course.id)) ?? {}) } : null));
    setEditorKey((k) => k + 1);
    setErrors({});
    writeDraft(courseId, null);
  }

  const slug = course?.slug ?? slugify(form.title);
  const trailer = parseVideoUrl(form.trailer_url);
  const thumbOk = form.thumbnail.trim() && isImageRef(form.thumbnail.trim()) ? form.thumbnail.trim() : null;

  return (
    <div className="pb-20">
      {draft && (
        <Alert tone="info" title={t.draftFound} className="mb-4">
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={restoreDraft}>{t.draftRestore}</Button>
            <Button size="sm" variant="outline" onClick={discardDraft}>{t.draftDiscard}</Button>
          </div>
        </Alert>
      )}
      {formError && <Alert tone="danger" className="mb-4">{formError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <SectionCard title={t.sectionBasic}>
            <Field label={t.title} required error={errors.title}>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t.titlePlaceholder} maxLength={255} />
            </Field>
            <Field label={t.slug} hint={t.slugHint}>
              <div className="flex h-9 items-center rounded-lg border border-border bg-surface-subtle px-3 text-sm text-muted">
                <span className="shrink-0">/courses/</span>
                <span className="truncate font-medium text-foreground">{slug || "..."}</span>
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.category} error={errors.category_id}>
                <Combobox value={form.category_id} onChange={(v) => set("category_id", v)} placeholder={t.categoryNone} searchPlaceholder="Tìm danh mục..."
                  options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.label }))} />
              </Field>
              <Field label={t.level} error={errors.level}>
                <Select value={form.level} onChange={(e) => set("level", e.target.value)}>
                  <option value="">{t.levelNone}</option>
                  {(Object.keys(m.level) as CourseLevel[]).map((l) => <option key={l} value={l}>{m.level[l]}</option>)}
                </Select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title={t.sectionSchedule}>
            <Field label={t.learningMode} error={errors.learning_mode}>
              <Select value={form.learning_mode} onChange={(e) => set("learning_mode", e.target.value)}>
                <option value="free">{t.modeFree}</option>
                <option value="sequential">{t.modeSequential}</option>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.opensAt} error={errors.opens_at}><DateTimePicker value={form.opens_at} onChange={(v) => set("opens_at", v)} /></Field>
              <Field label={t.closesAt} error={errors.closes_at}><DateTimePicker value={form.closes_at} onChange={(v) => set("closes_at", v)} /></Field>
            </div>
            <p className="text-sm text-muted">{t.scheduleHint}</p>
          </SectionCard>

          <SectionCard title="Chứng chỉ">
            <Checkbox label={t.issueCertificate} checked={form.issue_certificate} onChange={(e) => set("issue_certificate", e.target.checked)} />
            <p className="text-sm text-muted">{t.issueCertificateHint}</p>
          </SectionCard>

          <SectionCard title={t.sectionContent}>
            <div>
              <p className="mb-1.5 text-sm font-medium">{t.description}</p>
              <RichTextEditor key={editorKey} value={form.description} onChange={(h) => set("description", h)} minHeight={180} label={t.description} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">{t.outcomes}</p>
              <p className="mb-2 text-sm text-muted">{t.outcomesHint}</p>
              <EditableList items={form.outcomes} onChange={(v) => set("outcomes", v)} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">{t.requirements}</p>
              <EditableList items={form.requirements} onChange={(v) => set("requirements", v)} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">{t.benefits}</p>
              <EditableList items={form.benefits} onChange={(v) => set("benefits", v)} />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <SectionCard title={t.sectionMedia}>
            <Thumb src={thumbOk} alt={t.previewAlt} className="w-full" />
            <UploadField label={t.thumbnail} hint={t.thumbnailHint} value={form.thumbnail} onChange={(url) => set("thumbnail", url)} error={errors.thumbnail} />
            <Field label={t.trailer} hint={errors.trailer_url ? undefined : t.trailerHint} error={errors.trailer_url}>
              <Input value={form.trailer_url} onChange={(e) => set("trailer_url", e.target.value)} placeholder="https://youtu.be/..." inputMode="url" />
            </Field>
            {trailer && trailer.kind !== "file" && (
              <div className="aspect-video overflow-hidden rounded-lg border border-border bg-surface-muted">
                <iframe src={trailer.src} title={m.lesson.video.previewTitle} className="size-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
              </div>
            )}
            <p className="text-sm text-muted">{m.common.uploadHint}</p>
          </SectionCard>
          <SectionCard title={t.sectionPrice}>
            <Field label={t.price} hint={errors.price ? undefined : t.priceHint} error={errors.price}>
              <Input value={form.price} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" />
            </Field>
          </SectionCard>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface lg:left-64">
        <div className="mx-auto flex max-w-[104rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="min-w-0 truncate text-sm text-muted" aria-live="polite">
            {dirty ? (draftSaved ? t.draftSaved : "Có thay đổi chưa lưu") : course ? m.common.saved : ""}
          </p>
          <div className="flex gap-2">
            {dirty && course && <Button variant="outline" onClick={revert} disabled={save.isPending}>{m.common.cancel}</Button>}
            <Button onClick={submit} loading={save.isPending} disabled={!dirty && !!course}>
              {course ? m.common.save : m.list.create}
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={guard.pendingHref !== null}
        onClose={guard.cancel}
        title={m.common.unsavedTitle}
        description={m.common.unsavedText}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={guard.cancel}>{m.common.unsavedStay}</Button>
            <Button variant="danger" onClick={guard.proceed}>{m.common.unsavedLeave}</Button>
          </>
        }
      />
    </div>
  );
}
