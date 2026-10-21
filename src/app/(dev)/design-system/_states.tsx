"use client";

import { useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "outline", "ghost", "danger"];
const TONES: BadgeTone[] = ["neutral", "primary", "success", "warning", "danger", "info"];
const forced = "outline-2 outline-offset-2 outline-ring";

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Static look of a hover/active state: paints the same component token the real :hover / :active rule uses. */
function Painted({ variant, state }: { variant: ButtonVariant; state: "hover" | "active" }) {
  return (
    <div
      className="inline-flex h-9 items-center justify-center rounded-lg border px-4 font-medium"
      style={{
        background: `var(--btn-${variant}-${state})`,
        color: `var(--btn-${variant}-fg)`,
        borderColor: `var(--btn-${variant}-border)`,
      }}
    >
      {variant}
    </div>
  );
}

export function StatesDemo() {
  const [on, setOn] = useState(true);
  return (
    <div className="space-y-6">
      <section aria-label="Button states" className="space-y-3">
        <h4 className="text-sm font-semibold">Button</h4>
        {VARIANTS.map((v) => (
          <div key={v} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-5">
            <Cell label={`${v} / default`}><Button variant={v}>{v}</Button></Cell>
            <Cell label="hover"><Painted variant={v} state="hover" /></Cell>
            <Cell label="active"><Painted variant={v} state="active" /></Cell>
            <Cell label="focus"><Button variant={v} className={forced}>{v}</Button></Cell>
            <Cell label="disabled"><Button variant={v} disabled>{v}</Button></Cell>
          </div>
        ))}
      </section>

      <section aria-label="Field states" className="space-y-3">
        <h4 className="text-sm font-semibold">Input / Select</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Cell label="default"><Input placeholder="Placeholder" aria-label="default" /></Cell>
          <Cell label="hover"><Input placeholder="Hover" aria-label="hover" style={{ borderColor: "var(--input-border-hover)" }} /></Cell>
          <Cell label="focus"><Input defaultValue="Focused" aria-label="focus" className={forced} /></Cell>
          <Cell label="error"><Input defaultValue="Invalid" invalid aria-label="error" /></Cell>
          <Cell label="disabled"><Input defaultValue="Disabled" disabled aria-label="disabled" /></Cell>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Cell label="select default"><Select aria-label="select"><option>Option A</option></Select></Cell>
          <Cell label="select error"><Select invalid aria-label="select error"><option>Option A</option></Select></Cell>
          <Cell label="select disabled"><Select disabled aria-label="select disabled"><option>Option A</option></Select></Cell>
        </div>
      </section>

      <section aria-label="Toggle states" className="space-y-3">
        <h4 className="text-sm font-semibold">Checkbox / Switch</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Cell label="checkbox off"><Checkbox label="Label" /></Cell>
          <Cell label="checkbox on"><Checkbox label="Label" defaultChecked /></Cell>
          <Cell label="checkbox disabled"><Checkbox label="Label" disabled /></Cell>
          <Cell label="switch (interactive)"><Switch checked={on} onCheckedChange={setOn} aria-label="demo switch" /></Cell>
          <Cell label="switch disabled"><Switch checked={false} onCheckedChange={() => {}} disabled aria-label="demo switch disabled" /></Cell>
        </div>
      </section>

      <section aria-label="Badges" className="space-y-3">
        <h4 className="text-sm font-semibold">Badge</h4>
        <div className="flex flex-wrap gap-2">{TONES.map((t) => <Badge key={t} tone={t}>{t}</Badge>)}</div>
      </section>

      <section aria-label="Table rows" className="space-y-3">
        <h4 className="text-sm font-semibold">Table row (default / hover / selected / stripe)</h4>
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <THead><tr><Th>Name</Th><Th>State</Th></tr></THead>
            <TBody>
              <Tr><Td>Default row</Td><Td><Badge tone="success">active</Badge></Td></Tr>
              <Tr><Td>Hover row (hover me)</Td><Td><Badge tone="warning">pending</Badge></Td></Tr>
              <Tr data-selected="true"><Td>Selected row</Td><Td><Badge tone="primary">selected</Badge></Td></Tr>
              <Tr><Td style={{ background: "var(--table-row-stripe)" }}>Stripe row</Td><Td style={{ background: "var(--table-row-stripe)" }}><Badge tone="danger">locked</Badge></Td></Tr>
            </TBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
