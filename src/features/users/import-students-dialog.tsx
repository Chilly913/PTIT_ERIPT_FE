"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Input, Select, useToast } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FileDropzone } from "@/components/file-dropzone";
import { api, isApiError } from "@/lib/api";
import { usersKey } from "./api";

interface ImportResult {
  dry_run?: boolean;
  total: number;
  valid: number;
  create: number;
  update: number;
  row_errors: { row: number; message: string }[];
  by_class: Record<string, number>;
  created?: number;
  updated?: number;
  invites?: number;
}

const t = {
  title: "Nhập sinh viên từ Excel",
  hint: "Mỗi dòng một sinh viên; có mã lớp hành chính thì sinh viên được xếp lớp, kèm chương trình, khóa, ngành của lớp. Bấm Kiểm tra trước để xem lỗi và số sinh viên mỗi lớp.",
  template: "Tải file mẫu (.xlsx)",
  drop: "Kéo thả tệp Excel vào đây",
  pick: "bấm để chọn tệp",
  chosen: (n: string) => `Đã chọn: ${n}`,
  mode: "Cách nhập",
  modeCreate: "Chỉ thêm sinh viên mới",
  modeUpdate: "Thêm mới và cập nhật sinh viên đã có (kể cả chuyển lớp)",
  invite: "Gửi email mời đặt mật khẩu cho sinh viên mới",
  inviteHint: "Cần cấu hình gửi email. Nếu không gửi, sinh viên tự đặt mật khẩu bằng \"Quên mật khẩu\".",
  password: "Mật khẩu ban đầu chung (không khuyến khích)",
  passwordHint: "Để trống thì tài khoản chưa có mật khẩu. Cột \"Mật khẩu\" trong tệp (nếu có) được ưu tiên.",
  check: "Kiểm tra",
  run: "Nhập vào hệ thống",
  noFile: "Hãy chọn tệp Excel (.xlsx).",
  summary: (r: ImportResult) => `${r.valid}/${r.total} dòng hợp lệ · thêm mới ${r.create} · cập nhật ${r.update}`,
  allValid: "Tệp hợp lệ, có thể nhập.",
  hasErrors: "Còn dòng lỗi, chưa thể nhập. Sửa tệp rồi kiểm tra lại.",
  perClass: "Sinh viên theo lớp",
  done: (c: number, u: number) => `Đã thêm ${c} sinh viên, cập nhật ${u}`,
  invites: (n: number) => `Đang gửi ${n} email mời`,
  rowError: (n: number) => `Dòng ${n}:`,
};

export function ImportStudentsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"create" | "update">("create");
  const [invite, setInvite] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [checkedOk, setCheckedOk] = useState(false);

  const reset = () => {
    setResult(null);
    setCheckedOk(false);
    setMsg(null);
  };

  function handleClose() {
    setFile(null);
    setPassword("");
    setInvite(false);
    reset();
    onClose();
  }

  const run = useMutation({
    mutationFn: (dry: boolean) => {
      if (!file) throw new Error(t.noFile);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      fd.append("dry_run", dry ? "1" : "0");
      if (invite) fd.append("send_invite", "1");
      if (password) fd.append("default_password", password);
      return api.post<ImportResult>("/admin/users/import", fd);
    },
    onSuccess: (r, dry) => {
      setResult(r);
      if (dry) {
        setMsg(null);
        setCheckedOk(r.row_errors.length === 0);
        return;
      }
      toast.success(t.done(r.created ?? 0, r.updated ?? 0), r.invites ? t.invites(r.invites) : undefined);
      void qc.invalidateQueries({ queryKey: usersKey });
      handleClose();
    },
    onError: (e) => {
      setCheckedOk(false);
      setMsg(isApiError(e) ? e.message : e instanceof Error ? e.message : "Không nhập được.");
    },
  });

  const link = "font-medium text-primary underline underline-offset-2";
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t.title}
      description={t.hint}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Hủy</Button>
          <Button variant="outline" disabled={!file} loading={run.isPending && run.variables === true} onClick={() => run.mutate(true)}>{t.check}</Button>
          <Button disabled={!file || !checkedOk} loading={run.isPending && run.variables === false} onClick={() => run.mutate(false)}>{t.run}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {msg && <Alert tone="danger">{msg}</Alert>}
        <p className="text-sm text-muted"><a href="/bff/admin/users/import-template" download className={link}>{t.template}</a></p>
        <FileDropzone accept=".xlsx" maxBytes={5 * 1024 * 1024} label={t.title} className="min-h-24" onReject={(m) => setMsg(m)} onFile={(f) => { setFile(f); reset(); }}>
          {({ dragging }) => (
            <span className="flex min-h-24 flex-col items-center justify-center gap-1 px-4 py-4 text-center">
              <span className="text-sm font-medium">{dragging ? "Thả tệp để nạp" : file ? t.chosen(file.name) : t.drop}</span>
              <span className="text-xs text-muted">hoặc <span className="font-medium text-primary underline underline-offset-2">{t.pick}</span> · .xlsx, tối đa 5 MB</span>
            </span>
          )}
        </FileDropzone>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.mode}>
            <Select value={mode} onChange={(e) => { setMode(e.target.value as "create" | "update"); reset(); }}>
              <option value="create">{t.modeCreate}</option>
              <option value="update">{t.modeUpdate}</option>
            </Select>
          </Field>
          <Field label={t.password} hint={t.passwordHint}>
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); reset(); }} />
          </Field>
        </div>
        <div>
          <Checkbox checked={invite} onChange={(e) => setInvite(e.target.checked)} label={t.invite} />
          <p className="mt-1 ml-6.5 text-xs text-muted">{t.inviteHint}</p>
        </div>

        {result && (
          <div className="space-y-3">
            <Alert tone={result.row_errors.length ? "danger" : "success"}>
              {t.summary(result)}. {result.row_errors.length ? t.hasErrors : t.allValid}
            </Alert>
            {Object.keys(result.by_class).length > 0 && (
              <div>
                <p className="mb-1 text-sm font-semibold">{t.perClass}</p>
                <ul className="flex flex-wrap gap-2">
                  {Object.entries(result.by_class).map(([c, n]) => <li key={c} className="rounded-full border border-border px-3 py-1 text-sm">{c}: <span className="font-semibold tabular-nums">{n}</span></li>)}
                </ul>
              </div>
            )}
            {result.row_errors.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-3 text-sm">
                {result.row_errors.map((e) => <li key={e.row}><span className="font-medium">{t.rowError(e.row)}</span> {e.message}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
