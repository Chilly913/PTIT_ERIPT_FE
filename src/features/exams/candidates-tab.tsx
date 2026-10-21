"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SearchIcon, UserPlusIcon, UsersIcon, XIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { LoadError } from "@/features/courses/parts";
import { errText, useDebounced } from "@/features/studio/common";
import { examMessages as m } from "./messages";
import type { Candidate, ExamDetail } from "./types";

const t = m.candidates;

function AddDialog({ examId, onClose }: { examId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const add = useMutation({
    mutationFn: (ids: string[]) => {
      const emails = ids.filter((x) => x.includes("@"));
      return api.post<{ enrolled: number; already_enrolled: number; not_found: string[] }>(`/exams/${examId}/enroll`, { emails, student_codes: ids.filter((x) => !x.includes("@")) });
    },
    onSuccess: (r) => {
      if (r.enrolled) toast.success(t.result(r.enrolled, r.already_enrolled));
      void qc.invalidateQueries({ queryKey: ["studio", "exam-candidates", String(examId)] });
      void qc.invalidateQueries({ queryKey: ["studio", "exam", String(examId)] });
      if (r.not_found.length) { setMissing(r.not_found); setText(r.not_found.join("\n")); } else onClose();
    },
    onError: (e) => toast.error(errText(e)),
  });
  return (
    <Dialog open onClose={onClose} title={t.addTitle} description={t.addHint}
      footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><Button loading={add.isPending} disabled={!text.trim()} onClick={() => add.mutate(Array.from(new Set(text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean))))}>{t.submit}</Button></>}>
      <div className="space-y-3">
        {missing.length > 0 && <Alert tone="warning">{t.notFound} {missing.join(", ")}</Alert>}
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} aria-label={t.addTitle} placeholder={"sv001@example.com\nB21DCCN001"} />
      </div>
    </Dialog>
  );
}

export function CandidatesTab({ exam }: { exam: ExamDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const dq = useDebounced(q.trim());
  const isCourse = exam.type === "course_final";
  const key = ["studio", "exam-candidates", String(exam.id)] as const;
  const list = useQuery({
    queryKey: [...key, dq, page],
    queryFn: () => api.get<Paginated<Candidate>>(`/exams/${exam.id}/enrolled-users`, { query: { q: dq || undefined, page, per_page: 15 } }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const remove = useMutation({
    mutationFn: (c: Candidate) => api.delete(`/exams/${exam.id}/unenroll/${c.user_id}`),
    onMutate: (c) => {
      const snap = qc.getQueriesData<Paginated<Candidate>>({ queryKey: key });
      qc.setQueriesData<Paginated<Candidate>>({ queryKey: key }, (l) => (l ? { ...l, data: l.data.filter((x) => x.user_id !== c.user_id) } : l));
      return { snap };
    },
    onError: (e, _c, ctx) => { ctx?.snap.forEach(([k, d]) => qc.setQueryData(k, d)); toast.error(errText(e)); },
    onSuccess: () => toast.success(t.removed),
    onSettled: () => { void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ["studio", "exam", String(exam.id)] }); },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{isCourse ? t.courseNote : m.list.candidates(list.data?.meta.total ?? exam.candidates_count)}</p>
        {!isCourse && <Button onClick={() => setAdding(true)}><UserPlusIcon className="size-4" aria-hidden /> {t.add}</Button>}
      </div>
      <div className="rounded-xl border border-border bg-surface">
        <div className="p-4">
          <div className="relative max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="pl-9" />
          </div>
        </div>
        {list.isPending ? (
          <div className="divide-y divide-border border-t border-border" aria-hidden>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3 px-4 py-3"><Skeleton className="size-7 rounded-full" /><Skeleton className="h-4 w-1/3" /></div>)}</div>
        ) : list.isError ? (
          <div className="border-t border-border"><LoadError onRetry={() => void list.refetch()} /></div>
        ) : list.data.data.length === 0 ? (
          <div className="border-t border-border"><EmptyState icon={<UsersIcon />} title={t.empty} description={t.emptyText} /></div>
        ) : (
          <ul className={`divide-y divide-border border-t border-border transition-opacity ${list.isFetching ? "opacity-70" : ""}`}>
            {list.data.data.map((c) => (
              <li key={c.user_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-subtle">
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.name}</p><p className="truncate text-sm text-muted">{c.email}{c.student_code ? ` · ${c.student_code}` : ""}</p></div>
                <Badge>{c.source === "exam" ? t.sourceExam : t.sourceCourse}</Badge>
                <span className="hidden w-20 text-right text-sm text-muted sm:block">{t.attempts(c.attempts_used)}</span>
                {!isCourse && <Button variant="ghost" size="icon" className="size-8" onClick={() => remove.mutate(c)} aria-label={`${t.remove}: ${c.name}`}><XIcon className="size-4" /></Button>}
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </div>
      {adding && <AddDialog examId={exam.id} onClose={() => setAdding(false)} />}
    </div>
  );
}
