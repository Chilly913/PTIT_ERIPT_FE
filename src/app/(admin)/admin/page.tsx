import { redirect } from "next/navigation";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { isAdmin } from "@/lib/auth-utils";
import { getCurrentUser } from "@/lib/server-api";

export default async function Page() {
  // Academic managers have no dashboard: send them to the academic structure.
  const user = await getCurrentUser();
  if (user && !isAdmin(user)) redirect("/admin/academic/classes");
  return <DashboardPage />;
}
