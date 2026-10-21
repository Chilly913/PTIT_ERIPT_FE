import type { Metadata } from "next";
import { notFound } from "next/navigation";
import tokens from "../../../../design/tokens.json";
import { ICON_NAMES } from "@/components/icons";
import { StatesDemo } from "./_states";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

type Group = Record<string, string>;
const prim = tokens.primitive;
const SEMANTIC = Object.keys(tokens.semantic.light);
const COLOR_SCALES = ["neutral", "indigo", "green", "amber", "red", "sky"] as const;
const TYPE_SCALE = Object.keys(prim.font.size) as Array<keyof typeof prim.font.size>;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatch({ cssVar, name, value }: { cssVar: string; name: string; value?: string }) {
  return (
    <div className="min-w-0">
      <div className="h-10 rounded-md border border-border" style={{ background: `var(${cssVar})` }} />
      <p className="mt-1 truncate text-xs font-medium">{name}</p>
      {value && <p className="truncate text-xs text-muted">{value}</p>}
    </div>
  );
}

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-4 rounded-xl border border-border bg-surface p-5">
      {title && <p className="text-sm font-semibold tracking-wide uppercase">{title}</p>}
      {children}
    </div>
  );
}

function SemanticGrid() {
  const set = tokens.semantic.light as Group;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {SEMANTIC.filter((n) => !n.startsWith("shadow-") && n !== "overlay").map((n) => (
        <Swatch key={n} cssVar={`--${n}`} name={n} value={set[n].replace(/[{}]/g, "")} />
      ))}
    </div>
  );
}

