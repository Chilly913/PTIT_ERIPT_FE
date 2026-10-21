"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";

interface CheckInResult { status: "present" | "late"; message: string }

type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
const detectorCtor = (): (new (o: { formats: string[] }) => BarcodeDetectorLike) | null =>
  typeof window !== "undefined" ? ((window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector ?? null) : null;

function position(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition((p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => resolve(null), { enableHighAccuracy: true, timeout: 8000 });
  });
}

/** Student screen: scan the QR code shown by the instructor (camera) or type the code, then check in. */
export function CheckIn() {
  const initial = useSearchParams().get("code") ?? "";
  const [code, setCode] = useState(initial);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  // Any browser with a camera can scan: native BarcodeDetector when present, jsQR (pure JS) otherwise.
  // false on the server and during hydration, then the real capability: avoids a server/client mismatch.
  const canScan = useSyncExternalStore(
    () => () => {},
    () => !!navigator.mediaDevices?.getUserMedia,
    () => false,
  );

  const send = useMutation({
    mutationFn: async (payload: string) => {
      const pos = await position();
      return api.post<CheckInResult>("/attendance/check-in", { payload: payload.trim(), ...(pos ?? {}), device_info: navigator.userAgent.slice(0, 200) });
    },
    onError: (e) => setErr(isApiError(e) ? e.message : "Không điểm danh được. Hãy thử lại."),
    onSuccess: () => setErr(null),
  });

  useEffect(() => {
    if (!scanning) return;
    const Ctor = detectorCtor();
    let stop = false;
    let stream: MediaStream | null = null;
    const detector = Ctor ? new Ctor({ formats: ["qr_code"] }) : null;
    const canvas = document.createElement("canvas");
    const read = async (v: HTMLVideoElement): Promise<string | null> => {
      if (detector) return (await detector.detect(v))[0]?.rawValue ?? null;
      if (!v.videoWidth) return null;
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0);
      const { default: jsQR } = await import("jsqr");
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(img.data, img.width, img.height)?.data ?? null;
    };
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        stream = s;
        const v = video.current;
        if (!v) return;
        v.srcObject = s;
        await v.play();
        const tick = async () => {
          if (stop) return;
          try {
            const value = await read(v);
            if (value) {
              setCode(value);
              setScanning(false);
              send.mutate(value);
              return;
            }
          } catch { /* keep scanning */ }
          setTimeout(tick, 300);
        };
        void tick();
      })
      .catch(() => { setErr("Không mở được camera. Hãy cấp quyền camera hoặc nhập mã thủ công."); setScanning(false); });
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const done = send.data;
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Điểm danh bằng mã QR</h1>
      <p className="mt-1 text-muted">Quét mã QR giảng viên đang hiển thị trên màn hình lớp học.</p>

      {done ? (
        <div className="mt-6 space-y-4">
          <Alert tone="success" title={done.status === "late" ? "Đã điểm danh (đi muộn)" : "Điểm danh thành công"}>{done.message}</Alert>
          <Link href="/my" className={buttonStyles({ variant: "outline" })}>Về trang học</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {err && <Alert tone="danger">{err}</Alert>}
          {scanning && <video ref={video} playsInline muted className="aspect-square w-full rounded-xl border border-border bg-surface-muted object-cover" aria-label="Camera quét mã QR" />}
          {canScan && <Button variant={scanning ? "outline" : "primary"} onClick={() => { setErr(null); setScanning((s) => !s); }}>{scanning ? "Dừng quét" : "Quét bằng camera"}</Button>}
          <Field label="Hoặc nhập mã" hint={canScan ? undefined : "Trình duyệt này chưa hỗ trợ quét QR bằng camera, hãy nhập mã hiển thị dưới mã QR."}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="eript-attendance:12:abc..." autoComplete="off" />
          </Field>
          <Button onClick={() => { setErr(null); if (!code.trim()) return setErr("Hãy nhập hoặc quét mã điểm danh."); send.mutate(code); }} loading={send.isPending} disabled={!code.trim()}>Điểm danh</Button>
          <p className="text-sm text-muted">Nếu lớp học yêu cầu vị trí, trình duyệt sẽ hỏi quyền truy cập vị trí khi điểm danh.</p>
        </div>
      )}
    </div>
  );
}
