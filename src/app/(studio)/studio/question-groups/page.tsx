import { Suspense } from "react";
import { GroupsPage, GroupsSkeleton } from "@/features/qbank/groups-page";

export default function Page() {
  return (
    <Suspense fallback={<GroupsSkeleton />}>
      <GroupsPage />
    </Suspense>
  );
}
