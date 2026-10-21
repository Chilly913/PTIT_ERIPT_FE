"use client";

import { useId, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { chartColors } from "./chart-colors";
import { fmtDay, fmtFullDay, fmtNumber } from "./format";
import { dashboardMessages as t } from "./messages";
import type { DayCount } from "./types";

function ChartTooltip({ active, payload, label, seriesName }: Partial<TooltipContentProps<ValueType, NameType>> & { seriesName: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{fmtFullDay(String(label))}</p>
      <p className="text-muted">
        {seriesName}: <span className="font-semibold text-foreground">{fmtNumber(Number(payload[0].value))}</span>
      </p>
    </div>
  );
}

/** 30-day solid line or bar chart with a visually hidden data table as text alternative. */
export function TimeSeriesChart({
  title,
  description,
  seriesName,
  data,
  kind,
  color,
}: {
  title: string;
  description: string;
  seriesName: string;
  data: DayCount[];
  kind: "line" | "bar";
  color: string;
}) {
  const uid = useId();
  const summary = useMemo(() => {
    const total = data.reduce((s, d) => s + d.count, 0);
    const peak = data.reduce((p, d) => (d.count > p.count ? d : p), data[0] ?? { date: "", count: 0 });
    return { total, peak };
  }, [data]);
  const empty = summary.total === 0;
  const summaryId = `${uid}-sum`;

  const step = Math.max(1, Math.ceil(summary.peak.count / 4));
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const axis = { stroke: chartColors.axis, tick: { fill: chartColors.axis, fontSize: 12 }, tickLine: false } as const;
  const common = { data, margin: { top: 8, right: 8, bottom: 0, left: 0 } };
  const grid = <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="3 3" />;
  const xAxis = <XAxis dataKey="date" {...axis} tickFormatter={fmtDay} minTickGap={18} interval="preserveStartEnd" />;
  const yAxis = (
    <YAxis {...axis} allowDecimals={false} width={36} domain={[0, ticks[4]]} ticks={ticks} tickFormatter={(v: number) => fmtNumber(v)} axisLine={false} />
  );
  const tooltip = (
    <Tooltip
      content={(p) => <ChartTooltip {...p} seriesName={seriesName} />}
      cursor={{ stroke: chartColors.axis, strokeDasharray: "3 3", fill: chartColors.cursor }}
      isAnimationActive={false}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p id={summaryId} className="sr-only">
          {empty ? t.chartNoData : t.chartSummary(seriesName, fmtNumber(summary.total), fmtNumber(summary.peak.count), fmtFullDay(summary.peak.date))}
        </p>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{fmtNumber(summary.total)}</span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <span aria-hidden className="inline-block h-0.5 w-4" style={{ background: color }} />
            {seriesName}
          </span>
        </div>
        <div className="h-56 w-full" role="img" aria-labelledby={summaryId}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {kind === "line" ? (
              <LineChart {...common}>
                {grid}
                {xAxis}
                {yAxis}
                {tooltip}
                <Line
                  type="monotone"
                  dataKey="count"
                  name={seriesName}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: color, stroke: color }}
                  activeDot={{ r: 5, fill: color, stroke: chartColors.surface, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <BarChart {...common}>
                {grid}
                {xAxis}
                {yAxis}
                {tooltip}
                <Bar dataKey="count" name={seriesName} fill={color} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <table className="sr-only">
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{t.chartTable.date}</th>
              <th scope="col">{seriesName}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <th scope="row">{fmtFullDay(d.date)}</th>
                <td>{fmtNumber(d.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
