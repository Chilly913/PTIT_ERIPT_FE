"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DownloadIcon, UsersIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonStyles } from "@/components/ui/button";
import { api } from "@/lib/api";
import { LoadError } from "../parts";
import { fmtDate, fmtRelative } from "../utils";

interface Row {
  user_id: number;
  name: string;
  email: string;
  total_lessons: number;
  completed_lessons: number;
  percent: number;
  last_activity: string | null;
  total_assignments: number;
  submitted_assignments: number;
  avg_grade: number | null;
  total_quizzes: number;
  passed_quizzes: number;
  quiz_avg: number | null;
  exam_best: number | null;
  total_sessions: number;
  attended_sessions: number;
  has_certificate: boolean;
  at_risk: boolean;
  class_id: number | null;
  class_code: string | null;
  year_name: string | null;
}

interface Summary {
  students: number;
  avg_percent: number;
  completed: number;
  certificates: number;
  assignment_rate: number;
  attendance_rate: number;
  at_risk: number;
  total_lessons: number;
  total_assignments: number;
  total_quizzes: number;
  total_sessions: number;
  avg_quiz_score: number | null;
  avg_assignment_grade: number | null;
}

interface ClassGroup {
  class_id: number | null;
  code: string;
  name: string;
  summary: Summary;
}

interface Report {
  summary: Summary;
  students: Row[];
  by_class: ClassGroup[];
  filters: { classes: (ComboOption & { count: number })[]; years: (ComboOption & { count: number })[] };
}

const COLS = "md:grid-cols-[minmax(0,1.4fr)_7rem_9rem_6rem_6rem_6rem_6rem_6rem]";
const num = (v: number | null) => (v == null ? "—" : String(Math.round(v * 10) / 10));

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

interface Detail {
  student: { name: string; email: string; student_code: string | null; class: string | null; enrolled_at: string };
  lessons: { id: number; title: string; section: string | null; completed_at: string | null; percent: number; last_at: string | null }[];
  assignments: { id: number; title: string; due_at: string | null; submitted_at: string | null; grade: number | null }[];
  quizzes: { quiz: string; attempts: number; best: number | null; passed: boolean; last_at: string | null }[];
  sessions: { id: number; title: string; start_at: string; status: string | null }[];
}

const attendanceLabel: Record<string, string> = { present: "Có mặt", late: "Đi muộn", excused: "Có phép", absent: "Vắng" };

