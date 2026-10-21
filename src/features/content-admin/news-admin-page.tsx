"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, ConfirmDialog, DataTable, Dialog, Field, Input, PageHeader, Select, Skeleton, Switch, Textarea, useToast, type Column } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { ExportButton, ImportButton } from "@/components/data-tools";
import { UploadField } from "@/components/upload-field";
import { PlusIcon, EditIcon, TrashIcon } from "@/components/icons";
import { RichTextEditor } from "@/features/studio/rich-text-editor";
import { isApiError } from "@/lib/errors";
import { formatDate } from "@/features/site/format";
import { fetchNews, newsKey, useNewsList, useNewsMutations, type AdminNews, type NewsInput, type NewsQuery } from "./api";

const empty: NewsInput = { title: "", slug: "", excerpt: "", content: "", cover_image: "", status: "draft", is_featured: false };

export function NewsAdminPage() {
  const [query, setQuery] = useState<NewsQuery>({ page: 1, search: "", status: "" });
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<AdminNews | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminNews | null>(null);
  const toast = useToast();
  const qc = useQueryClient();
  const list = useNewsList(query);
  const { remove } = useNewsMutations();

  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.search === text.trim() ? q : { ...q, search: text.trim(), page: 1 })), 300);
    return () => clearTimeout(t);
  }, [text]);

  const columns: Column<AdminNews>[] = [
    {
      key: "title", header: "Bài viết", sort: "title",
      cell: (n) => (<div><p className="font-medium">{n.title}</p><p className="text-xs text-muted">/news/{n.slug}</p></div>),
    },
    { key: "status", header: "Trạng thái", sort: "status", cell: (n) => <Badge tone={n.status === "published" ? "success" : "neutral"}>{n.status === "published" ? "Đã đăng" : "Bản nháp"}</Badge> },
    { key: "is_featured", header: "Nổi bật", sort: "is_featured", cell: (n) => (n.is_featured ? <Badge tone="primary">Nổi bật</Badge> : <span className="text-muted">—</span>) },
    { key: "published_at", header: "Ngày đăng", sort: "published_at", className: "whitespace-nowrap", cell: (n) => (n.published_at ? formatDate(n.published_at) : "—") },
    { key: "updated_at", header: "Cập nhật", sort: "updated_at", className: "whitespace-nowrap", cell: (n) => formatDate(n.updated_at) },
  ];

  const sort = query.sort ? { key: query.sort, dir: query.dir ?? "asc" } : undefined;
  const filtered = query.search !== "" || query.status !== "";

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Đã xóa bài viết", deleting.title);
    } catch (e) {
      toast.error("Không xóa được bài viết", e instanceof Error ? e.message : undefined);
    }
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Tin tức"
        description="Viết và quản lý bài viết hiển thị trên trang chủ và mục Tin tức."
        actions={
          <>
            <ExportButton path="/admin/news/export" params={{ search: query.search, status: query.status, sort: query.sort, dir: query.dir }} />
            <ImportButton
              path="/admin/news/import"
              templateName="tin-tuc"
              headers={["title", "slug", "excerpt", "content", "cover_image", "status", "is_featured"]}
              example={["Tiêu đề bài viết", "", "Tóm tắt ngắn", "<p>Nội dung HTML</p>", "/news/anh.jpg", "draft", "false"]}
              hint="status: draft hoặc published. Để trống slug để tự tạo từ tiêu đề."
              onDone={() => void qc.invalidateQueries({ queryKey: newsKey })}
            />
            <Button onClick={() => setEditing("new")}><PlusIcon className="size-4" aria-hidden /> Viết bài mới</Button>
          </>
        }
      />
      <DataTable<AdminNews>
        columns={columns}
        rows={list.data?.data ?? []}
        loading={list.isPending}
        error={list.isError ? list.error.message : null}
        meta={list.data?.meta}
        sort={sort}
        onSort={(s) => setQuery((q) => ({ ...q, sort: s.key, dir: s.dir, page: 1 }))}
        onPage={(page) => setQuery((q) => ({ ...q, page }))}
        fetching={list.isFetching}
        empty={filtered ? { title: "Không có bài viết phù hợp", description: "Thử đổi từ khóa hoặc bỏ bộ lọc." } : { title: "Chưa có bài viết", description: "Bấm “Viết bài mới” để tạo bài đầu tiên." }}
        toolbar={
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <form role="search" onSubmit={(e) => { e.preventDefault(); setQuery((q) => ({ ...q, search: text.trim(), page: 1 })); }} className="min-w-60 flex-1">
              <Input type="search" aria-label="Tìm bài viết" placeholder="Tìm theo tiêu đề hoặc tóm tắt..." value={text} onChange={(e) => setText(e.target.value)} />
            </form>
            <Select aria-label="Trạng thái" value={query.status} onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value as NewsQuery["status"], page: 1 }))} className="w-44">
              <option value="">Trạng thái: tất cả</option>
              <option value="published">Đã đăng</option>
              <option value="draft">Bản nháp</option>
            </Select>
            {filtered && <Button variant="ghost" onClick={() => { setText(""); setQuery((q) => ({ ...q, search: "", status: "", page: 1 })); }}>Xóa bộ lọc</Button>}
          </div>
        }
        rowActions={(n) => (
          <>
            <Button variant="ghost" size="sm" aria-label={`Sửa: ${n.title}`} onClick={() => setEditing(n)}><EditIcon className="size-4" aria-hidden /></Button>
            <Button variant="ghost" size="sm" aria-label={`Xóa: ${n.title}`} onClick={() => setDeleting(n)}><TrashIcon className="size-4" aria-hidden /></Button>
          </>
        )}
      />

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Viết bài mới" : "Sửa bài viết"} size="lg">
        {editing !== null && <NewsForm post={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Xóa bài viết?"
        description={deleting ? `Bài “${deleting.title}” sẽ bị xóa vĩnh viễn.` : undefined}
        confirmLabel="Xóa"
        destructive
        loading={remove.isPending}
      />
    </>
  );
}

