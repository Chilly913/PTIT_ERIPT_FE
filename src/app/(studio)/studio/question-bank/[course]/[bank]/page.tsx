import { BankDetailPage } from "@/features/qbank/bank-detail-page";

export default async function Page({ params }: { params: Promise<{ course: string; bank: string }> }) {
  const { course, bank } = await params;
  return <BankDetailPage courseId={course} bankId={bank} />;
}
