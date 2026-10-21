"use client";

import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Combobox } from "@/components/ui/combobox";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, ConfirmDialog, DataTable, Dialog, Field, Input, PageHeader, Switch, Textarea, useToast, type Column, type SortState } from "@/components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { ExportButton, ImportButton } from "@/components/data-tools";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import type { Paginated } from "@/lib/types";
import { RESOURCES, type FieldCfg, type FilterCfg, type Opt, type ResourceCfg, type Row } from "./config";

const base = (path: string) => `/admin/academic/${path}`;

function useOptions(name: string | undefined, params: Record<string, string> = {}) {
  const key = JSON.stringify(params);
  return useQuery({
    queryKey: ["academic-options", name, key],
    enabled: !!name,
    staleTime: 30_000,
    queryFn: () => api.get<Array<{ value: number; label: string }>>(`${base("options")}/${name}`, { query: params }),
    select: (rows): Opt[] => rows.map((r) => ({ value: String(r.value), label: r.label })),
  });
}

export function AcademicResourcePage({ resource }: { resource: string }) {
  const cfg = RESOURCES[resource];
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState | undefined>(undefined);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(text.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [text]);

  const params = useMemo(
    () => ({ page, per_page: 10, search, sort: sort?.key, dir: sort?.dir, ...filters }),
    [page, search, sort, filters],
  );
  const listKey = ["academic", cfg.path] as const;
  const list = useQuery({
    queryKey: [...listKey, params],
    queryFn: ({ signal }) => api.get<Paginated<Row>>(base(cfg.path), { query: params as Record<string, string | number>, signal }),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`${base(cfg.path)}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
  });

  const columns: Column<Row>[] = cfg.columns.map((c) => ({
    key: c.key,
    header: c.header,
    sort: c.sort,
    align: c.align,
    cell: c.cell ?? ((r) => String(r[c.key] ?? "")),
  }));

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`Đã xóa ${cfg.singular}`);
      setDeleting(null);
    } catch (e) {
      toast.error(`Không xóa được ${cfg.singular}`, e instanceof Error ? e.message : undefined);
      setDeleting(null);
    }
  };

  const hasFilters = search !== "" || Object.values(filters).some(Boolean);
  const exportParams = { search, sort: sort?.key, dir: sort?.dir, ...filters };

  return (
    <>
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        actions={
          <>
            <ExportButton path={`${base(cfg.path)}/export`} params={exportParams} />
            <ImportButton
              path={`${base(cfg.path)}/import`}
              templateName={cfg.fileName}
              headers={cfg.csv.headers}
              example={cfg.csv.example}
              hint={cfg.csv.hint}
              onDone={() => void qc.invalidateQueries({ queryKey: listKey })}
            />
            <Button onClick={() => setEditing("new")}><PlusIcon className="size-4" aria-hidden /> Thêm {cfg.singular}</Button>
          </>
        }
      />
      <DataTable<Row>
        columns={columns}
        rows={list.data?.data ?? []}
        loading={list.isPending}
        error={list.isError ? list.error.message : null}
        meta={list.data?.meta}
        sort={sort}
        onSort={(s) => { setSort(s); setPage(1); }}
        onPage={setPage}
        fetching={list.isFetching}
        empty={hasFilters ? { title: "Không có kết quả phù hợp", description: "Thử đổi từ khóa hoặc bỏ bớt bộ lọc." } : { title: `Chưa có ${cfg.singular} nào`, description: `Bấm “Thêm ${cfg.singular}” hoặc nhập từ CSV.` }}
        toolbar={
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <form role="search" onSubmit={(e) => { e.preventDefault(); setSearch(text.trim()); setPage(1); }} className="min-w-60 flex-1">
              <Input type="search" aria-label="Tìm kiếm" placeholder={cfg.searchPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
            </form>
            {cfg.filters.map((f) => (
              <FilterSelect key={f.param} filter={f} value={filters[f.param] ?? ""} onChange={(v) => { setFilters((x) => ({ ...x, [f.param]: v })); setPage(1); }} />
            ))}
            {hasFilters && (
              <Button variant="ghost" onClick={() => { setText(""); setSearch(""); setFilters({}); setPage(1); }}>Xóa bộ lọc</Button>
            )}
          </div>
        }
        rowActions={(r) => (
          <>
            <Button variant="ghost" size="sm" aria-label={`Sửa ${cfg.singular} ${String(r.name ?? r.code ?? r.id)}`} onClick={() => setEditing(r)}><EditIcon className="size-4" aria-hidden /></Button>
            <Button variant="ghost" size="sm" aria-label={`Xóa ${cfg.singular} ${String(r.name ?? r.code ?? r.id)}`} onClick={() => setDeleting(r)}><TrashIcon className="size-4" aria-hidden /></Button>
          </>
        )}
      />

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? `Thêm ${cfg.singular}` : `Sửa ${cfg.singular}`} size="lg">
        {editing !== null && <ResourceForm cfg={cfg} row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={`Xóa ${cfg.singular}?`}
        description={deleting ? `“${String(deleting.name ?? deleting.code)}” sẽ bị xóa vĩnh viễn. Không xóa được nếu đang được sử dụng.` : undefined}
        confirmLabel="Xóa"
        destructive
        loading={remove.isPending}
      />
    </>
  );
}

function FilterSelect({ filter, value, onChange }: { filter: FilterCfg; value: string; onChange: (v: string) => void }) {
  const remote = useOptions(filter.optionsFrom);
  const options = filter.options ?? remote.data ?? [];
  return (
    <Combobox aria-label={filter.label} value={value} onChange={onChange} className="w-56" placeholder={`${filter.label}: tất cả`} searchPlaceholder={`Tìm ${filter.label.toLowerCase()}...`}
      options={options.map((o) => ({ value: String(o.value), label: o.label }))} />
  );
}

function SelectField({ f, value, onChange, depValue, error }: { f: FieldCfg; value: string; onChange: (v: string) => void; depValue: string; error?: string }) {
  const params: Record<string, string> = f.dependsOn && depValue ? { [f.dependsOn]: depValue } : {};
  const remote = useOptions(f.optionsFrom, params);
  const options = f.options ?? remote.data ?? [];
  return (
    <Field label={f.label} required={f.required} hint={f.hint} error={error}>
      <Combobox value={value} onChange={onChange} placeholder="— Chọn —" searchPlaceholder="Tìm kiếm..."
        options={options.map((o) => ({ value: String(o.value), label: o.label }))} />
    </Field>
  );
}

function ResourceForm({ cfg, row, onClose }: { cfg: ResourceCfg; row: Row | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [v, setV] = useState<Record<string, unknown>>(() => {
    if (!row) return { ...cfg.defaults };
    const o: Record<string, unknown> = {};
    for (const f of cfg.fields) o[f.key] = row[f.key] ?? (f.type === "switch" ? false : "");
    return o;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      for (const f of cfg.fields) {
        const val = v[f.key];
        if (f.type === "switch") body[f.key] = !!val;
        else if (f.type === "number" || f.type === "select" && f.optionsFrom) body[f.key] = val === "" || val === null ? null : Number(val);
        else body[f.key] = val === "" ? null : val;
      }
      return row ? api.put(`${base(cfg.path)}/${row.id}`, body) : api.post(base(cfg.path), body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academic", cfg.path] }),
  });

  const set = (key: string, val: unknown) => {
    setV((x) => {
      const next = { ...x, [key]: val };
      for (const f of cfg.fields) if (f.dependsOn === key) next[f.key] = "";
      return next;
    });
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const next: Record<string, string> = {};
    for (const f of cfg.fields) if (f.required && f.type !== "switch" && (v[f.key] === "" || v[f.key] === null)) next[f.key] = "Trường này là bắt buộc.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await save.mutateAsync();
      toast.success(row ? `Đã lưu ${cfg.singular}` : `Đã thêm ${cfg.singular}`);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.status === 422 && err.errors) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, m]) => [k, m[0] ?? ""])));
      else setFormError(err instanceof Error ? err.message : "Không lưu được.");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        {cfg.fields.map((f) => {
          const err = errors[f.key];
          const wide = f.wide || f.type === "textarea" ? "sm:col-span-2" : "";
          if (f.type === "switch") {
            return (
              <div key={f.key} className={`flex flex-col justify-end pb-1 ${wide}`}>
                <Switch checked={!!v[f.key]} onCheckedChange={(c) => set(f.key, c)} label={f.label} />
                {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
              </div>
            );
          }
          if (f.type === "select") {
            return (
              <div key={f.key} className={wide}>
                <SelectField f={f} value={String(v[f.key] ?? "")} onChange={(val) => set(f.key, val)} depValue={f.dependsOn ? String(v[f.dependsOn] ?? "") : ""} error={err} />
              </div>
            );
          }
          return (
            <Field key={f.key} label={f.label} required={f.required} hint={f.hint} error={err} className={wide}>
              {f.type === "textarea" ? (
                <Textarea rows={3} value={String(v[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === "date" ? (
                <DateTimePicker mode="date" value={String(v[f.key] ?? "")} onChange={(val) => set(f.key, val)} aria-label={f.label} />
              ) : (
                <Input type={f.type} placeholder={f.placeholder} value={String(v[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              )}
            </Field>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>Hủy</Button>
        <Button type="submit" loading={save.isPending}>{row ? "Lưu thay đổi" : `Thêm ${cfg.singular}`}</Button>
      </div>
    </form>
  );
}