function StudentDialog({ courseId, userId, name, onClose }: { courseId: number; userId: number; name: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["studio", "report", courseId, "student", userId], queryFn: () => api.get<Detail>(`/courses/${courseId}/report/students/${userId}`) });
  const h = "mb-2 text-sm font-semibold";
  return (
    <Dialog open onClose={onClose} title={name} size="lg" footer={null}>
      {q.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : q.isError ? (
        <LoadError onRetry={() => void q.refetch()} />
      ) : (
        <div className="space-y-5 text-sm">
          <p className="text-muted">{q.data.student.email}{q.data.student.student_code ? ` · ${q.data.student.student_code}` : ""}{q.data.student.class ? ` · Lớp ${q.data.student.class}` : ""} · Vào lớp {fmtDate(q.data.student.enrolled_at)}</p>
          <section>
            <h3 className={h}>Bài học ({q.data.lessons.filter((l) => l.completed_at).length}/{q.data.lessons.length})</h3>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {q.data.lessons.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate">{l.title}{l.section && <span className="text-muted"> · {l.section}</span>}</span>
                  {l.completed_at ? <Badge tone="success">Hoàn thành {fmtDate(l.completed_at)}</Badge> : l.percent > 0 ? <Badge tone="info">{l.percent}%</Badge> : <Badge>Chưa học</Badge>}
                </li>
              ))}
            </ul>
          </section>
          {q.data.assignments.length > 0 && (
            <section>
              <h3 className={h}>Bài tập</h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {q.data.assignments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate">{a.title}{a.due_at && <span className="text-muted"> · hạn {fmtDate(a.due_at)}</span>}</span>
                    {a.submitted_at ? <span className="tabular-nums">{a.grade != null ? `${num(a.grade)} điểm` : "Chờ chấm"}</span> : <Badge tone="warning">Chưa nộp</Badge>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {q.data.quizzes.length > 0 && (
            <section>
              <h3 className={h}>Bài kiểm tra nhanh</h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {q.data.quizzes.map((z, i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate">{z.quiz}</span>
                    <span className="text-muted">{z.attempts} lượt</span>
                    {z.attempts > 0 ? <span className="tabular-nums">{num(z.best)}</span> : null}
                    {z.attempts === 0 ? <Badge>Chưa làm</Badge> : <Badge tone={z.passed ? "success" : "warning"}>{z.passed ? "Đạt" : "Chưa đạt"}</Badge>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {q.data.sessions.length > 0 && (
            <section>
              <h3 className={h}>Điểm danh</h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {q.data.sessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate">{s.title}<span className="text-muted"> · {fmtDate(s.start_at)}</span></span>
                    <Badge tone={s.status === "present" || s.status === "late" || s.status === "excused" ? "success" : "warning"}>{attendanceLabel[s.status ?? "absent"] ?? s.status}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}

export function ReportTab({ courseId }: { courseId: number }) {
  const sp = useSearchParams();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [classes, setClasses] = useState<string[]>(() => (sp.get("class_id") ?? "").split(",").filter(Boolean));
  const [years, setYears] = useState<string[]>([]);
  const [detail, setDetail] = useState<Row | null>(null);

  const query = { class_id: classes.join(",") || undefined, year_id: years.join(",") || undefined };
  const report = useQuery({
    queryKey: ["studio", "report", courseId, query],
    queryFn: () => api.get<Report>(`/courses/${courseId}/report`, { query }),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const exportQs = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]).toString();

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (report.data?.students ?? []).filter((r) => {
      if (term && !`${r.name} ${r.email}`.toLowerCase().includes(term)) return false;
      if (filter === "risk") return r.at_risk;
      if (filter === "done") return r.percent >= 100;
      if (filter === "nosub") return r.total_assignments > r.submitted_assignments;
      return true;
    });
  }, [report.data, q, filter]);

  if (report.isPending) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (report.isError) return <LoadError onRetry={() => void report.refetch()} />;

  const s = report.data.summary;
  const groups = report.data.by_class;
  const classOpts = report.data.filters.classes.map((c) => ({ ...c, hint: `${c.count} sinh viên` }));
  const yearOpts = report.data.filters.years.map((c) => ({ ...c, hint: `${c.count} sinh viên` }));
  const filtering = classes.length > 0 || years.length > 0;

  return (
    <div className={`space-y-5 transition-opacity ${report.isFetching ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <Combobox multiple className="w-full sm:w-72" value={classes} onChange={setClasses} options={classOpts} placeholder="Tất cả lớp" searchPlaceholder="Tìm lớp..." aria-label="Lọc theo lớp" />
        <Combobox multiple className="w-full sm:w-56" value={years} onChange={setYears} options={yearOpts} placeholder="Tất cả năm học" searchPlaceholder="Tìm năm học..." aria-label="Lọc theo năm học" />
        {filtering && <button type="button" className="text-sm text-primary hover:underline" onClick={() => { setClasses([]); setYears([]); }}>Xóa bộ lọc</button>}
        <a href={`/bff/courses/${courseId}/report/export${exportQs ? `?${exportQs}` : ""}`} download className={buttonStyles({ variant: "outline", className: "ml-auto" })}><DownloadIcon className="size-4" aria-hidden /> Xuất Excel</a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Học viên" value={String(s.students)} hint={`${s.completed} đã hoàn thành · ${s.certificates} có chứng chỉ`} />
        <Stat label="Tiến độ trung bình" value={`${s.avg_percent}%`} hint={`${s.total_lessons} bài học`} />
        <Stat label="Tỉ lệ nộp bài tập" value={s.total_assignments ? `${s.assignment_rate}%` : "—"} hint={s.avg_assignment_grade != null ? `Điểm trung bình ${num(s.avg_assignment_grade)}` : `${s.total_assignments} bài tập`} />
        <Stat label="Tỉ lệ có mặt" value={s.total_sessions ? `${s.attendance_rate}%` : "—"} hint={`${s.total_sessions} buổi đã diễn ra`} />
      </div>

      {groups.length > 0 && (
        <section className="rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-4 py-3 font-semibold">Theo lớp</h2>
          <div className="hidden border-b border-(--table-divider) bg-(--table-header-bg) px-4 py-2.5 text-xs font-semibold tracking-wide text-(color:--table-header-fg) uppercase md:grid md:grid-cols-[minmax(0,1.4fr)_6rem_9rem_7rem_7rem_6rem] md:gap-3">
            <span>Lớp</span><span>Sinh viên</span><span>Tiến độ TB</span><span>Hoàn thành</span><span>Nộp bài tập</span><span>Cần chú ý</span>
          </div>
          <ul className="divide-y divide-(--table-divider)">
            {groups.map((g) => (
              <li key={g.class_id ?? "none"}>
                <button type="button" onClick={() => setClasses([g.class_id ? String(g.class_id) : "none"])} className="grid w-full grid-cols-2 items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-(--table-row-hover) md:grid-cols-[minmax(0,1.4fr)_6rem_9rem_7rem_7rem_6rem]" aria-label={`Xem lớp ${g.code}`}>
                  <span className="col-span-2 min-w-0 md:col-span-1"><span className="font-medium">{g.code}</span> <span className="text-muted">{g.name}</span></span>
                  <span className="text-sm tabular-nums">{g.summary.students}</span>
                  <span className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-primary" style={{ width: `${g.summary.avg_percent}%` }} /></span><span className="text-sm tabular-nums">{g.summary.avg_percent}%</span></span>
                  <span className="text-sm tabular-nums">{g.summary.completed}/{g.summary.students}</span>
                  <span className="text-sm tabular-nums">{g.summary.total_assignments ? `${g.summary.assignment_rate}%` : "—"}</span>
                  <span className="text-sm tabular-nums">{g.summary.at_risk > 0 ? <Badge tone="warning">{g.summary.at_risk}</Badge> : "—"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-48 flex-1"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên hoặc email" aria-label="Tìm học viên" /></div>
          <div className="w-52">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Lọc học viên">
              <option value="">Tất cả học viên</option>
              <option value="risk">Cần chú ý ({s.at_risk})</option>
              <option value="done">Đã hoàn thành</option>
              <option value="nosub">Còn bài tập chưa nộp</option>
            </Select>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="border-t border-border"><EmptyState icon={<UsersIcon />} title="Không có học viên nào" description={s.students ? "Thử đổi bộ lọc." : "Thêm học viên ở tab Học viên, hoặc gán khóa học cho lớp ở Lớp quản lý."} /></div>
        ) : (
          <>
            <div className={`hidden border-t border-b border-(--table-divider) bg-(--table-header-bg) px-4 py-2.5 text-xs font-semibold tracking-wide text-(color:--table-header-fg) uppercase md:grid md:gap-3 ${COLS}`}>
              <span>Học viên</span><span>Lớp</span><span>Tiến độ</span><span>Bài tập</span><span>Quiz</span><span>Thi</span><span>Có mặt</span><span>Hoạt động</span>
            </div>
            <ul className="divide-y divide-(--table-divider) border-t border-border md:border-t-0">
              {rows.map((r) => (
                <li key={r.user_id}>
                  <button type="button" onClick={() => setDetail(r)} aria-label={`Chi tiết ${r.name}`} className={`grid w-full grid-cols-2 items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-(--table-row-hover) md:gap-3 ${COLS}`}>
                    <span className="col-span-2 block min-w-0 md:col-span-1">
                      <span className="flex items-center gap-2 font-medium"><span className="truncate">{r.name}</span>{r.at_risk && <Badge tone="warning">Cần chú ý</Badge>}{r.has_certificate && <Badge tone="success">Chứng chỉ</Badge>}</span>
                      <span className="block truncate text-sm text-muted">{r.email}</span>
                    </span>
                    <span className="text-sm">{r.class_code ?? <span className="text-muted">—</span>}</span>
                    <span className="flex items-center gap-2" title={`${r.completed_lessons}/${r.total_lessons} bài học`}>
                      <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={r.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Tiến độ ${r.name}`}>
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${r.percent}%` }} />
                      </span>
                      <span className="text-sm tabular-nums">{r.percent}%</span>
                    </span>
                    <span className="text-sm tabular-nums"><span className="text-muted md:hidden">Bài tập: </span>{r.total_assignments ? `${r.submitted_assignments}/${r.total_assignments}` : "—"}{r.avg_grade != null && <span className="text-muted"> · {num(r.avg_grade)}đ</span>}</span>
                    <span className="text-sm tabular-nums"><span className="text-muted md:hidden">Quiz: </span>{r.total_quizzes ? `${r.passed_quizzes}/${r.total_quizzes}` : "—"}{r.quiz_avg != null && <span className="text-muted"> · {num(r.quiz_avg)}</span>}</span>
                    <span className="text-sm tabular-nums"><span className="text-muted md:hidden">Thi: </span>{num(r.exam_best)}</span>
                    <span className="text-sm tabular-nums"><span className="text-muted md:hidden">Có mặt: </span>{r.total_sessions ? `${r.attended_sessions}/${r.total_sessions}` : "—"}</span>
                    <span className="text-sm text-muted">{r.last_activity ? fmtRelative(r.last_activity) : "Chưa học"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {detail && <StudentDialog courseId={courseId} userId={detail.user_id} name={detail.name} onClose={() => setDetail(null)} />}
    </div>
  );
}
