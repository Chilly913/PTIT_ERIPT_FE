"use client";

import { Combobox } from "@/components/ui/combobox";
import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditIcon, ListIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
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

const t = m.groupsPage;

interface Group {
  id: number;
  question_bank_id: number;
  name: string;
  description: string | null;
  question_count: number;
  bank: { id: number; name: string };
}

export const GroupsSkeleton = () => <PageSkeleton rows={5} />;
const groupsKey = (course: string) => ["studio", "groups", course] as const;

function GroupDialog({ courseId, banks, group, defaultBank, onClose }: { courseId: string; banks: Bank[]; group: Group | null; defaultBank: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [bank, setBank] = useState(group ? String(group.question_bank_id) : defaultBank || (banks[0] ? String(banks[0].id) : ""));
  const [name, setName] = useState(group?.name ?? "");
  const [desc, setDesc] = useState(group?.description ?? "");
  const [err, setErr] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), description: desc.trim() || null };
      return group ? api.put(`/courses/${courseId}/question-groups/${group.id}`, body) : api.post(`/courses/${courseId}/question-groups`, { ...body, question_bank_id: Number(bank) });
    },
    onSuccess: () => {
      toast.success(t.saved);
      void qc.invalidateQueries({ queryKey: ["studio", "groups", courseId] });
      void qc.invalidateQueries({ queryKey: ["studio", "bank"] });
      onClose();
    },
    onError: (e) => {
      setErr(fieldErrors(e));
      toast.error(errText(e));
    },
  });
  const submit = () => {
    if (!bank) return setErr({ question_bank_id: t.bankRequired });
    if (!name.trim()) return setErr({ name: t.nameRequired });
    save.mutate();
  };
  return (
    <Dialog open onClose={onClose} title={group ? t.editTitle : t.createTitle} footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><Button loading={save.isPending} onClick={submit}>Lưu</Button></>}>
      <div className="space-y-3">
        <Field label={t.bank} required error={err.question_bank_id} hint={group ? t.bankLocked : undefined}>
          <Combobox value={bank} onChange={setBank} disabled={!!group} placeholder="Chọn ngân hàng" searchPlaceholder="Tìm ngân hàng..." options={banks.map((b) => ({ value: String(b.id), label: b.name }))} />
        </Field>
        <Field label={t.name} required error={err.name}><Input value={name} onChange={(e) => { setName(e.target.value); setErr({}); }} maxLength={255} placeholder={t.namePlaceholder} /></Field>
        <Field label={t.desc}><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></Field>
      </div>
    </Dialog>
  );
}

export function GroupsPage() {
  const [course, setCourse] = useQueryParam("course");
  const [bank, setBank] = useQueryParam("bank");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Group | "new" | null>(null);
  const [del, setDel] = useState<Group | null>(null);
  const dq = useDebounced(q.trim());
  const qc = useQueryClient();
  const toast = useToast();

  const banks = useQuery({
    queryKey: ["studio", "banks-all", course],
    queryFn: () => api.get<Paginated<Bank>>(`/courses/${course}/question-banks`, { query: { per_page: 100 } }),
    enabled: !!course,
    staleTime: 30_000,
  });
  const params = { bank_id: bank || undefined, q: dq || undefined, page, per_page: 20 };
  const list = useQuery({
    queryKey: [...groupsKey(course), params],
    queryFn: () => api.get<Paginated<Group>>(`/courses/${course}/question-groups`, { query: params }),
    enabled: !!course,
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: (g: Group) => api.delete(`/courses/${course}/question-groups/${g.id}`),
    onSuccess: () => toast.success(t.deleted),
    onError: (e) => toast.error(errText(e)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: groupsKey(course) });
      void qc.invalidateQueries({ queryKey: ["studio", "bank"] });
    },
  });

  const bankList = banks.data?.data ?? [];
  const noBanks = !!course && banks.isSuccess && bankList.length === 0;

  return (
    <>
      <PageHeader title={t.title} description={t.description} actions={course && bankList.length ? <Button onClick={() => setEditing("new")}><PlusIcon className="size-4" aria-hidden /> {t.create}</Button> : undefined} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <CourseSelect value={course} onChange={(v) => { setCourse(v); setBank(""); setPage(1); }} placeholder={t.pickCourse} className="w-full sm:w-72" />
          {course && (
            <>
              <div className="w-full sm:w-64">
                <Combobox value={bank} onChange={(v) => { setBank(v); setPage(1); }} aria-label={t.bank} placeholder={t.allBanks} searchPlaceholder="Tìm ngân hàng..." options={bankList.map((b) => ({ value: String(b.id), label: b.name }))} />
              </div>
              <div className="relative min-w-48 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="pl-9" />
              </div>
            </>
          )}
        </div>
        <div className="border-t border-border">
          {!course ? (
            <EmptyState icon={<ListIcon />} title={t.pickCourse} description={t.pickCourseHint} />
          ) : noBanks ? (
            <EmptyState icon={<ListIcon />} title={t.noBanksTitle} description={t.noBanksText} action={<Link href={`/studio/question-bank?course=${course}`} className="text-sm font-medium text-primary hover:underline">{t.goBanks}</Link>} />
          ) : list.isPending ? (
            <div className="divide-y divide-border" aria-hidden>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-4 w-24" /></div>)}</div>
          ) : list.isError ? (
            <LoadError onRetry={() => void list.refetch()} />
          ) : list.data.data.length === 0 ? (
            <EmptyState icon={<ListIcon />} title={dq || bank ? t.noResults : t.emptyTitle} description={dq || bank ? undefined : t.emptyText} action={dq || bank ? undefined : <Button onClick={() => setEditing("new")}><PlusIcon className="size-4" aria-hidden /> {t.create}</Button>} />
          ) : (
            <ul className={`divide-y divide-border transition-opacity ${list.isFetching ? "opacity-70" : ""}`}>
              {list.data.data.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-subtle">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium"><span className="truncate">{g.name}</span><Badge>{g.bank.name}</Badge></p>
                    {g.description && <p className="truncate text-sm text-muted">{g.description}</p>}
                  </div>
                  <Link href={`/studio/question-bank/${course}/${g.question_bank_id}?group=${g.id}`} className="shrink-0 text-sm text-primary hover:underline">{m.banks.questions(g.question_count)}</Link>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(g)} aria-label={`${t.editTitle}: ${g.name}`}><EditIcon className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setDel(g)} aria-label={`Xóa: ${g.name}`}><TrashIcon className="size-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </Card>
      {editing && <GroupDialog courseId={course} banks={bankList} group={editing === "new" ? null : editing} defaultBank={bank} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} destructive title={t.deleteTitle} description={del ? t.deleteText(del.name, del.question_count) : undefined} confirmLabel="Xóa" onConfirm={() => { if (del) remove.mutate(del); setDel(null); }} />
    </>
  );
}
