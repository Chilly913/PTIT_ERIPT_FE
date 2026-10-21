"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/messages";
import { Button } from "./button";
import { XIcon } from "@/components/icons";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Prevent closing via ESC / backdrop (e.g. while submitting). */
  dismissable?: boolean;
}

const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/**
 * Modal built on the native <dialog>: showModal() gives a real focus trap, inert
 * background, ESC handling and focus restore. Content is only mounted while open.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md", dismissable = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissable) onClose();
      }}
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-xl border border-(--dialog-border) bg-(--dialog-bg) p-0 text-foreground shadow-(--dialog-shadow)",
        widths[size],
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
              {description && <p id={descId} className="mt-1 text-muted">{description}</p>}
            </div>
            {dismissable && (
              <Button variant="ghost" size="icon" className="-mt-1 -mr-2 size-8" onClick={onClose} aria-label={messages.common.close}>
                <XIcon className="size-4" aria-hidden />
              </Button>
            )}
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = messages.common.confirm,
  cancelLabel = messages.common.cancel,
  destructive,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissable={!loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    />
  );
}