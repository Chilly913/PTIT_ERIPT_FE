import { redirect } from "next/navigation";
import { StudioOverview } from "@/features/studio/overview-page";
import { canTeach } from "@/lib/auth-utils";
import { getCurrentUser } from "@/lib/server-api";

export default async function Page() {
  // Advisors only manage classes: skip the teaching overview.
  const user = await getCurrentUser();
  if (user && !canTeach(user)) redirect("/studio/classes");
  return <StudioOverview />;
}