function ChartSample() {
  const bars = [62, 44, 78, 36];
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="relative flex h-40 items-end gap-6 border-b" style={{ borderColor: "var(--chart-axis)" }}>
        {[25, 50, 75].map((p) => (
          <div key={p} className="pointer-events-none absolute inset-x-0 border-t" style={{ bottom: `${p}%`, borderColor: "var(--chart-grid)" }} />
        ))}
        {bars.map((h, i) => (
          <div key={i} className="relative z-10 flex-1 rounded-t-md" style={{ height: `${h}%`, background: `var(--chart-${i + 1})` }} />
        ))}
      </div>
      <div className="mt-2 flex gap-6 text-xs" style={{ color: "var(--chart-axis)" }}>
        {bars.map((_, i) => <span key={i} className="flex-1">Series {i + 1}</span>)}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-4 sm:p-8">
      <header>
        <h1 className="text-3xl font-bold">Design system</h1>
        <p className="mt-1 text-muted">
          primitive, semantic, component. Source: <code>design/tokens.json</code>. Flat colours only: no gradients, no glow blobs, shadows on floating layers only. Dev only (404 in production).
        </p>
      </header>

      <Section title="1. Primitives: colour scales" hint="Raw palette (--p-*). Components never use these directly.">
        <div className="space-y-4">
          {COLOR_SCALES.map((scale) => (
            <div key={scale}>
              <p className="mb-1 text-sm font-medium">{scale}</p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-14">
                {Object.entries(prim.color[scale] as Group).map(([step, hex]) => (
                  <Swatch key={step} cssVar={`--p-${scale}-${step}`} name={step} value={hex} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="2. Primitives: space, radius, shadow, type, z-index, motion">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Spacing (4px grid)</p>
            {Object.entries(prim.space as Group).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-muted">space-{k}</span>
                <div className="h-3 rounded-sm bg-primary" style={{ width: `var(--p-space-${k})`, minWidth: 1 }} />
                <span>{v}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Radius</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(prim.radius as Group).map(([k, v]) => (
                  <div key={k} className="text-center text-xs">
                    <div className="size-14 border border-border-strong bg-surface" style={{ borderRadius: `var(--p-radius-${k})` }} />
                    {k} {k === "full" ? "" : v}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Shadow (floating layers only)</p>
              <div className="flex flex-wrap gap-4">
                {["xs", "sm", "md"].map((k) => (
                  <div key={k} className="grid size-16 place-items-center rounded-lg border border-border bg-surface text-xs" style={{ boxShadow: `var(--p-shadow-${k})` }}>{k}</div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="mb-1 text-sm font-medium">z-index</p>
                {Object.entries(prim.z as Group).map(([k, v]) => <p key={k}><span className="inline-block w-20 text-muted">{k}</span>{v}</p>)}
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Motion / border / weight</p>
                {Object.entries(prim.motion.duration as Group).map(([k, v]) => <p key={k}><span className="inline-block w-20 text-muted">{k}</span>{v}</p>)}
                {Object.entries(prim.motion.ease as Group).map(([k, v]) => <p key={k}><span className="inline-block w-20 text-muted">ease-{k}</span>{v}</p>)}
                {Object.entries(prim.border as Group).map(([k, v]) => <p key={k}><span className="inline-block w-20 text-muted">border-{k}</span>{v}</p>)}
                {Object.entries(prim.font.weight as Group).map(([k, v]) => <p key={k}><span className="inline-block w-20 text-muted">{k}</span>{v}</p>)}
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="3. Type scale" hint="px values, independent of the 14px root. Base body is 14px. Tailwind text-xs..text-4xl map to these.">
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {TYPE_SCALE.map((k) => (
            <div key={k} className="flex items-baseline gap-4 px-4 py-2">
              <span className="w-28 shrink-0 text-xs text-muted">{k}px / {(prim.font.leading as Group)[k]}</span>
              <span style={{ fontSize: `var(--p-font-size-${k})`, lineHeight: `var(--p-font-leading-${k})` }}>Quản lý khoá học và học viên</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="4. Semantic colours (light)" hint="The product is light-only. A dormant dark layer lives in tokens.json (see docs/design-system.md).">
        <Panel><SemanticGrid /></Panel>
      </Section>

      <Section title="5. Component states" hint="hover/active are painted from the same component tokens; the table row and the real controls respond to the pointer.">
        <Panel><StatesDemo /></Panel>
      </Section>

      <Section title="6. Chart colours" hint="Solid fills only. 4 categorical colours checked for deuteranopia/protanopia/tritanopia (npm run tokens:check). Never rely on colour alone: add direct labels or patterns.">
        <Panel>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[1, 2, 3, 4].map((i) => (
              <Swatch key={i} cssVar={`--chart-${i}`} name={`chart-${i}`} value={(tokens.semantic.light as Group)[`chart-${i}`].replace(/[{}]/g, "").replace("color.chart.", "")} />
            ))}
            <Swatch cssVar="--chart-grid" name="chart-grid" />
            <Swatch cssVar="--chart-axis" name="chart-axis" />
          </div>
          <ChartSample />
        </Panel>
      </Section>

      <Section title="7. Icons" hint={`${ICON_NAMES.length} in-house icons: 24px grid, 1.75px stroke, round caps and joins, currentColor. Shown at 16px and 20px. Import from @/components/icons.`}>
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {ICON_NAMES.map(({ name, Icon }) => (
            <li key={name} className="flex flex-col items-center gap-2 bg-surface px-2 py-4 text-foreground">
              <span className="flex items-center gap-4">
                <Icon size={16} />
                <Icon size={20} />
                <Icon size={24} />
              </span>
              <span className="text-xs text-muted">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="8. Motion" hint="100 / 150 / 200ms, ease-out. Opacity and transform only; reduced-motion collapses durations. Hover the tiles, press the button.">
        <Panel>
          <div className="flex flex-wrap items-center gap-6">
            {[["fast", "100ms"], ["base", "150ms"], ["slow", "200ms"]].map(([k, v]) => (
              <div
                key={k}
                className="grid h-16 w-28 place-items-center rounded-lg border border-border bg-surface text-xs transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-soft"
                style={{ transitionDuration: `var(--p-motion-duration-${k})`, transitionTimingFunction: "var(--p-motion-ease-out)" }}
              >
                {k} {v}
              </div>
            ))}
            <div className="h-5 w-28 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded-md bg-border" aria-label="Skeleton" role="img" />
          </div>
        </Panel>
      </Section>
    </div>
  );
}
