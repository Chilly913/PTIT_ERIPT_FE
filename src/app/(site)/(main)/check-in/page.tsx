import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckIn } from "@/features/attendance/check-in";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Điểm danh bằng mã QR", robots: { index: false } };

export default async function CheckInPage() {
  await requireUser("/check-in");
  return (
    <Suspense>
      <CheckIn />
    </Suspense>
  );
}
