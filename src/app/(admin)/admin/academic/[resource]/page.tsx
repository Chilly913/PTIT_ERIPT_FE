import { notFound } from "next/navigation";
import { AcademicResourcePage } from "@/features/academic/resource-page";
import { RESOURCES } from "@/features/academic/config";

export default async function Page({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!RESOURCES[resource]) notFound();
  // Only the key crosses the server/client boundary: the config holds render functions.
  return <AcademicResourcePage resource={resource} />;
}
