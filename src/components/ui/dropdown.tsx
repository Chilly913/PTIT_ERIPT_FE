"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface MenuCtx {
  open: boolean;
  setOpen: (o: boolean) => void;
  menuId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}
const Ctx = createContext<MenuCtx | null>(null);
const useMenu = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("Dropdown parts must be inside <Dropdown>");
  return c;
};

/**
 * <Dropdown>
 *   <DropdownTrigger className=...>Open</DropdownTrigger>
 *   <DropdownContent align="end">
 *     <DropdownItem onSelect={...}>Edit</DropdownItem>
 *     <DropdownItem href="/x">Link</DropdownItem>
 *     <DropdownSeparator />
 *     <DropdownItem danger onSelect={...}>Delete</DropdownItem>
 *   </DropdownContent>
 * </Dropdown>
 */
export function Dropdown({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <Ctx.Provider value={{ open, setOpen, menuId, triggerRef }}>
      <div ref={root} className="relative inline-block">{children}</div>
    </Ctx.Provider>
  );
}

export function DropdownTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, menuId, triggerRef } = useMenu();
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownContent({ align = "start", className, children }: { align?: "start" | "end"; className?: string; children: React.ReactNode }) {
  const { open, setOpen, menuId, triggerRef } = useMenu();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === "ArrowDown") (items[(i + 1) % items.length] ?? items[0])?.focus();
      else if (e.key === "ArrowUp") (items[(i - 1 + items.length) % items.length] ?? items[0])?.focus();
      else if (e.key === "Home") items[0]?.focus();
      else if (e.key === "End") items[items.length - 1]?.focus();
      else if (e.key === "Escape" || e.key === "Tab") {
        setOpen(false);
        if (e.key === "Escape") triggerRef.current?.focus();
        return;
      } else return;
      e.preventDefault();
    },
    [setOpen, triggerRef],
  );

  if (!open) return null;
  return (
    <div
      ref={ref}
      id={menuId}
      role="menu"
      onKeyDown={onKeyDown}
      className={cn(
        "absolute z-50 mt-1.5 min-w-48 rounded-lg border border-(--menu-border) bg-(--menu-bg) p-1 shadow-(--menu-shadow) animate-[pop-in_0.1s_ease-out]",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

const itemClass = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-(--menu-item-hover) focus-visible:bg-(--menu-item-hover) aria-disabled:opacity-50";

export function DropdownItem({
  onSelect,
  href,
  danger,
  disabled,
  className,
  children,
}: {
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { setOpen } = useMenu();
  const cls = cn(itemClass, danger && "text-danger", className);
  const close = () => setOpen(false);
  if (href) {
    return (
      <Link href={href} role="menuitem" tabIndex={-1} className={cls} onClick={() => { onSelect?.(); close(); }}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      className={cls}
      onClick={() => {
        if (disabled) return;
        close();
        onSelect?.();
      }}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-1.5 text-xs font-semibold text-muted">{children}</div>;
}