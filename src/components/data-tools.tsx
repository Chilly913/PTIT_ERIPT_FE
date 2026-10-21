"use client";

import { useState } from "react";
import { Alert, Button, Dialog } from "@/components/ui";
import { DownloadIcon, FileTextIcon, UploadIcon, XIcon } from "@/components/icons";
import { FileDropzone } from "@/components/file-dropzone";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";

/** Builds a `?a=1&b=2` string skipping empty values. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Downloads the server CSV for the current filters (the BFF forwards the session cookie). */
export function ExportButton({ path, params, label = "Xuất CSV" }: { path: string; params?: Record<string, string | number | undefined | null>; label?: string }) {
  return (
    <a
      href={`/bff${path}${qs(params ?? {})}`}
      download
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-(--btn-outline-border) bg-(--btn-outline-bg) px-3 text-sm font-medium text-(--btn-outline-fg) transition-colors hover:bg-(--btn-outline-hover)"
    >
      <DownloadIcon className="size-4" aria-hidden /> {label}
    </a>
  );
}

interface ImportResult {
  created: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

/** Translates the per-row import messages returned by the API. */
function rowMessage(m: string): string {
  const nf = m.match(/^(\w+): "(.*)" not found$/);
  if (nf) return `Không tìm thấy “${nf[2]}” (cột ${nf[1]}).`;
  if (m === "already exists") return "Đã tồn tại (trùng mã hoặc tên).";
  if (m.startsWith("invalid relation")) return "Quan hệ không hợp lệ (ví dụ khóa không thuộc chương trình đã chọn).";
  if (m === "could not be saved") return "Không lưu được dòng này.";
  return m
    .replace(/The (.+?) field is required\./, "Thiếu trường $1.")
    .replace(/The selected (.+?) is invalid\./, "Giá trị $1 không hợp lệ.")
    .replace(/The (.+?) is not a valid date\./, "Ngày $1 không hợp lệ (dùng YYYY-MM-DD).");
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Minimal RFC 4180 parser, only used for the preview shown before uploading. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function size(n: number) {
  return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}

interface Picked {
  file: File;
  head: string[];
  rows: string[][];
  total: number;
}

/** Import dialog: drop (or pick) a CSV, preview it, upload it, then see created rows and per-row errors. */
export function ImportButton({
  path,
  templateName,
  headers,
  example,
  hint,
  onDone,
}: {
  path: string;
  templateName: string;
  headers: string[];
  example: string[];
  hint?: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => { setPicked(null); setError(null); setResult(null); };
  const close = () => {
    if (busy) return;
    if (result && result.created > 0) onDone();
    setOpen(false);
    reset();
  };

  const template = () => {
    const csv = "﻿" + [headers, example].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateName}-mau.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pick = async (file: File) => {
    setError(null);
    setResult(null);
    try {
      const all = parseCsv(await file.text());
      if (all.length < 2) return setError("Tệp cần có dòng tiêu đề và ít nhất một dòng dữ liệu.");
      setPicked({ file, head: all[0].map((h) => h.trim()), rows: all.slice(1, 4), total: all.length - 1 });
    } catch {
      setError("Không đọc được tệp này.");
    }
  };

  const missing = picked ? headers.filter((h) => !picked.head.map((x) => x.toLowerCase()).includes(h.toLowerCase())) : [];

  const submit = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", picked.file);
      setResult(await api.post<ImportResult>(path, fd));
    } catch (e) {
      setError(isApiError(e) ? (e.errors ? Object.values(e.errors).flat().join(" ") : e.message) : "Không nhập được tệp.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><UploadIcon className="size-4" aria-hidden /> Nhập CSV</Button>
      <Dialog open={open} onClose={close} title="Nhập dữ liệu từ tệp CSV" description={hint ?? "Dòng đầu là tiêu đề cột. Mỗi dòng sau đó là một bản ghi mới."} size="lg">
        <div className="space-y-4">
          {!picked ? (
            <FileDropzone accept=".csv,text/csv" maxBytes={10 * 1024 * 1024} label="Chọn tệp CSV" onFile={(f) => void pick(f)} onReject={setError} className="min-h-40">
              {({ dragging }) => (
                <span className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                  <span className={`flex size-12 items-center justify-center rounded-full ${dragging ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary-soft-foreground"}`}>
                    <UploadIcon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-medium">{dragging ? "Thả tệp để chọn" : "Kéo thả tệp CSV vào đây"}</span>
                  <span className="text-xs text-muted">hoặc <span className="font-medium text-primary underline underline-offset-2">bấm để chọn tệp</span> · tối đa 10 MB</span>
                </span>
              )}
            </FileDropzone>
          ) : (
            <div className="rounded-xl border border-border bg-surface-subtle p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground"><FileTextIcon className="size-5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{picked.file.name}</p>
                  <p className="text-xs text-muted">{size(picked.file.size)} · {picked.total} dòng dữ liệu</p>
                </div>
                {!result && (
                  <Button variant="ghost" size="sm" onClick={reset} disabled={busy} aria-label="Chọn tệp khác"><XIcon className="size-4" aria-hidden /></Button>
                )}
              </div>
              {missing.length > 0 && !result && <Alert tone="warning" className="mt-3">Thiếu cột: <span className="font-mono">{missing.join(", ")}</span>. Các cột này sẽ để trống.</Alert>}
              {!result && (
                <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted text-muted"><tr>{picked.head.map((h) => <th key={h} className="px-2 py-1.5 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {picked.rows.map((r, i) => (
                        <tr key={i}>{picked.head.map((h, c) => <td key={h + c} className="max-w-40 truncate px-2 py-1.5">{r[c] ?? ""}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                  {picked.total > picked.rows.length && <p className="border-t border-border px-2 py-1.5 text-xs text-muted">… và {picked.total - picked.rows.length} dòng nữa</p>}
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-muted">
            Cột: <span className="font-mono text-foreground">{headers.join(", ")}</span>.{" "}
            <button type="button" onClick={template} className="font-medium text-primary hover:underline">Tải tệp mẫu</button>
          </p>

          {error && <Alert tone="danger">{error}</Alert>}
          {result && (
            <div className="space-y-2">
              <Alert tone={result.failed ? "warning" : "success"}>Đã tạo {result.created} bản ghi{result.failed ? `, ${result.failed} dòng lỗi` : ""}.</Alert>
              {result.errors.length > 0 && (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface-muted p-3 text-sm">
                  {result.errors.map((e) => <li key={`${e.row}-${e.message}`}><span className="font-medium">Dòng {e.row}:</span> {rowMessage(e.message)}</li>)}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={busy}>Đóng</Button>
            <Button onClick={() => void submit()} loading={busy} disabled={!picked || !!result}>Nhập {picked ? `${picked.total} dòng` : "dữ liệu"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
