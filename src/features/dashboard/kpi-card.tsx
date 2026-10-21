import { Card } from "@/components/ui";
import { fmtNumber } from "./format";

export function KpiCard({ label, value, sub, icon }: { label: string; value: number; sub: string; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 text-muted">
        <p className="text-sm font-medium">{label}</p>
        <span aria-hidden className="[&_svg]:size-4">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{fmtNumber(value)}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Card>
  );
}
