"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, SchoolIcon, TrashIcon, UserPlusIcon, UsersIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/providers/session-provider";
import { api } from "@/lib/api";
import { canTeach } from "@/lib/auth-utils";
import { isApiError } from "@/lib/errors";
import { LoadError } from "@/features/courses/parts";
import { BackLink, errText, fieldErrors } from "@/features/studio/common";
import { classMessages as m } from "./messages";
import type { ClassCourse, ClassDetail, ClassStudent, TermOption } from "./types";

const t = m.detail;
const detailKey = (id: string) => ["classes", "detail", id] as const;
type Tab = "students" | "plan";

export function ClassDetailSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="mb-3 h-4 w-32" />
      <Skeleton className="h-8 w-80" />
      <Skeleton className="mt-6 h-64 w-full rounded-xl" />
    </div>
  );
}

function AddStudentsDialog({ classId, onClose }: { classId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ added: number; already: number; moved_from_other_class: string[]; not_found: string[] } | null>(null);
  const add = useMutation({
    mutationFn: (identifiers: string[]) => api.post<{ added: number; already: number; moved_from_other_class: string[]; not_found: string[] }>(`/classes/${classId}/students`, { identifiers }),
    onSuccess: (r) => {
      setResult(r);
      if (r.added) toast.success(t.addResult(r.added, r.already));
      void qc.invalidateQueries({ queryKey: detailKey(classId) });
      void qc.invalidateQueries({ queryKey: ["classes", "list"] });
      if (!r.not_found.length && !r.moved_from_other_class.length) onClose();
    },
    onError: (e) => setErr(fieldErrors(e).identifiers ?? errText(e)),
  });
  const submit = () => {
    const ids = text.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    if (!ids.length) return setErr(t.addStudentsHint);
    setErr("");
    add.mutate(ids);
  };
  return (
    <Dialog open onClose={onClose} title={t.addStudentsTitle} footer={<><Button variant="outline" onClick={onClose}>{t.cancel}</Button><Button loading={add.isPending} onClick={submit}>{t.addStudents}</Button></>}>
      <div className="space-y-3">
        <Field label="Email hoặc mã sinh viên" hint={t.addStudentsHint} error={err}><Textarea value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} rows={6} /></Field>
        {result?.not_found.length ? <p className="text-sm text-danger">{t.notFound(result.not_found.join(", "))}</p> : null}
        {result?.moved_from_other_class.length ? <p className="text-sm text-muted">{t.movedFrom(result.moved_from_other_class.join(", "))}</p> : null}
      </div>
    </Dialog>
  );
}