function NewsForm({ post, onClose }: { post: AdminNews | null; onClose: () => void }) {
  const toast = useToast();
  const { save } = useNewsMutations();
  const [v, setV] = useState<NewsInput>(empty);
  const [loading, setLoading] = useState(post !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Load the full post (with content) once when editing.
  useEffect(() => {
    if (!post) return;
    let alive = true;
    fetchNews(post.id)
      .then((d) => alive && setV({ title: d.title, slug: d.slug, excerpt: d.excerpt ?? "", content: d.content ?? "", cover_image: d.cover_image ?? "", status: d.status, is_featured: d.is_featured }))
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "Không tải được bài viết."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [post]);

  const set = <K extends keyof NewsInput>(k: K, val: NewsInput[K]) => { setV((x) => ({ ...x, [k]: val })); setErrors((e) => ({ ...e, [k]: "" })); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const next: Record<string, string> = {};
    if (!v.title.trim()) next.title = "Vui lòng nhập tiêu đề.";
    if (v.excerpt.length > 500) next.excerpt = "Tóm tắt tối đa 500 ký tự.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await save.mutateAsync({ id: post?.id, body: v });
      toast.success(post ? "Đã lưu bài viết" : "Đã tạo bài viết", v.title);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.status === 422 && err.errors) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, m]) => [k, m[0] ?? ""])));
      } else {
        setFormError(err instanceof Error ? err.message : "Không lưu được bài viết.");
      }
    }
  };

  if (loading) return <div className="space-y-3" aria-hidden><Skeleton className="h-10 w-full" /><Skeleton className="h-40 w-full" /></div>;
  if (loadError) return <Alert tone="danger">{loadError}</Alert>;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Field label="Tiêu đề" required error={errors.title}>
        <Input autoFocus value={v.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Đường dẫn (slug)" hint="Để trống để tự tạo từ tiêu đề." error={errors.slug}>
          <Input value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder="tu-dong-tao-tu-tieu-de" />
        </Field>
        <UploadField label="Ảnh bìa" value={v.cover_image} onChange={(url) => set("cover_image", url)} error={errors.cover_image} />
      </div>
      <Field label="Tóm tắt" hint={`${v.excerpt.length}/500 ký tự`} error={errors.excerpt}>
        <Textarea rows={3} value={v.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-medium">Nội dung</p>
        <RichTextEditor value={v.content} onChange={(html) => set("content", html)} minHeight={220} label="Nội dung bài viết" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Trạng thái" error={errors.status}>
          <Select value={v.status} onChange={(e) => set("status", e.target.value as NewsInput["status"])}>
            <option value="draft">Bản nháp (chưa hiển thị)</option>
            <option value="published">Đăng ngay</option>
          </Select>
        </Field>
        <div className="flex items-end pb-2">
          <Switch checked={v.is_featured} onCheckedChange={(c) => set("is_featured", c)} label="Bài nổi bật" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>Hủy</Button>
        <Button type="submit" loading={save.isPending}>{post ? "Lưu thay đổi" : "Tạo bài viết"}</Button>
      </div>
    </form>
  );
}
