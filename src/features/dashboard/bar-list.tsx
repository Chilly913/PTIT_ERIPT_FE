import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { fmtNumber } from "./format";

export interface BarItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Horizontal bars with direct value labels. A real list, so it is its own text alternative. */
export function BarList({ title, description, items, emptyText }: { title: string; description: string; items: BarItem[]; emptyText: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 || total === 0 ? (
          <p className="py-6 text-center text-muted">{emptyText}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{i.label}</span>
                  <span className="font-semibold tabular-nums">{fmtNumber(i.value)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                  <div className="h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: i.color, minWidth: i.value > 0 ? 6 : 0 }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
