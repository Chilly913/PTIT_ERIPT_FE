"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditIcon, ListIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { LoadError } from "@/features/courses/parts";
import { CourseSelect, errText, fieldErrors, PageSkeleton, useDebounced, useQueryParam } from "@/features/studio/common";
import { qbMessages as m } from "./messages";
import type { Bank } from "./types";

const t = m.banks;
export const bankKey = (course: string | number, p?: object) => ["studio", "banks", String(course), p ?? {}] as const;
export const BanksSkeleton = () => <PageSkeleton rows={5} />;

function BankDialog({ courseId, bank, onClose }: { courseId: string; bank: Bank | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(bank?.name ?? "");
  const [desc, setDesc] = useState(bank?.description ?? "");
  const [err, setErr] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), description: desc.trim() || null };
      return bank ? api.put(`/courses/${courseId}/question-banks/${bank.id}`, body) : api.post(`/courses/${courseId}/question-banks`, body);
    },
    onSuccess: () => {
      toast.success(t.saved);
      void qc.invalidateQueries({ queryKey: ["studio", "banks", courseId] });
      onClose();
    },
    onError: (e) => {
      setErr(fieldErrors(e));
      toast.error(errText(e));
    },
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={bank ? t.editTitle : t.createTitle}
      footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><Button loading={save.isPending} onClick={() => (name.trim() ? save.mutate() : setErr({ name: t.nameRequired }))}>Lưu</Button></>}
    >
      <div className="space-y-3">
        <Field label={t.name} required error={err.name}><Input value={name} onChange={(e) => { setName(e.target.value); setErr({}); }} maxLength={255} /></Field>
        <Field label={t.desc}><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></Field>
      </div>
    </Dialog>
  );
}

export function BanksPage() {
  const [course, setCourse] = useQueryParam("course");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Bank | "new" | null>(null);
  const [del, setDel] = useState<Bank | null>(null);
  const dq = useDebounced(q.trim());
  const qc = useQueryClient();
  const toast = useToast();

  const params = { q: dq || undefined, page, per_page: 12 };
  const list = useQuery({
    queryKey: bankKey(course, params),
    queryFn: () => api.get<Paginated<Bank>>(`/courses/${course}/question-banks`, { query: params }),
    enabled: !!course,
    staleTime: 30_000,
  });

  const remove = useMutation({
    mutationFn: (b: Bank) => api.delete(`/courses/${course}/question-banks/${b.id}`),
    onMutate: async (b) => {
      const snap = qc.getQueriesData<Paginated<Bank>>({ queryKey: ["studio", "banks", course] });
      qc.setQueriesData<Paginated<Bank>>({ queryKey: ["studio", "banks", course] }, (l) => (l ? { ...l, data: l.data.filter((x) => x.id !== b.id) } : l));
      return { snap };
    },
    onError: (e, _b, ctx) => {
      ctx?.snap.forEach(([k, d]) => qc.setQueryData(k, d));
      toast.error(errText(e));
    },
    onSuccess: () => toast.success(t.deleted),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["studio", "banks", course] }),
  });

  return (
    <>
      <PageHeader title={t.title} description={t.description} actions={course ? <Button onClick={() => setEditing("new")}><PlusIcon className="size-4" aria-hidden /> {t.create}</Button> : undefined} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <CourseSelect value={course} onChange={(v) => { setCourse(v); setPage(1); }} placeholder={t.pickCourse} className="w-full sm:w-72" />
          {course && (
            <div className="relative min-w-48 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="pl-9" />
            </div>
          )}
        </div>
        <div className="border-t border-border">
          {!course ? (
            <EmptyState icon={<ListIcon />} title={t.pickCourse} description={t.pickCourseHint} />
          ) : list.isPending ? (
            <div className="divide-y divide-border" aria-hidden>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-4 w-24" /></div>)}</div>
          ) : list.isError ? (
            <LoadError onRetry={() => void list.refetch()} />
          ) : list.data.data.length === 0 ? (
            <EmptyState icon={<ListIcon />} title={t.emptyTitle} description={t.emptyText} action={<Button onClick={() => setEditing("new")}><PlusIcon className="size-4" aria-hidden /> {t.create}</Button>} />
          ) : (
            <ul className={`divide-y divide-border transition-opacity ${list.isFetching ? "opacity-70" : ""}`}>
              {list.data.data.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-subtle">
                  <Link href={`/studio/question-bank/${course}/${b.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{b.name}</p>
                    <p className="truncate text-sm text-muted">{t.questions(b.question_count)} · {t.groups(b.group_count)}{b.description ? ` · ${b.description}` : ""}</p>
                  </Link>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(b)} aria-label={`${t.editTitle}: ${b.name}`}><EditIcon className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setDel(b)} aria-label={`Xóa: ${b.name}`}><TrashIcon className="size-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </Card>
      {editing && <BankDialog courseId={course} bank={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} destructive title={t.deleteTitle} description={del ? t.deleteText(del.name) : undefined} confirmLabel="Xóa" onConfirm={() => { if (del) remove.mutate(del); setDel(null); }} />
    </>
  );
}
