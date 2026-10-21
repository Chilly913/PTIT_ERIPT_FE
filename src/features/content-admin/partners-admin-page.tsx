"use client";

import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, ConfirmDialog, DataTable, Dialog, Field, Input, PageHeader, Select, Switch, useToast, type Column } from "@/components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { ExportButton, ImportButton } from "@/components/data-tools";
import { UploadField } from "@/components/upload-field";
import { isApiError } from "@/lib/errors";
import { partnersKey, usePartnerMutations, usePartnersList, type AdminPartner, type PartnerInput, type PartnersQuery } from "./api";

const empty: PartnerInput = { name: "", logo: "", website_url: "", sort_order: 0, is_active: true };

export function PartnersAdminPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState<PartnersQuery>({ page: 1, search: "", is_active: "" });
  const [text, setText] = useState("");
  const list = usePartnersList(query);
  const { remove, save } = usePartnerMutations();
  const [editing, setEditing] = useState<AdminPartner | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminPartner | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.search === text.trim() ? q : { ...q, search: text.trim(), page: 1 })), 300);
    return () => clearTimeout(t);
  }, [text]);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Đã xóa đối tác", deleting.name);
    } catch (e) {
      toast.error("Không xóa được đối tác", e instanceof Error ? e.message : undefined);
    }
    setDeleting(null);
  };

  const toggleActive = async (p: AdminPartner, active: boolean) => {
    try {
      await save.mutateAsync({ id: p.id, body: { name: p.name, logo: p.logo, website_url: p.website_url ?? "", sort_order: p.sort_order, is_active: active } });
    } catch (e) {
      toast.error("Không cập nhật được", e instanceof Error ? e.message : undefined);
    }
  };

  const columns: Column<AdminPartner>[] = [
    {
      key: "name",
      header: "Đối tác",
      sort: "name",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded border border-border bg-surface p-1">
            <Image src={p.logo} alt="" width={64} height={40} unoptimized={p.logo.endsWith(".svg") || p.logo.startsWith("http") || p.logo.startsWith("/uploads")} className="h-full w-auto max-w-full object-contain" />
          </span>
          <span className="font-medium">{p.name}</span>
        </div>
      ),
    },
    { key: "website_url", header: "Website", className: "max-w-56 truncate text-muted", cell: (p) => p.website_url ?? "—" },
    { key: "sort_order", header: "Thứ tự", sort: "sort_order", align: "right", cell: (p) => <span className="tabular-nums">{p.sort_order}</span> },
    {
      key: "is_active",
      header: "Hiển thị",
      sort: "is_active",
      cell: (p) => (
        <div className="flex items-center gap-2">
          <Switch checked={p.is_active} onCheckedChange={(c) => void toggleActive(p, c)} aria-label={`Hiển thị ${p.name}`} />
          {!p.is_active && <Badge>Đang ẩn</Badge>}
        </div>
      ),
    },
  ];
  const sort = query.sort ? { key: query.sort, dir: query.dir ?? "asc" } : undefined;
  const filtered = query.search !== "" || query.is_active !== "";

  return (
    <>
      <PageHeader
        title="Đối tác hợp tác"
        description="Danh sách logo đối tác hiển thị trên trang chủ. Đối tác tắt hiển thị sẽ được ẩn khỏi trang chủ."
        actions={
          <>
            <ExportButton path="/admin/partners/export" params={{ search: query.search, is_active: query.is_active, sort: query.sort, dir: query.dir }} />
            <ImportButton
              path="/admin/partners/import"
              templateName="doi-tac"
              headers={["name", "logo", "website_url", "sort_order", "is_active"]}
              example={["Tên đối tác", "/partners/ten-doi-tac.png", "https://example.com", "1", "true"]}
              hint="logo là đường dẫn ảnh (VD /partners/fpt.png) hoặc URL đầy đủ."
              onDone={() => void qc.invalidateQueries({ queryKey: partnersKey })}
            />
            <Button onClick={() => setEditing("new")}><PlusIcon className="size-4" aria-hidden /> Thêm đối tác</Button>
          </>
        }
      />
      <DataTable<AdminPartner>
        columns={columns}
        rows={list.data?.data ?? []}
        loading={list.isPending}
        error={list.isError ? list.error.message : null}
        meta={list.data?.meta}
        sort={sort}
        onSort={(s) => setQuery((q) => ({ ...q, sort: s.key, dir: s.dir, page: 1 }))}
        onPage={(page) => setQuery((q) => ({ ...q, page }))}
        fetching={list.isFetching}
        empty={filtered ? { title: "Không có đối tác phù hợp", description: "Thử đổi từ khóa hoặc bỏ bộ lọc." } : { title: "Chưa có đối tác", description: "Bấm “Thêm đối tác” để thêm logo đầu tiên." }}
        toolbar={
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <form role="search" onSubmit={(e) => { e.preventDefault(); setQuery((q) => ({ ...q, search: text.trim(), page: 1 })); }} className="min-w-60 flex-1">
              <Input type="search" aria-label="Tìm đối tác" placeholder="Tìm theo tên hoặc website..." value={text} onChange={(e) => setText(e.target.value)} />
            </form>
            <Select aria-label="Hiển thị" value={query.is_active} onChange={(e) => setQuery((q) => ({ ...q, is_active: e.target.value as PartnersQuery["is_active"], page: 1 }))} className="w-48">
              <option value="">Hiển thị: tất cả</option>
              <option value="true">Đang hiển thị</option>
              <option value="false">Đang ẩn</option>
            </Select>
            {filtered && <Button variant="ghost" onClick={() => { setText(""); setQuery((q) => ({ ...q, search: "", is_active: "", page: 1 })); }}>Xóa bộ lọc</Button>}
          </div>
        }
        rowActions={(p) => (
          <>
            <Button variant="ghost" size="sm" aria-label={`Sửa: ${p.name}`} onClick={() => setEditing(p)}><EditIcon className="size-4" aria-hidden /></Button>
            <Button variant="ghost" size="sm" aria-label={`Xóa: ${p.name}`} onClick={() => setDeleting(p)}><TrashIcon className="size-4" aria-hidden /></Button>
          </>
        )}
      />

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Thêm đối tác" : "Sửa đối tác"}>
        {editing !== null && <PartnerForm partner={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Xóa đối tác?"
        description={deleting ? `Đối tác “${deleting.name}” sẽ bị xóa khỏi danh sách.` : undefined}
        confirmLabel="Xóa"
        destructive
        loading={remove.isPending}
      />
    </>
  );
}

function PartnerForm({ partner, onClose }: { partner: AdminPartner | null; onClose: () => void }) {
  const toast = useToast();
  const { save } = usePartnerMutations();
  const [v, setV] = useState<PartnerInput>(
    partner ? { name: partner.name, logo: partner.logo, website_url: partner.website_url ?? "", sort_order: partner.sort_order, is_active: partner.is_active } : empty,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = <K extends keyof PartnerInput>(k: K, val: PartnerInput[K]) => { setV((x) => ({ ...x, [k]: val })); setErrors((e) => ({ ...e, [k]: "" })); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const next: Record<string, string> = {};
    if (!v.name.trim()) next.name = "Vui lòng nhập tên đối tác.";
    if (!v.logo.trim()) next.logo = "Vui lòng tải logo lên hoặc nhập đường dẫn.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await save.mutateAsync({ id: partner?.id, body: v });
      toast.success(partner ? "Đã lưu đối tác" : "Đã thêm đối tác", v.name);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.status === 422 && err.errors) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, m]) => [k, m[0] ?? ""])));
      } else {
        setFormError(err instanceof Error ? err.message : "Không lưu được đối tác.");
      }
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Field label="Tên đối tác" required error={errors.name}>
        <Input autoFocus value={v.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <UploadField label="Logo" shape="logo" value={v.logo} onChange={(url) => set("logo", url)} error={errors.logo} />
      <Field label="Website" hint="Để trống nếu không có." error={errors.website_url}>
        <Input type="url" value={v.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thứ tự hiển thị" hint="Số nhỏ hiện trước.">
          <Input type="number" value={v.sort_order} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} />
        </Field>
        <div className="flex items-end pb-2">
          <Switch checked={v.is_active} onCheckedChange={(c) => set("is_active", c)} label="Hiển thị trên trang chủ" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>Hủy</Button>
        <Button type="submit" loading={save.isPending}>{partner ? "Lưu thay đổi" : "Thêm đối tác"}</Button>
      </div>
    </form>
  );
}
