"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChartIcon, PlusIcon, XIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { isNotReady } from "@/features/courses/api";
import { LoadError, NotReady } from "@/features/courses/parts";
import { CourseSelect, errText, fieldErrors, PageSkeleton, useQueryParam } from "@/features/studio/common";
import { useUnsavedGuard } from "@/features/settings/use-unsaved-guard";
import { Dialog } from "@/components/ui/dialog";

export const GradesSkeleton = () => <PageSkeleton rows={4} />;

interface Component { id?: number; name: string; weight: number; max_score: number; is_required: boolean; note?: string | null }
interface ComponentsRes { course_id: number; total_weight: number; components: Component[] }
interface Student {
  enrollment_id: number; user_id: number; name: string; student_code: string | null; email: string;
  entries: Record<string, { score: number | null }>;
  provisional_total: number; complete: boolean; total: number | null; letter: string | null; gpa4: number | null; passed: boolean | null;
}
interface Matrix { section: { id: number; code: string; course_title: string; course_id: number }; components: Array<Component & { id: number }>; students: Student[] }

interface Row { key: number; id?: number; name: string; weight: string; max: string; required: boolean }
let seq = 0;
const toRow = (c: Component): Row => ({ key: ++seq, id: c.id, name: c.name, weight: String(c.weight), max: String(c.max_score), required: c.is_required });

const PRESETS = [["standard", "Chuẩn (10/30/60)"], ["with_lab", "Có thực hành"], ["project", "Bài tập lớn"]] as const;

