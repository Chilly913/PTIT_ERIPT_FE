"use client";

import { Combobox } from "@/components/ui/combobox";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, DownloadIcon, EditIcon, ListIcon, PlusIcon, SearchIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/file-dropzone";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { LoadError } from "@/features/courses/parts";
import { BackLink, errText, useDebounced } from "@/features/studio/common";
import { qbMessages as m } from "./messages";
import { QuestionEditor } from "./question-editor";
import { questionPoints, type BankDetail, type QType, type Question } from "./types";

const t = m.detail;
const bankDetailKey = (c: string, b: string, p?: object) => ["studio", "bank", c, b, p ?? {}] as const;

type ImportResult = { dry_run?: boolean; total?: number; valid?: number; imported?: number; errors?: Array<{ row: number; message?: string }> };

function ImportDialog({ courseId, bankId, onClose }: { courseId: string; bankId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ tone: "info" | "danger" | "success"; text: string } | null>(null);
  const [rowErrors, setRowErrors] = useState<Array<{ row: number; message?: string }>>([]);
  const run = useMutation({
    mutationFn: (dry: boolean) => {
      if (!file) throw new Error(t.importNoFile);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("dry_run", dry ? "1" : "0");
      return api.post<ImportResult>(`/courses/${courseId}/question-banks/${bankId}/import`, fd);
    },
    onSuccess: (r, dry) => {
      setRowErrors(r.errors ?? []);
      if (dry) setMsg({ tone: (r.valid ?? 0) < (r.total ?? 0) ? "danger" : "success", text: t.importOk(r.valid ?? 0, r.total ?? 0) });
      else {
        toast.success(t.imported(r.imported ?? 0));
        void qc.invalidateQueries({ queryKey: ["studio", "bank", courseId, bankId] });
        void qc.invalidateQueries({ queryKey: ["studio", "banks", courseId] });
        onClose();
      }
    },
    onError: (e) => setMsg({ tone: "danger", text: e instanceof Error && !("status" in e) ? e.message : errText(e) }),
  });
  const link = "font-medium text-primary underline underline-offset-2";
  const base = `/bff/courses/${courseId}/question-bank-template`;
  return (
    <Dialog open onClose={onClose} title={t.importTitle} description={t.importHint} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><Button variant="outline" loading={run.isPending && run.variables === true} onClick={() => run.mutate(true)} disabled={!file}>{t.importCheck}</Button><Button loading={run.isPending && run.variables === false} onClick={() => run.mutate(false)} disabled={!file}>{t.importRun}</Button></>}>
      <div className="space-y-3">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <p className="text-sm text-muted">
          Chưa có tệp? Tải mẫu: <a href={`${base}?format=xlsx`} download className={link}>Excel (.xlsx)</a> · <a href={`${base}?format=docx`} download className={link}>Word (.docx)</a>. Điền câu hỏi theo mẫu rồi tải lên.
        </p>
        <FileDropzone accept=".xlsx,.docx" maxBytes={10 * 1024 * 1024} label="Chọn tệp Excel hoặc Word" className="min-h-28" onReject={(m) => setMsg({ tone: "danger", text: m })} onFile={(f) => { setFile(f); setMsg(null); setRowErrors([]); }}>
          {({ dragging }) => (
            <span className="flex min-h-28 flex-col items-center justify-center gap-1 px-4 py-4 text-center">
              <span className="text-sm font-medium">{dragging ? "Thả tệp để nạp" : file ? `Đã chọn: ${file.name}` : "Kéo thả tệp Excel hoặc Word vào đây"}</span>
              <span className="text-xs text-muted">hoặc <span className="font-medium text-primary underline underline-offset-2">bấm để chọn tệp</span> · hỗ trợ .xlsx và .docx</span>
            </span>
          )}
        </FileDropzone>
        {rowErrors.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-3 text-sm">
            {rowErrors.map((e, i) => <li key={i}><span className="font-medium">Dòng/câu {e.row}:</span> {e.message}</li>)}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

/** A button that opens a small menu of file downloads (keeps the page header short). */
function FileMenu({ label, items }: { label: string; items: [string, string][] }) {
  return (
    <Dropdown>
      <DropdownTrigger className={buttonStyles({ variant: "outline" })}>
        <DownloadIcon className="size-4" aria-hidden /> {label} <ChevronDownIcon className="size-4" aria-hidden />
      </DropdownTrigger>
      <DropdownContent align="end">
        {items.map(([name, href]) => <DropdownItem key={href} onSelect={() => window.location.assign(href)}>{name}</DropdownItem>)}
      </DropdownContent>
    </Dropdown>
  );
}

function QuestionRow({ x, onEdit, onDelete, checked, onCheck }: { x: Question; onEdit: (q: Question) => void; onDelete: (q: Question) => void; checked?: boolean; onCheck?: () => void }) {
  return (
    <div className="flex items-start gap-3">
      {onCheck && <input type="checkbox" checked={!!checked} onChange={onCheck} aria-label={`Chọn: ${x.code}`} className="mt-1 size-4 shrink-0 accent-(--primary)" />}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-medium">{x.content}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge tone="primary">{m.type[x.type]}</Badge>
          <Badge>{m.difficulty[x.difficulty]}</Badge>
          {x.group && <Badge tone="info">{x.group}</Badge>}
          <span className="tabular-nums">{questionPoints(x)} điểm</span>
          {x.type === "passage" && <span>{t.subQuestions((x.children ?? []).length)}</span>}
          <span>{x.code}</span>
          {x.used_in_quizzes > 0 && <span>{t.usedIn(x.used_in_quizzes)}</span>}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(x)} aria-label={`${t.edit}: ${x.code}`}><EditIcon className="size-4" /></Button>
      <Button variant="ghost" size="icon" className="size-8" onClick={() => onDelete(x)} aria-label={`Xóa: ${x.code}`}><TrashIcon className="size-4" /></Button>
    </div>
  );
}

export function BankDetailPage({ courseId, bankId }: { courseId: string; bankId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [groupId, setGroupId] = useState(useSearchParams().get("group") ?? "");
  const [page, setPage] = useState(1);
  // q = null creates a question; parent set creates a sub-question of that passage.
  const [editing, setEditing] = useState<{ q: Question | null; parent: Question | null } | null>(null);
  const [del, setDel] = useState<Question | null>(null);
  const [importing, setImporting] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [moveTo, setMoveTo] = useState("");
  const [bulkDel, setBulkDel] = useState(false);
  const dq = useDebounced(q.trim());

  const params = { q: dq || undefined, type: type || undefined, difficulty: difficulty || undefined, group_id: groupId || undefined, page, per_page: 10 };
  const bank = useQuery({
    queryKey: bankDetailKey(courseId, bankId, params),
    queryFn: () => api.get<BankDetail>(`/courses/${courseId}/question-banks/${bankId}`, { query: params }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["studio", "bank", courseId, bankId] });
    void qc.invalidateQueries({ queryKey: ["studio", "banks", courseId] });
  };
  const delQ = useMutation({
    mutationFn: (x: Question) => api.delete(`/courses/${courseId}/question-banks/${bankId}/questions/${x.id}`),
    onMutate: (x) => {
      const snap = qc.getQueriesData<BankDetail>({ queryKey: ["studio", "bank", courseId, bankId] });
      qc.setQueriesData<BankDetail>({ queryKey: ["studio", "bank", courseId, bankId] }, (b) => (b ? { ...b, questions: { ...b.questions, data: b.questions.data.filter((y) => y.id !== x.id) } } : b));
      return { snap };
    },
    onError: (e, _x, ctx) => {
      ctx?.snap.forEach(([k, d]) => qc.setQueryData(k, d));
      toast.error(errText(e));
    },
    onSuccess: () => toast.success(t.deleted),
    onSettled: invalidate,
  });

  const bulk = useMutation({
    mutationFn: (v: { action: "move" | "delete"; group_id?: number | null }) => api.post<{ affected: number }>(`/courses/${courseId}/question-banks/${bankId}/questions/bulk`, { ids: [...sel], ...v }),
    onSuccess: (r, v) => { toast.success(v.action === "delete" ? t.deletedMany(r.affected) : t.moved(r.affected)); setSel(new Set()); setMoveTo(""); invalidate(); },
    onError: (e) => toast.error(errText(e)),
  });

  const b = bank.data;
  if (bank.isPending) {
    return <div aria-hidden><Skeleton className="h-4 w-40" /><Skeleton className="mt-4 h-7 w-64" /><Skeleton className="mt-6 h-72 w-full" /></div>;
  }
  if (bank.isError || !b) return <LoadError onRetry={() => void bank.refetch()} />;
  const list = b.questions.data;
  const filtered = !!(dq || type || difficulty || groupId);

  return (
    <div>
      <BackLink href={`/studio/question-bank?course=${courseId}`}>{t.back}</BackLink>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{b.name}</h1>
          <p className="mt-1 text-muted">{m.banks.questions(b.question_count)} · {m.banks.groups(b.group_count)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FileMenu label={t.templateMenu} items={[[t.templateExcel, `/bff/courses/${courseId}/question-bank-template?format=xlsx`], [t.templateWord, `/bff/courses/${courseId}/question-bank-template?format=docx`]]} />
          <FileMenu label={t.exportMenu} items={[[t.exportExcel, `/bff/courses/${courseId}/question-banks/${bankId}/export?format=xlsx`], [t.exportWord, `/bff/courses/${courseId}/question-banks/${bankId}/export?format=docx`]]} />
          <Button variant="outline" onClick={() => setImporting(true)}><UploadIcon className="size-4" aria-hidden /> {t.import}</Button>
          <Button onClick={() => setEditing({ q: null, parent: null })}><PlusIcon className="size-4" aria-hidden /> {t.addQuestion}</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted">{t.groups}:</span>
        <button type="button" onClick={() => { setGroupId(""); setPage(1); }} aria-pressed={groupId === ""} className={`rounded-full border px-3 py-1 text-sm ${groupId === "" ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted hover:bg-surface-muted"}`}>{t.allGroups}</button>
        <button type="button" onClick={() => { setGroupId("none"); setPage(1); }} aria-pressed={groupId === "none"} className={`rounded-full border px-3 py-1 text-sm ${groupId === "none" ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted hover:bg-surface-muted"}`}>{t.noGroup}</button>
        {b.groups.map((g) => (
          <button key={g.id} type="button" onClick={() => { setGroupId(String(g.id)); setPage(1); }} aria-pressed={groupId === String(g.id)} className={`rounded-full border px-3 py-1 text-sm ${groupId === String(g.id) ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted hover:bg-surface-muted"}`}>{g.name} ({g.question_count})</button>
        ))}
        <Link href={`/studio/question-groups?course=${courseId}&bank=${bankId}`} className="ml-1 text-sm font-medium text-primary hover:underline">{t.manageGroups}</Link>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="pl-9" />
          </div>
          <div className="w-full sm:w-40">
            <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label={t.allTypes}>
              <option value="">{t.allTypes}</option>
              {(Object.keys(m.type) as QType[]).map((k) => <option key={k} value={k}>{m.type[k]}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <Select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1); }} aria-label={t.allDifficulty}>
              <option value="">{t.allDifficulty}</option>
              {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{m.difficulty[d]}</option>)}
            </Select>
          </div>
        </div>
        {sel.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-primary-soft px-4 py-2.5 text-sm" role="region" aria-label={t.selectedN(sel.size)}>
            <span className="font-medium">{t.selectedN(sel.size)}</span>
            <div className="w-48">
              <Combobox value={moveTo} onChange={setMoveTo} aria-label={t.moveTo} placeholder={`${t.moveTo}...`} searchPlaceholder="Tìm nhóm..."
                options={[{ value: "none", label: t.noGroupOption }, ...b.groups.map((g) => ({ value: String(g.id), label: g.name }))]} />
            </div>
            <Button size="sm" variant="outline" disabled={!moveTo} loading={bulk.isPending && bulk.variables?.action === "move"} onClick={() => bulk.mutate({ action: "move", group_id: moveTo === "none" ? null : Number(moveTo) })}>{t.moveBtn}</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkDel(true)}><TrashIcon className="size-3.5" aria-hidden /> {t.bulkDelete}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>{t.clearSel}</Button>
          </div>
        )}
        {list.length === 0 ? (
          <div className="border-t border-border"><EmptyState icon={<ListIcon />} title={filtered ? t.emptyFiltered : t.emptyTitle} description={filtered ? undefined : t.emptyText} action={!filtered ? <Button onClick={() => setEditing({ q: null, parent: null })}><PlusIcon className="size-4" aria-hidden /> {t.addQuestion}</Button> : undefined} /></div>
        ) : (
          <ul className={`divide-y divide-border border-t border-border transition-opacity ${bank.isFetching ? "opacity-70" : ""}`}>
            {list.map((x) => (
              <li key={x.id} className="px-4 py-3 hover:bg-surface-subtle">
                <QuestionRow x={x} onEdit={(y) => setEditing({ q: y, parent: null })} onDelete={setDel} checked={sel.has(x.id)} onCheck={() => setSel((s) => { const n = new Set(s); if (n.has(x.id)) n.delete(x.id); else n.add(x.id); return n; })} />
                {x.type === "passage" && (
                  <div className="mt-2 ml-4 border-l-2 border-border pl-4">
                    {(x.children ?? []).length === 0 && <p className="py-1 text-sm text-muted">{t.noSub}</p>}
                    {(x.children ?? []).map((c) => (
                      <div key={c.id} className="py-1.5"><QuestionRow x={c} onEdit={(y) => setEditing({ q: y, parent: x })} onDelete={setDel} /></div>
                    ))}
                    <Button variant="outline" size="sm" className="mt-1" onClick={() => setEditing({ q: null, parent: x })}><PlusIcon className="size-3.5" aria-hidden /> {t.addSub}</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={b.questions.meta} onPageChange={setPage} disabled={bank.isFetching} />
      </div>

      {editing && <QuestionEditor key={`${editing.parent?.id ?? "top"}:${editing.q?.id ?? "new"}`} courseId={courseId} bankId={Number(bankId)} groups={b.groups} question={editing.q} parent={editing.parent} onClose={() => setEditing(null)} />}
      {importing && <ImportDialog courseId={courseId} bankId={bankId} onClose={() => setImporting(false)} />}
      <ConfirmDialog open={bulkDel} onClose={() => setBulkDel(false)} destructive title={t.bulkDeleteTitle(sel.size)} description={t.bulkDeleteText} confirmLabel="Xóa" onConfirm={() => { setBulkDel(false); bulk.mutate({ action: "delete" }); }} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} destructive title={t.deleteTitle} description={del?.type === "passage" ? `${t.deleteText} ${t.deletePassageText}` : t.deleteText} confirmLabel="Xóa" onConfirm={() => { if (del) delQ.mutate(del); setDel(null); }} />
    </div>
  );
}
