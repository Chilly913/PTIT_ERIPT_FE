import { Suspense } from "react";
import { BanksPage, BanksSkeleton } from "@/features/qbank/banks-page";

export default function Page() {
  return (
    <Suspense fallback={<BanksSkeleton />}>
      <BanksPage />
    </Suspense>
  );
}
