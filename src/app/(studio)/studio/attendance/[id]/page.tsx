import { SessionDetailPage } from "@/features/attendance/session-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionDetailPage sessionId={id} />;
}
