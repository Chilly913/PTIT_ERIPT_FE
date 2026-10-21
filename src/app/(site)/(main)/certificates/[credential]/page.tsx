import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonStyles } from "@/components/ui/button";
import { PrintButton } from "@/features/certificates/print-button";
import { formatDate } from "@/features/site/format";
import { serverApi } from "@/lib/server-api";

interface Certificate {
  credential_id: string;
  issued_at: string;
  user: { name: string };
  course: { title: string; slug: string; instructor: string | null } | null;
}

export const metadata: Metadata = { title: "Chứng chỉ hoàn thành khóa học", robots: { index: false } };

export default async function CertificatePage({ params }: { params: Promise<{ credential: string }> }) {
  const { credential } = await params;
  const r = await serverApi<{ certificate: Certificate }>(`/certificates/${encodeURIComponent(credential)}`);
  if (!r.ok || !r.data) notFound();
  const c = r.data.certificate;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Print only the certificate: hide the site chrome. */}
      <style>{`@media print { header, footer, nav, .no-print { display: none !important; } @page { size: A4 landscape; margin: 12mm; } }`}</style>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Mã xác thực: <span className="font-mono font-medium text-foreground">{c.credential_id}</span>. Bất kỳ ai có đường dẫn này đều kiểm tra được chứng chỉ.</p>
        <div className="flex gap-2">
          <PrintButton label="In / lưu PDF" />
          <Link href="/my" className={buttonStyles({ variant: "outline" })}>Khóa học của tôi</Link>
        </div>
      </div>
      <article className="rounded-sm border-4 border-double border-primary bg-surface p-10 text-center sm:p-14" aria-label="Chứng chỉ">
        <p className="text-sm font-semibold tracking-[0.3em] text-primary uppercase">Chứng nhận hoàn thành</p>
        <p className="mt-8 text-muted">Chứng nhận rằng</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{c.user.name}</h1>
        <p className="mt-8 text-muted">đã hoàn thành toàn bộ nội dung khóa học</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold">{c.course?.title ?? "Khóa học"}</h2>
        <div className="mt-12 grid gap-6 text-sm sm:grid-cols-3">
          <div><p className="text-muted">Ngày cấp</p><p className="mt-1 font-medium">{formatDate(c.issued_at)}</p></div>
          <div><p className="text-muted">Giảng viên</p><p className="mt-1 font-medium">{c.course?.instructor ?? "—"}</p></div>
          <div><p className="text-muted">Mã xác thực</p><p className="mt-1 font-mono font-medium">{c.credential_id}</p></div>
        </div>
      </article>
    </div>
  );
}
