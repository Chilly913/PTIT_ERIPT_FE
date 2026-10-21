"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { Alert, Input, Spinner } from "@/components/ui";
import { ImageIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { FileDropzone } from "@/components/file-dropzone";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

/**
 * Image input: drag a file onto the area (or click / paste an image), see the preview in place,
 * replace or remove it. A path / URL can still be typed under "Dùng đường dẫn".
 * `value` is the stored path ("/uploads/..." or any other path/URL).
 */
export function UploadField({
  value,
  onChange,
  label,
  hint = "PNG, JPG, GIF hoặc WebP, tối đa 5 MB.",
  shape = "wide",
  error,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
  shape?: "wide" | "logo";
  /** Server/validation message shown under the field. */
  error?: string | null;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);

  const upload = async (file: File) => {
    setProblem(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{ url: string }>("/uploads", fd);
      setBroken(null);
      onChange(res.url);
    } catch (e) {
      setProblem(isApiError(e) ? (e.errors ? Object.values(e.errors).flat().join(" ") : e.message) : "Không tải ảnh lên được.");
    } finally {
      setBusy(false);
    }
  };

  const hasImage = !!value && broken !== value;
  const height = shape === "logo" ? "h-36" : "h-44";
  const shown = problem ?? error;

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <FileDropzone accept={ACCEPT} maxBytes={MAX_BYTES} disabled={busy} label={`Chọn ảnh cho ${label}`} onFile={(f) => void upload(f)} onReject={setProblem} className={`${height} overflow-hidden`}>
        {({ dragging }) => (
          <>
            {hasImage ? (
              <>
                <Image
                  src={value}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 640px) 36rem, 100vw"
                  onError={() => setBroken(value)}
                  className={shape === "logo" ? "object-contain p-4" : "object-cover"}
                />
                <span className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-foreground/55 text-primary-foreground transition-opacity ${dragging ? "opacity-100" : "opacity-0 hover:opacity-100 focus-within:opacity-100"}`}>
                  <UploadIcon className="size-6" aria-hidden />
                  <span className="text-sm font-medium">{dragging ? "Thả để thay ảnh" : "Kéo thả hoặc bấm để thay ảnh"}</span>
                </span>
              </>
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <span className={`flex size-11 items-center justify-center rounded-full ${dragging ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary-soft-foreground"}`}>
                  {dragging ? <UploadIcon className="size-5" aria-hidden /> : <ImageIcon className="size-5" aria-hidden />}
                </span>
                <span className="text-sm font-medium">{dragging ? "Thả ảnh để tải lên" : "Kéo thả ảnh vào đây"}</span>
                <span className="text-xs text-muted">hoặc <span className="font-medium text-primary underline underline-offset-2">bấm để chọn tệp</span> · {hint}</span>
              </span>
            )}
            {busy && (
              <span className="absolute inset-0 flex items-center justify-center bg-surface/80">
                <Spinner label="Đang tải ảnh lên" />
              </span>
            )}
          </>
        )}
      </FileDropzone>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {value && (
          <button type="button" onClick={() => { setBroken(null); setProblem(null); onChange(""); }} className="inline-flex items-center gap-1 font-medium text-danger hover:underline">
            <TrashIcon className="size-3.5" aria-hidden /> Bỏ ảnh
          </button>
        )}
        <button type="button" onClick={() => setShowUrl((s) => !s)} aria-expanded={showUrl} aria-controls={`${id}-url`} className="font-medium text-primary hover:underline">
          {showUrl ? "Ẩn đường dẫn" : "Dùng đường dẫn / URL"}
        </button>
        {broken === value && value && <span className="text-danger">Không tải được ảnh từ đường dẫn này.</span>}
      </div>
      {showUrl && (
        <div id={`${id}-url`} className="mt-2">
          <Input value={value} onChange={(e) => { setBroken(null); onChange(e.target.value); }} placeholder="https://… hoặc /uploads/…" aria-label={`Đường dẫn ảnh cho ${label}`} />
        </div>
      )}
      {shown && <Alert tone="danger" className="mt-2">{shown}</Alert>}
    </div>
  );
}