function Structure({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["studio", "grade-components", courseId] as const;
  const q = useQuery({ queryKey: key, queryFn: () => api.get<ComponentsRes>(`/instructor/courses/${courseId}/grade-components`), staleTime: 60_000, retry: false });
  if (q.isPending) return <div className="space-y-2 p-5" aria-hidden>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (q.isError) return isNotReady(q.error) ? <NotReady /> : <LoadError onRetry={() => void q.refetch()} message={errText(q.error)} />;
  return <StructureForm key={q.dataUpdatedAt} courseId={courseId} data={q.data} onSaved={() => void qc.invalidateQueries({ queryKey: key })} toast={toast} />;
}

function StructureForm({ courseId, data, onSaved, toast }: { courseId: string; data: ComponentsRes; onSaved: () => void; toast: ReturnType<typeof useToast> }) {
  const [rows, setRows] = useState<Row[]>(() => data.components.map(toRow));
  const [snap] = useState(() => JSON.stringify(data.components.map((c) => ({ ...toRow(c), key: 0 }))));
  const [err, setErr] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const dirty = JSON.stringify(rows.map((r) => ({ ...r, key: 0 }))) !== snap;
  const guard = useUnsavedGuard(dirty);
  const total = rows.reduce((n, r) => n + (Number(r.weight) || 0), 0);
  const set = (key: number, p: Partial<Row>) => setRows((l) => l.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const save = useMutation({
    mutationFn: () => api.put<ComponentsRes>(`/instructor/courses/${courseId}/grade-components`, { components: rows.map((r) => ({ id: r.id, name: r.name.trim(), weight: Number(r.weight) || 0, max_score: Number(r.max) || 0, is_required: r.required })) }),
    onSuccess: () => { toast.success("Đã lưu cấu trúc điểm"); setFormErr(null); onSaved(); },
    onError: (e) => { setErr(fieldErrors(e)); setFormErr(errText(e)); },
  });
  const preset = useMutation({
    mutationFn: (p: string) => api.post<ComponentsRes>(`/instructor/courses/${courseId}/grade-components/preset`, { preset: p }),
    onSuccess: () => { toast.success("Đã áp dụng mẫu"); onSaved(); },
    onError: (e) => toast.error(errText(e)),
  });

  return (
    <div className="space-y-4 p-5">
      {formErr && <Alert tone="danger">{formErr}</Alert>}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Mẫu nhanh:</span>
        {PRESETS.map(([k, l]) => <Button key={k} size="sm" variant="outline" loading={preset.isPending && preset.variables === k} onClick={() => preset.mutate(k)}>{l}</Button>)}
      </div>
      {rows.length === 0 && <p className="py-4 text-center text-sm text-muted">Khóa học chưa có thành phần điểm. Thêm thành phần hoặc áp dụng mẫu.</p>}
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_auto_auto] items-start gap-2 max-sm:grid-cols-2">
            <Field error={err[`components.${i}.name`]} className="max-sm:col-span-2"><Input value={r.name} onChange={(e) => set(r.key, { name: e.target.value })} placeholder="Tên thành phần" aria-label={`Tên thành phần ${i + 1}`} /></Field>
            <Field><Input value={r.weight} onChange={(e) => set(r.key, { weight: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" aria-label="Trọng số (%)" placeholder="Trọng số %" /></Field>
            <Field><Input value={r.max} onChange={(e) => set(r.key, { max: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" aria-label="Điểm tối đa" placeholder="Tối đa" /></Field>
            <div className="flex h-9 items-center"><Switch checked={r.required} onCheckedChange={(v) => set(r.key, { required: v })} aria-label="Bắt buộc" /><span className="ml-2 text-sm text-muted">Bắt buộc</span></div>
            <Button variant="ghost" size="icon" className="size-9" onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} aria-label="Xóa thành phần"><XIcon className="size-4" /></Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setRows((l) => [...l, { key: ++seq, name: "", weight: "0", max: "10", required: true }])}><PlusIcon className="size-4" aria-hidden /> Thêm thành phần</Button>
          <Badge tone={total === 100 ? "success" : "warning"}>Tổng trọng số: {total}%</Badge>
        </div>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty || rows.length === 0}>Lưu cấu trúc</Button>
      </div>
      <Dialog open={guard.pendingHref !== null} onClose={guard.cancel} title="Rời khỏi trang?" description="Cấu trúc điểm có thay đổi chưa lưu." size="sm"
        footer={<><Button variant="outline" onClick={guard.cancel}>Ở lại</Button><Button variant="danger" onClick={guard.proceed}>Rời đi</Button></>} />
    </div>
  );
}

function Entry() {
  const [sectionInput, setSectionInput] = useState("");
  const [section, setSection] = useQueryParam("section");
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["studio", "grades", section] as const;
  const q = useQuery({ queryKey: key, queryFn: () => api.get<Matrix>(`/instructor/sections/${section}/grades`), enabled: !!section, staleTime: 30_000, retry: false });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const entries = Object.entries(edits).map(([k, v]) => { const [u, c] = k.split(":"); return { user_id: Number(u), component_id: Number(c), score: v === "" ? null : Number(v.replace(",", ".")) }; });
      return api.put<Matrix>(`/instructor/sections/${section}/grades`, { entries });
    },
    // Use the returned matrix when complete; otherwise refetch instead of rendering a malformed cache entry.
    onSuccess: (m) => { if (m?.section && Array.isArray(m.students)) qc.setQueryData(key, m); else void qc.invalidateQueries({ queryKey: key }); setEdits({}); setErr(null); toast.success("Đã lưu điểm"); },
    onError: (e) => setErr(isApiError(e) ? `${e.message}${e.errors ? " " + Object.values(e.errors).flat().join(" ") : ""}` : errText(e)),
  });
  const dirty = Object.keys(edits).length > 0;
  const guard = useUnsavedGuard(dirty);

  return (
    <div className="space-y-4 p-5">
      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (/^\d+$/.test(sectionInput)) { setSection(sectionInput); setEdits({}); } }}>
        <Field label="Mã lớp học phần (ID)" className="w-52"><Input value={sectionInput || section} onChange={(e) => setSectionInput(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="VD: 3" /></Field>
        <Button type="submit" variant="outline">Mở bảng điểm</Button>
      </form>
      {!section ? (
        <p className="text-sm text-muted">Nhập mã lớp học phần do phòng đào tạo cấp để mở bảng điểm.</p>
      ) : q.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : q.isError ? (
        isNotReady(q.error) ? <NotReady /> : <LoadError onRetry={() => void q.refetch()} message={errText(q.error)} />
      ) : (
        <>
          {err && <Alert tone="danger">{err}</Alert>}
          <p className="text-sm text-muted">{q.data.section.course_title} · lớp {q.data.section.code} · {q.data.students.length} sinh viên</p>
          {q.data.components.length === 0 ? <Alert tone="info">Khóa học chưa có thành phần điểm. Hãy thiết lập ở thẻ “Cấu trúc điểm”.</Alert> : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[40rem] text-left">
                <thead className="border-b border-(--table-divider) bg-(--table-header-bg) text-xs font-semibold tracking-wide text-(color:--table-header-fg) uppercase">
                  <tr><th className="px-4 py-2.5">Sinh viên</th>{q.data.components.map((c) => <th key={c.id} className="px-2 py-2.5 text-center">{c.name}<br /><span className="font-normal normal-case">{c.weight}% · /{c.max_score}</span></th>)}<th className="px-3 py-2.5 text-right">Tổng</th><th className="px-3 py-2.5">Xếp loại</th></tr>
                </thead>
                <tbody className="divide-y divide-(--table-divider)">
                  {q.data.students.map((s) => (
                    <tr key={s.user_id}>
                      <td className="px-4 py-2"><p className="font-medium">{s.name}</p><p className="text-sm text-muted">{s.student_code ?? s.email}</p></td>
                      {q.data.components.map((c) => {
                        const k = `${s.user_id}:${c.id}`;
                        const cur = k in edits ? edits[k] : (s.entries[String(c.id)]?.score ?? "") === "" ? "" : String(s.entries[String(c.id)]?.score ?? "");
                        return <td key={c.id} className="px-2 py-1.5"><Input value={cur} onChange={(e) => setEdits((x) => ({ ...x, [k]: e.target.value.replace(/[^\d.,]/g, "") }))} inputMode="decimal" className="h-8 w-16 text-center" aria-label={`${s.name} - ${c.name}`} /></td>;
                      })}
                      <td className="px-3 text-right font-semibold tabular-nums">{s.total ?? <span className="font-normal text-muted">{s.provisional_total}*</span>}</td>
                      <td className="px-3">{s.letter ? <Badge tone={s.passed ? "success" : "danger"}>{s.letter}</Badge> : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted">* Điểm tạm tính, chưa đủ thành phần bắt buộc.</p>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>Lưu điểm{dirty ? ` (${Object.keys(edits).length})` : ""}</Button></div>
        </>
      )}
      <Dialog open={guard.pendingHref !== null} onClose={guard.cancel} title="Rời khỏi trang?" description="Bảng điểm có thay đổi chưa lưu." size="sm"
        footer={<><Button variant="outline" onClick={guard.cancel}>Ở lại</Button><Button variant="danger" onClick={guard.proceed}>Rời đi</Button></>} />
    </div>
  );
}

export function GradesPage() {
  const [course, setCourse] = useQueryParam("course");
  const [tab, setTab] = useState<"structure" | "entry">("structure");
  return (
    <>
      <PageHeader title="Điểm số" description="Thiết lập cấu trúc điểm của khóa học và nhập điểm theo lớp học phần." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <CourseSelect value={course} onChange={setCourse} className="w-full sm:w-72" />
          <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Điểm số">
            {([["structure", "Cấu trúc điểm"], ["entry", "Nhập điểm"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === k ? "bg-primary-soft text-primary-soft-foreground" : "text-muted hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="border-t border-border">
          {tab === "entry" ? <Entry /> : course ? <Structure courseId={course} /> : <EmptyState icon={<BarChartIcon />} title="Chọn khóa học" description="Chọn khóa học để thiết lập các thành phần điểm và trọng số." />}
        </div>
      </Card>
    </>
  );
}
