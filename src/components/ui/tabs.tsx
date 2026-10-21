"use client";

import { createContext, useContext, useId, useState } from "react";
import { cn } from "@/lib/cn";

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  base: string;
}
const Ctx = createContext<TabsCtx | null>(null);
const useTabs = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("Tabs parts must be inside <Tabs>");
  return c;
};

/** Controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`). */
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const base = useId().replace(/:/g, "");
  const current = value ?? inner;
  return (
    <Ctx.Provider value={{ value: current, setValue: (v) => { setInner(v); onValueChange?.(v); }, base }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ className, children, label }: { className?: string; children: React.ReactNode; label?: string }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={(e) => {
        const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)'));
        const i = tabs.indexOf(document.activeElement as HTMLElement);
        let n = -1;
        if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") n = 0;
        else if (e.key === "End") n = tabs.length - 1;
        if (n >= 0) {
          e.preventDefault();
          tabs[n].focus();
          tabs[n].click();
        }
      }}
      className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, disabled }: { value: string; children: React.ReactNode; disabled?: boolean }) {
  const { value: cur, setValue, base } = useTabs();
  const active = cur === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${base}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${base}-panel-${value}`}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-50",
        active ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: cur, base } = useTabs();
  if (cur !== value) return null;
  return (
    <div role="tabpanel" id={`${base}-panel-${value}`} aria-labelledby={`${base}-tab-${value}`} tabIndex={0} className={cn("pt-4 outline-none", className)}>
      {children}
    </div>
  );
}