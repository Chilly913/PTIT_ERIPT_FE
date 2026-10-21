import type { Metadata } from "next";
import { MyLearning } from "@/features/site/my-learning";
import { siteMessages as t } from "@/features/site/messages";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: t.my.metaTitle, robots: { index: false } };

export default async function MyPage() {
  const user = await requireUser("/my");
  return <MyLearning name={user.name} />;
}
