"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPinIcon, PlusIcon } from "@/components/icons";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { isNotReady } from "@/features/courses/api";
import { LoadError, NotReady } from "@/features/courses/parts";
import { fmtDateTime, fromLocalInput } from "@/features/courses/utils";
import { CourseSelect, errText, fieldErrors, PageSkeleton, useQueryParam } from "@/features/studio/common";

export const AttendanceSkeleton = () => <PageSkeleton rows={5} />;

export interface Session {
  id: number; title: string | null; course_id: number | null; course_title: string | null; section_code: string | null;
  location: string; room: string | null; start_at: string; end_at: string; duration_minutes: number;
  state: "upcoming" | "running" | "ended"; is_active: boolean; qr_enabled: boolean; qr_mode: string;
  qr_rotate_seconds: number; check_in_radius_meters: number; latitude: number | null; longitude: number | null;
  counts?: { present: number; late: number; excused: number; recorded: number };
}
const STATE: Record<Session["state"], [string, BadgeTone]> = { upcoming: ["Sắp diễn ra", "info"], running: ["Đang diễn ra", "success"], ended: ["Đã kết thúc", "neutral"] };
export const StateBadge = ({ s }: { s: Session["state"] }) => {
  const [label, tone] = STATE[s] ?? ["Không rõ", "neutral" as BadgeTone];
  return <Badge tone={tone}>{label}</Badge>;
};

function CreateDialog({ initialCourse, onClose }: { initialCourse: string; onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ course: initialCourse, title: "", location: "", start: "", minutes: "90", radius: "50", lat: "", lng: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, [k]: "" })); };
  const create = useMutation({
    mutationFn: () =>
      api.post<Session>("/instructor/attendance/sessions", {
        course_id: Number(f.course), title: f.title.trim() || null, location: f.location.trim(), start_at: fromLocalInput(f.start), duration_minutes: Number(f.minutes),
        check_in_radius_meters: Number(f.radius) || 15, ...(f.lat && f.lng ? { latitude: Number(f.lat), longitude: Number(f.lng) } : {}),
      }),
    onSuccess: (s) => { toast.success("Đã tạo buổi học"); void qc.invalidateQueries({ queryKey: ["studio", "sessions"] }); router.push(`/studio/attendance/${s.id}`); },
    onError: (e) => { setErr(fieldErrors(e)); toast.error(errText(e)); },
  });
  function submit() {
    const e: Record<string, string> = {};
    if (!f.course) e.course = "Vui lòng chọn khóa học.";
    if (!f.location.trim()) e.location = "Vui lòng nhập địa điểm.";
    if (!f.start) e.start_at = "Vui lòng chọn thời gian bắt đầu.";
    if (!(Number(f.minutes) >= 1)) e.duration_minutes = "Thời lượng tối thiểu 1 phút.";
    setErr(e);
    if (!Object.keys(e).length) create.mutate();
  }
  return (
    <Dialog open onClose={onClose} title="Tạo buổi học trực tiếp" footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><Button loading={create.isPending} onClick={submit}>Tạo buổi học</Button></>}>
      <div className="space-y-3">
        <Field label="Khóa học" required error={err.course ?? err.course_id}><CourseSelect value={f.course} onChange={(v) => set("course", v)} /></Field>
        <Field label="Tiêu đề"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Buổi 1" /></Field>
        <Field label="Địa điểm" required error={err.location}><Input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="A2-101" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bắt đầu" required error={err.start_at}><DateTimePicker value={f.start} onChange={(v) => set("start", v)} /></Field>
          <Field label="Thời lượng (phút)" error={err.duration_minutes}><Input value={f.minutes} inputMode="numeric" onChange={(e) => set("minutes", e.target.value.replace(/\D/g, ""))} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Vĩ độ" error={err.latitude}><Input value={f.lat} inputMode="decimal" onChange={(e) => set("lat", e.target.value.replace(/[^\d.\-]/g, ""))} /></Field>
          <Field label="Kinh độ"><Input value={f.lng} inputMode="decimal" onChange={(e) => set("lng", e.target.value.replace(/[^\d.\-]/g, ""))} /></Field>
          <Field label="Bán kính (m)" error={err.check_in_radius_meters}><Input value={f.radius} inputMode="numeric" onChange={(e) => set("radius", e.target.value.replace(/\D/g, ""))} /></Field>
        </div>
        <p className="text-sm text-muted">Để trống vĩ độ/kinh độ nếu không yêu cầu kiểm tra vị trí.</p>
      </div>
    </Dialog>
  );
}

export function AttendancePage() {
  const [course, setCourse] = useQueryParam("course");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: ["studio", "sessions", course, page],
    queryFn: () => api.get<Paginated<Session>>("/instructor/attendance/sessions", { query: { course_id: course || undefined, page, per_page: 12 } }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
  return (
    <>
      <PageHeader title="Điểm danh" description="Tạo buổi học trực tiếp, hiển thị mã QR và theo dõi chuyên cần." actions={<Button onClick={() => setCreating(true)}><PlusIcon className="size-4" aria-hidden /> Tạo buổi học</Button>} />
      <Card>
        <div className="p-4"><CourseSelect value={course} onChange={(v) => { setCourse(v); setPage(1); }} placeholder="Tất cả khóa học" className="w-full sm:w-72" /></div>
        <div className="border-t border-border">
          {list.isPending ? (
            <div className="divide-y divide-border" aria-hidden>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-5 w-20" /></div>)}</div>
          ) : list.isError ? (
            isNotReady(list.error) ? <NotReady /> : <LoadError onRetry={() => void list.refetch()} />
          ) : list.data.data.length === 0 ? (
            <EmptyState icon={<MapPinIcon />} title="Chưa có buổi học" description="Tạo buổi học trực tiếp để bắt đầu điểm danh bằng mã QR." action={<Button onClick={() => setCreating(true)}><PlusIcon className="size-4" aria-hidden /> Tạo buổi học</Button>} />
          ) : (
            <ul className={`divide-y divide-border transition-opacity ${list.isFetching ? "opacity-70" : ""}`}>
              {list.data.data.map((s) => (
                <li key={s.id}>
                  <Link href={`/studio/attendance/${s.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-surface-subtle">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate font-medium">{s.title || `Buổi học #${s.id}`}</p>
                      <p className="truncate text-sm text-muted">{s.course_title ?? s.section_code} · {s.location}{s.room ? ` · ${s.room}` : ""}</p>
                    </div>
                    <span className="text-sm text-muted">{fmtDateTime(s.start_at)}</span>
                    {s.counts && <span className="hidden text-sm tabular-nums text-muted sm:block">{s.counts.present + s.counts.late} có mặt</span>}
                    <StateBadge s={s.state} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </Card>
      {creating && <CreateDialog initialCourse={course} onClose={() => setCreating(false)} />}
    </>
  );
}
