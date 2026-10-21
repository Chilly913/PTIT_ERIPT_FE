"use client";

import { Combobox } from "@/components/ui/combobox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheckIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { LoadError, NotReady } from "@/features/courses/parts";
import { isNotReady, useMyCourses } from "@/features/courses/api";
import { CourseSelect, errText, fieldErrors, PageSkeleton, useDebounced, useQueryParam } from "@/features/studio/common";
import { fmtDateTime } from "@/features/courses/utils";
import { examMessages as m } from "./messages";
import type { Exam, ExamStatus } from "./types";

const t = m.list;
export const ExamsSkeleton = () => <PageSkeleton rows={5} />;

export const STATUS_TONE: Record<ExamStatus, BadgeTone> = { draft: "neutral", scheduled: "info", active: "success", closed: "warning", archived: "neutral" };
export const ExamStatusBadge = ({ status }: { status: ExamStatus }) => <Badge tone={STATUS_TONE[status]}>{m.status[status]}</Badge>;

function CreateDialog({ scope, onClose }: { scope: string; onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [kind, setKind] = useState<"standalone" | "course">(scope && scope !== "standalone" ? "course" : "standalone");
  const [course, setCourse] = useState(scope && scope !== "standalone" ? scope : "");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("45");
  const [err, setErr] = useState<Record<string, string>>({});
  const create = useMutation({
    mutationFn: () => {
      const body = { title: title.trim(), duration: minutes ? Number(minutes) : null };
      return kind === "course" ? api.post<Exam>(`/courses/${course}/exams`, body) : api.post<Exam>("/exams/standalone", body);
    },
    onSuccess: (e) => {
      toast.success(t.created);
      void qc.invalidateQueries({ queryKey: ["studio", "exams"] });
      router.push(`/studio/exams/${e.id}`);
    },
    onError: (e) => {
      setErr(fieldErrors(e));
      toast.error(errText(e));
    },
  });
  function submit() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = t.titleRequired;
    if (kind === "course" && !course) e.course = t.courseRequired;
    setErr(e);
    if (!Object.keys(e).length) create.mutate();
  }
  return (
    <Dialog open onClose={onClose} title={t.createTitle} footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><Button loading={create.isPending} onClick={submit}>{t.create}</Button></>}>
      <div className="space-y-3">
        <Field label={t.kind}>
          <Select value={kind} onChange={(e) => setKind(e.target.value as "standalone" | "course")}>
            <option value="standalone">{t.standalone}</option>
            <option value="course">{t.kindCourse}</option>
          </Select>
        </Field>
        {kind === "course" && (
          <Field label={t.course} error={err.course} required>
            <CourseSelect value={course} onChange={setCourse} />
          </Field>
        )}
        <Field label={t.titleLabel} required error={err.title}><Input value={title} onChange={(e) => { setTitle(e.target.value); setErr({}); }} maxLength={255} /></Field>
        <Field label={m.detail.duration} error={err.duration}><Input value={minutes} inputMode="numeric" onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} /></Field>
      </div>
    </Dialog>
  );
}

export function ExamsPage() {
  const [scope, setScope] = useQueryParam("scope");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const dq = useDebounced(q.trim());
  const sc = scope || "standalone";
  const courses = useMyCourses({ per_page: 100 });
  void courses;

  const params = { q: dq || undefined, status: status || undefined, page, per_page: 12 };
  const list = useQuery({
    queryKey: ["studio", "exams", sc, params],
    queryFn: () => api.get<Paginated<Exam>>(sc === "standalone" ? "/exams/standalone" : `/courses/${sc}/exams`, { query: params }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });

  return (
    <>
      <PageHeader title={t.title} description={t.description} actions={<Button onClick={() => setCreating(true)}><PlusIcon className="size-4" aria-hidden /> {t.create}</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="w-full sm:w-64">
            <Combobox value={sc} onChange={(v) => { setScope(v === "standalone" ? "" : v); setPage(1); }} aria-label={t.scope} placeholder={t.scope} searchPlaceholder="Tìm khóa học..."
              options={[{ value: "standalone", label: t.standalone }, ...(courses.data?.data ?? []).map((c) => ({ value: String(c.id), label: c.title }))]} />
          </div>
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="pl-9" />
          </div>
          <div className="w-full sm:w-40">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={t.allStatus}>
              <option value="">{t.allStatus}</option>
              {(Object.keys(m.status) as ExamStatus[]).map((s) => <option key={s} value={s}>{m.status[s]}</option>)}
            </Select>
          </div>
        </div>
        <div className="border-t border-border">
          {list.isPending ? (
            <div className="divide-y divide-border" aria-hidden>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-5 w-20" /></div>)}</div>
          ) : list.isError ? (
            isNotReady(list.error) ? <NotReady /> : <LoadError onRetry={() => void list.refetch()} />
          ) : list.data.data.length === 0 ? (
            <EmptyState icon={<ClipboardCheckIcon />} title={t.emptyTitle} description={t.emptyText} action={<Button onClick={() => setCreating(true)}><PlusIcon className="size-4" aria-hidden /> {t.create}</Button>} />
          ) : (
            <ul className={`divide-y divide-border transition-opacity ${list.isFetching ? "opacity-70" : ""}`}>
              {list.data.data.map((e) => (
                <li key={e.id}>
                  <Link href={`/studio/exams/${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-surface-subtle">
                    <div className="min-w-0 flex-1 basis-60">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="truncate text-sm text-muted">
                        {e.type === "course_final" ? (e.course_title ?? m.kind.course_final) : m.kind.standalone} · {t.questions(e.question_count)} · {t.minutes(e.duration)} · {t.candidates(e.candidates_count)}
                      </p>
                    </div>
                    <span className="hidden text-sm text-muted md:block">{fmtDateTime(e.starts_at)}</span>
                    <ExamStatusBadge status={e.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </Card>
      {creating && <CreateDialog scope={sc} onClose={() => setCreating(false)} />}
    </>
  );
}
