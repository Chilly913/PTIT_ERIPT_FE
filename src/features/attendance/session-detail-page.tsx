"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { UsersIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { LoadError } from "@/features/courses/parts";
import { fmtDateTime } from "@/features/courses/utils";
import { BackLink, errText, useDebounced } from "@/features/studio/common";
import { StateBadge, type Session } from "./attendance-page";

interface QrRes { token: string; payload: string; expires_at: string; ttl_seconds: number; mode: string }
interface RosterRow { user_id: number; name: string; student_code: string | null; email: string; status: "present" | "late" | "absent" | "excused"; recorded: boolean; checked_in_at: string | null; distance_meters: number | null }
const STATUS: Record<string, [string, BadgeTone]> = { present: ["Có mặt", "success"], late: ["Đi muộn", "warning"], excused: ["Có phép", "info"], absent: ["Vắng", "danger"] };

function QrPanel({ session }: { session: Session }) {
  const [qr, setQr] = useState<QrRes | null>(null);
  const [svg, setSvg] = useState("");
  const [left, setLeft] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const qc = useQueryClient();
  const busy = useRef(false);

  const issue = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await api.post<QrRes>(`/instructor/sessions/${session.id}/qr`);
      setQr(r);
      setErr(null);
      setSvg(await QRCode.toString(r.payload, { type: "svg", margin: 1, width: 280 }));
      void qc.invalidateQueries({ queryKey: ["studio", "session", String(session.id)] });
    } catch (e) {
      setErr(errText(e));
      setAuto(false);
    } finally {
      busy.current = false;
    }
  }, [session.id, qc]);

  useEffect(() => {
    if (!qr) return;
    const tick = () => setLeft(Math.max(0, Math.round((new Date(qr.expires_at).getTime() - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [qr]);

  useEffect(() => {
    if (!auto || !qr || qr.mode === "static") return;
    const ms = Math.max(500, new Date(qr.expires_at).getTime() - Date.now() - 3000);
    const id = window.setTimeout(() => void issue(), ms);
    return () => window.clearTimeout(id);
  }, [auto, qr, issue]);

  const disabled = !session.qr_enabled || session.state === "ended";
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-3 font-semibold">Mã QR điểm danh</h2>
      {disabled ? (
        <Alert tone="info">{session.state === "ended" ? "Buổi học đã kết thúc." : "Buổi học này không bật điểm danh bằng QR."}</Alert>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {err && <Alert tone="danger" className="w-full">{err}</Alert>}
          <div className="flex size-72 max-w-full items-center justify-center rounded-lg border border-border bg-surface p-2">
            {svg ? <div className={left === 0 ? "opacity-30" : ""} dangerouslySetInnerHTML={{ __html: svg }} aria-label="Mã QR điểm danh" role="img" /> : <p className="px-6 text-center text-sm text-muted">Nhấn “Tạo mã QR” để hiển thị mã cho sinh viên quét.</p>}
          </div>
          {qr && <p className="max-w-full break-all text-center font-mono text-xs text-muted" aria-label="Mã điểm danh dạng chữ">{qr.payload}</p>}
          {qr && <p className="text-sm text-muted tabular-nums" aria-live="off">{left > 0 ? `Hết hạn sau ${left} giây` : "Mã đã hết hạn"}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => void issue()}>{qr ? "Làm mới mã" : "Tạo mã QR"}</Button>
            {session.qr_mode !== "static" && <Button variant={auto ? "primary" : "outline"} aria-pressed={auto} onClick={() => { setAuto((a) => !a); if (!qr) void issue(); }}>{auto ? "Đang tự đổi mã" : "Tự động đổi mã"}</Button>}
          </div>
        </div>
      )}
    </section>
  );
}

export function SessionDetailPage({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(false);
  const dq = useDebounced(q.trim());

  const s = useQuery({ queryKey: ["studio", "session", sessionId], queryFn: () => api.get<Session>(`/instructor/sessions/${sessionId}`), staleTime: 15_000 });
  const rosterKey = ["studio", "session-roster", sessionId] as const;
  const roster = useQuery({
    queryKey: [...rosterKey, dq, status, page],
    queryFn: () => api.get<Paginated<RosterRow>>(`/instructor/sessions/${sessionId}/attendance`, { query: { q: dq || undefined, status: status || undefined, page, per_page: 20 } }),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
  const mark = useMutation({
    mutationFn: (v: { user: number; status: string }) => api.put(`/instructor/sessions/${sessionId}/attendance/${v.user}`, { status: v.status }),
    onMutate: (v) => {
      const snap = qc.getQueriesData<Paginated<RosterRow>>({ queryKey: rosterKey });
      qc.setQueriesData<Paginated<RosterRow>>({ queryKey: rosterKey }, (l) => (l ? { ...l, data: l.data.map((r) => (r.user_id === v.user ? { ...r, status: v.status as RosterRow["status"], recorded: true } : r)) } : l));
      return { snap };
    },
    onError: (e, _v, ctx) => { ctx?.snap.forEach(([k, d]) => qc.setQueryData(k, d)); toast.error(errText(e)); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: rosterKey }); void qc.invalidateQueries({ queryKey: ["studio", "session", sessionId] }); },
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/instructor/sessions/${sessionId}`),
    onSuccess: () => { toast.success("Đã xóa buổi học"); void qc.invalidateQueries({ queryKey: ["studio", "sessions"] }); router.replace("/studio/attendance"); },
    onError: (e) => toast.error(errText(e)),
  });

  if (s.isPending) return <div aria-hidden><Skeleton className="h-4 w-32" /><Skeleton className="mt-4 h-8 w-72" /><div className="mt-6 grid gap-4 lg:grid-cols-[22rem_1fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
  if (s.isError || !s.data) return <LoadError onRetry={() => void s.refetch()} />;
  const ses = s.data;

  return (
    <div>
      <BackLink href="/studio/attendance">Điểm danh</BackLink>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight"><span className="truncate">{ses.title || `Buổi học #${ses.id}`}</span><StateBadge s={ses.state} /></h1>
          <p className="mt-1 text-muted">{ses.course_title ?? ses.section_code} · {ses.location}{ses.room ? ` · ${ses.room}` : ""} · {fmtDateTime(ses.start_at)} ({ses.duration_minutes} phút)</p>
        </div>
        <Button variant="outline" onClick={() => setDel(true)}>Xóa buổi học</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <QrPanel session={ses} />
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm sinh viên..." aria-label="Tìm sinh viên" className="min-w-40 flex-1" />
            <div className="w-full sm:w-36">
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Trạng thái">
                <option value="">Mọi trạng thái</option>
                {Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </div>
            {ses.counts && <span className="text-sm text-muted tabular-nums">{ses.counts.present + ses.counts.late} có mặt · {ses.counts.excused} có phép</span>}
          </div>
          {roster.isPending ? (
            <div className="divide-y divide-border border-t border-border" aria-hidden>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex items-center gap-3 px-4 py-3"><Skeleton className="size-7 rounded-full" /><Skeleton className="h-4 w-1/3" /></div>)}</div>
          ) : roster.isError ? (
            <div className="border-t border-border"><LoadError onRetry={() => void roster.refetch()} /></div>
          ) : roster.data.data.length === 0 ? (
            <div className="border-t border-border"><EmptyState icon={<UsersIcon />} title="Chưa có sinh viên" description="Danh sách lấy từ học viên đã ghi danh khóa học." /></div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {roster.data.data.map((r) => (
                <li key={r.user_id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-surface-subtle">
                  <Avatar name={r.name} size="sm" />
                  <div className="min-w-0 flex-1 basis-40"><p className="truncate font-medium">{r.name}</p><p className="truncate text-sm text-muted">{r.student_code ?? r.email}{r.checked_in_at ? ` · ${fmtDateTime(r.checked_in_at)}` : ""}</p></div>
                  <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
                  <div className="w-28">
                    <Select value={r.status} onChange={(e) => mark.mutate({ user: r.user_id, status: e.target.value })} aria-label={`Điểm danh: ${r.name}`} className="h-8">
                      {Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
                    </Select>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination meta={roster.data?.meta} onPageChange={setPage} disabled={roster.isFetching} />
        </section>
      </div>
      <ConfirmDialog open={del} onClose={() => setDel(false)} destructive title="Xóa buổi học?" description="Toàn bộ dữ liệu điểm danh của buổi học này sẽ bị xóa." confirmLabel="Xóa" loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