function StudentsTab({ classId, students }: { classId: string; students: ClassStudent[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<ClassStudent | null>(null);
  const remove = useMutation({
    mutationFn: (s: ClassStudent) => api.delete(`/classes/${classId}/students/${s.id}`),
    onSuccess: () => toast.success(t.removed),
    onError: (e) => toast.error(errText(e)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: detailKey(classId) });
      void qc.invalidateQueries({ queryKey: ["classes", "list"] });
    },
  });
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted">{m.list.students(students.length)}</p>
        <Button onClick={() => setAdding(true)}><UserPlusIcon className="size-4" aria-hidden /> {t.addStudents}</Button>
      </div>
      {students.length === 0 ? (
        <div className="border-t border-border"><EmptyState icon={<UsersIcon />} title={t.emptyStudents} description={t.emptyStudentsText} /></div>
      ) : (
        <>
          <div className="hidden border-t border-b border-(--table-divider) bg-(--table-header-bg) px-4 py-2.5 text-xs font-semibold tracking-wide text-(color:--table-header-fg) uppercase md:grid md:grid-cols-[minmax(0,1fr)_7rem_9rem_2.5rem] md:gap-4">
            <span>{t.colName}</span><span>{t.colCourses}</span><span>{t.colProgress}</span><span />
          </div>
          <ul className="divide-y divide-(--table-divider) border-t border-border md:border-t-0">
            {students.map((s) => (
              <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-(--table-row-hover) md:grid-cols-[minmax(0,1fr)_7rem_9rem_2.5rem]">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="truncate text-sm text-muted">{s.email}{s.student_code ? ` · ${s.student_code}` : ""}</p>
                </div>
                <span className="hidden text-sm tabular-nums md:block">{s.courses}</span>
                <div className="hidden items-center gap-2 md:flex" title={`${s.progress}%`}>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${s.progress}%` }} /></div>
                  <span className="text-sm tabular-nums">{s.progress}%</span>
                </div>
                <Button variant="ghost" size="icon" className="size-8 justify-self-end" onClick={() => setDel(s)} aria-label={`${t.remove}: ${s.name}`}><TrashIcon className="size-4" /></Button>
              </li>
            ))}
          </ul>
        </>
      )}
      {adding && <AddStudentsDialog classId={classId} onClose={() => setAdding(false)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} destructive title={t.removeTitle} description={del ? t.removeText(del.name) : undefined} confirmLabel={t.remove} onConfirm={() => { if (del) remove.mutate(del); setDel(null); }} />
    </div>
  );
}

function CurriculumDialog({ classId, onClose }: { classId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const create = useMutation({
    mutationFn: () => api.put(`/classes/${classId}/curriculum`, { name: name.trim() }),
    onSuccess: () => {
      toast.success(t.saved);
      void qc.invalidateQueries({ queryKey: detailKey(classId) });
      void qc.invalidateQueries({ queryKey: ["classes", "curricula"] });
      onClose();
    },
    onError: (e) => setErr(fieldErrors(e).code ?? errText(e)),
  });
  return (
    <Dialog open onClose={onClose} title={t.createCurriculum} footer={<><Button variant="outline" onClick={onClose}>{t.cancel}</Button><Button loading={create.isPending} onClick={() => (name.trim() ? create.mutate() : setErr(t.curriculumName))}>{t.create}</Button></>}>
      <Field label={t.curriculumName} required error={err}><Input value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} maxLength={200} placeholder={t.curriculumNamePlaceholder} /></Field>
    </Dialog>
  );
}

interface ClassReportRow {
  user_id: number;
  name: string;
  email: string;
  percent: number;
  completed_lessons: number;
  total_lessons: number;
  submitted_assignments: number;
  total_assignments: number;
  attended_sessions: number;
  total_sessions: number;
  at_risk: boolean;
  last_activity: string | null;
}

/** Read-only progress of this class in one course (advisors can open it without owning the course). */
function ClassReportDialog({ course, classId, teacher, onClose }: { course: ClassCourse; classId: string; teacher: boolean; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["classes", "report", classId, course.course_id],
    queryFn: () => api.get<{ summary: { avg_percent: number; completed: number; students: number }; students: ClassReportRow[] }>(`/courses/${course.course_id}/report`, { query: { class_id: classId } }),
    retry: false,
  });
  return (
    <Dialog open onClose={onClose} title={`${t.classReport}: ${course.title}`} size="lg"
      footer={teacher ? <Link href={`/studio/courses/${course.course_id}?tab=report&class_id=${classId}`} className={buttonStyles({ variant: "outline" })}>{t.fullReport}</Link> : null}>
      {q.isPending ? <Skeleton className="h-40 w-full" /> : q.isError ? <LoadError onRetry={() => void q.refetch()} /> : (
        <div className="space-y-3 text-sm">
          <p className="text-muted">{t.reportSummary(q.data.summary.students, q.data.summary.avg_percent, q.data.summary.completed)}</p>
          {q.data.students.length === 0 ? <p className="py-6 text-center text-muted">{t.reportEmpty}</p> : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {q.data.students.map((r) => (
                <li key={r.user_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
                  <span className="min-w-40 flex-1"><span className="font-medium">{r.name}</span> {r.at_risk && <Badge tone="warning">{t.atRisk}</Badge>}<span className="block text-xs text-muted">{r.email}</span></span>
                  <span className="flex items-center gap-2" title={`${r.completed_lessons}/${r.total_lessons}`}><span className="h-1.5 w-20 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-primary" style={{ width: `${r.percent}%` }} /></span><span className="w-9 text-right tabular-nums">{r.percent}%</span></span>
                  <span className="w-24 tabular-nums text-muted">{t.assignmentsShort} {r.total_assignments ? `${r.submitted_assignments}/${r.total_assignments}` : "—"}</span>
                  <span className="w-24 tabular-nums text-muted">{t.attendShort} {r.total_sessions ? `${r.attended_sessions}/${r.total_sessions}` : "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
}

function CourseRow({ c, total, onRemove, onAssign, onReport }: { c: ClassCourse; total: number; onRemove?: () => void; onAssign: () => void; onReport: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-48 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium"><span>{c.title}</span>
          {c.term_number != null && <Badge tone={c.is_required ? "info" : "neutral"}>{c.is_required ? t.required : t.elective}</Badge>}
          {c.status !== "published" && <Badge tone="warning">{t.unpublished}</Badge>}
        </p>
        <p className="text-sm text-muted">{t.enrolled(c.enrolled, total)}{c.enrolled > 0 ? ` · ${t.completed(c.completed)}` : ""}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onAssign} disabled={total === 0 || c.enrolled >= total}>{t.assign}</Button>
      <Button size="sm" variant="ghost" onClick={onReport} disabled={c.enrolled === 0}>{t.openReport}</Button>
      {onRemove && <Button variant="ghost" size="icon" className="size-8" onClick={onRemove} aria-label={`${t.removeCourse}: ${c.title}`}><TrashIcon className="size-4" /></Button>}
    </li>
  );
}

function PlanTab({ detail, classId }: { detail: ClassDetail; classId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useSession();
  const teacher = canTeach(user);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<{ course: ClassCourse; term: number | null } | null>(null);
  const [reporting, setReporting] = useState<ClassCourse | null>(null);
  const cls = detail.class;
  const total = detail.students.length;
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: detailKey(classId) });
    void qc.invalidateQueries({ queryKey: ["classes", "list"] });
  };
  const fail = (e: unknown) => toast.error(isApiError(e) ? (fieldErrors(e).curriculum ?? fieldErrors(e).term_number ?? e.message) : errText(e));

  const curricula = useQuery({
    queryKey: ["classes", "curricula", cls.program.id],
    queryFn: () => api.get<{ curricula: { id: number; code: string; name: string; courses: number; classes: number }[] }>("/curricula", { query: { program_id: cls.program.id } }),
    staleTime: 30_000,
  });
  const terms = useQuery({ queryKey: ["classes", "terms"], queryFn: () => api.get<{ terms: TermOption[] }>("/academic/terms"), staleTime: 60_000 });
  const catalog = useQuery({
    queryKey: ["classes", "catalog"],
    queryFn: () => api.get<{ data: { id: number; title: string }[] }>("/courses", { query: { per_page: 100 } }),
    staleTime: 60_000,
  });

  const setCurriculum = useMutation({ mutationFn: (id: number) => api.put(`/classes/${classId}/curriculum`, { curriculum_id: id }), onSuccess: () => { toast.success(t.saved); refresh(); }, onError: fail });
  const setTerm = useMutation({ mutationFn: (v: { term_number: number; term_id: number | null }) => api.put(`/classes/${classId}/terms`, { terms: [v] }), onSuccess: refresh, onError: fail });
  const addCourse = useMutation({ mutationFn: (v: { course_id: number; term_number: number }) => api.post(`/classes/${classId}/curriculum-courses`, v), onSuccess: refresh, onError: fail });
  const removeCourse = useMutation({ mutationFn: (id: number) => api.delete(`/classes/${classId}/curriculum-courses/${id}`), onSuccess: refresh, onError: fail });
  const assign = useMutation({
    mutationFn: (v: { course_id: number; term_number: number | null }) => api.post<{ enrolled: number; already: number }>(`/classes/${classId}/assign-course`, v),
    onSuccess: (r) => { toast.success(t.assigned(r.enrolled, r.already)); refresh(); },
    onError: fail,
  });

  const byTerm = useMemo(() => {
    const map = new Map<number, ClassCourse[]>();
    detail.courses.filter((c) => c.term_number != null).forEach((c) => map.set(c.term_number as number, [...(map.get(c.term_number as number) ?? []), c]));
    return map;
  }, [detail.courses]);
  const extra = detail.courses.filter((c) => c.term_number == null);
  const termCount = Math.max(8, ...Array.from(byTerm.keys()));
  const mapped = new Map(detail.term_map.map((x) => [x.term_number, x.term_id]));
  const sharedBy = curricula.data?.curricula.find((x) => x.id === cls.curriculum?.id)?.classes ?? 0;
  const termOptions = (terms.data?.terms ?? []).map((x) => ({ value: String(x.id), label: x.name, hint: x.year }));
  const used = new Set(detail.courses.map((c) => c.course_id));
  const courseOptions = (catalog.data?.data ?? []).filter((c) => !used.has(c.id)).map((c) => ({ value: String(c.id), label: c.title }));

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t.curriculum} className="min-w-64 flex-1 sm:max-w-md">
            <Combobox value={cls.curriculum ? String(cls.curriculum.id) : ""} onChange={(v) => v && setCurriculum.mutate(Number(v))} placeholder={t.pickCurriculum} searchPlaceholder={`${t.curriculum}...`}
              options={(curricula.data?.curricula ?? []).map((c) => ({ value: String(c.id), label: c.name, hint: `${c.courses} môn` }))} />
          </Field>
          <Button variant="outline" onClick={() => setCreating(true)}><PlusIcon className="size-4" aria-hidden /> {t.createCurriculum}</Button>
        </div>
        <p className="mt-2 text-sm text-muted">{t.curriculumHint}</p>
        {sharedBy > 1 && <p className="mt-1 text-sm text-warning" role="status">{t.sharedWarning(sharedBy)}</p>}
      </section>

      {!cls.curriculum ? (
        <div className="rounded-xl border border-border bg-surface"><EmptyState icon={<SchoolIcon />} title={t.noCurriculumTitle} description={t.noCurriculumText} /></div>
      ) : (
        <>
          {Array.from({ length: termCount }, (_, i) => i + 1).map((n) => {
            const list = byTerm.get(n) ?? [];
            return (
              <section key={n} className="rounded-xl border border-border bg-surface">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <h3 className="font-semibold">{t.termN(n)}</h3>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <span className="shrink-0 text-sm text-muted">{t.termMap}</span>
                    <Combobox className="w-full sm:w-80" value={mapped.get(n) ? String(mapped.get(n)) : ""} onChange={(v) => setTerm.mutate({ term_number: n, term_id: v ? Number(v) : null })}
                      options={termOptions} placeholder={t.termMapNone} searchPlaceholder="Tìm học kỳ..." aria-label={`${t.termMap} ${t.termN(n)}`} />
                  </div>
                </header>
                {list.length === 0 ? (
                  <p className="px-4 py-5 text-center text-sm text-muted">{t.noCourses}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {list.map((c) => <CourseRow key={c.course_id} c={c} total={total} onRemove={() => removeCourse.mutate(c.course_id)} onAssign={() => setAssigning({ course: c, term: n })} onReport={() => setReporting(c)} />)}
                  </ul>
                )}
                <footer className="border-t border-border px-4 py-3">
                  <Combobox className="w-full sm:w-80" value="" onChange={(v) => v && addCourse.mutate({ course_id: Number(v), term_number: n })} options={courseOptions} placeholder={t.addCourse} searchPlaceholder={t.searchCourse} aria-label={`${t.addCourse} (${t.termN(n)})`} />
                </footer>
              </section>
            );
          })}
        </>
      )}

      {extra.length > 0 && (
        <section className="rounded-xl border border-border bg-surface">
          <h3 className="border-b border-border px-4 py-3 font-semibold">{t.extraTitle}</h3>
          <ul className="divide-y divide-border">
            {extra.map((c) => <CourseRow key={c.course_id} c={c} total={total} onAssign={() => setAssigning({ course: c, term: null })} onReport={() => setReporting(c)} />)}
          </ul>
        </section>
      )}

      {reporting && <ClassReportDialog course={reporting} classId={classId} teacher={teacher} onClose={() => setReporting(null)} />}
      {creating && <CurriculumDialog classId={classId} onClose={() => setCreating(false)} />}
      <ConfirmDialog open={!!assigning} onClose={() => setAssigning(null)} title={t.assignTitle} description={assigning ? t.assignText(assigning.course.title, total) : undefined} confirmLabel={t.assign}
        onConfirm={() => { if (assigning) assign.mutate({ course_id: assigning.course.course_id, term_number: assigning.term }); setAssigning(null); }} />
    </div>
  );
}

export function ClassDetailPage({ classId }: { classId: string }) {
  const [tab, setTab] = useState<Tab>("students");
  const q = useQuery({ queryKey: detailKey(classId), queryFn: () => api.get<ClassDetail>(`/classes/${classId}`), retry: false });
  if (q.isPending) return <ClassDetailSkeleton />;
  if (q.isError) {
    return (
      <>
        <BackLink href="/studio/classes">{t.back}</BackLink>
        {isApiError(q.error) && q.error.status === 404 ? <EmptyState icon={<SchoolIcon />} title="Không tìm thấy lớp" description="Lớp không tồn tại hoặc bạn không được phân công lớp này." /> : <LoadError onRetry={() => void q.refetch()} />}
      </>
    );
  }
  const c = q.data.class;
  return (
    <div>
      <BackLink href="/studio/classes">{t.back}</BackLink>
      <div className="mb-5">
        <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight">
          <span>{c.code}</span><span className="font-medium text-muted">{c.name}</span>
          <Badge tone={c.status === "active" ? "success" : "neutral"}>{t.status[c.status] ?? c.status}</Badge>
        </h1>
        <p className="mt-1 text-muted">
          {c.program.name}{c.cohort ? ` · ${c.cohort.name}` : ""} · {c.advisor ? `${m.list.advisor}: ${c.advisor.name}` : m.list.noAdvisor} · {m.list.students(c.student_count)}
        </p>
      </div>
      <div role="tablist" aria-label="Quản lý lớp" className="mb-5 flex gap-1 border-b border-border">
        {(["students", "plan"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${tab === k ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>{t.tabs[k]}</button>
        ))}
      </div>
      {tab === "students" ? <StudentsTab classId={classId} students={q.data.students} /> : <PlanTab detail={q.data} classId={classId} />}
    </div>
  );
}
