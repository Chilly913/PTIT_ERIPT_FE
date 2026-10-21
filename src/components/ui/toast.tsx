"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/messages";
import { CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from "@/components/icons";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}
interface ToastApi {
  toast: (t: { tone?: ToastTone; title: string; description?: string; duration?: number }) => number;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used inside <ToastProvider>");
  return c;
}

const icons = { success: CheckCircleIcon, error: XCircleIcon, info: InfoIcon };
const tones = { success: "text-success", error: "text-danger", info: "text-info" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastApi["toast"]>(
    ({ tone = "info", title, description, duration = 5000 }) => {
      const id = ++seq.current;
      setItems((l) => [...l.slice(-4), { id, tone, title, description }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ tone: "success", title, description }),
      error: (title, description) => toast({ tone: "error", title, description, duration: 8000 }),
      info: (title, description) => toast({ tone: "info", title, description }),
    }),
    [toast, dismiss],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" role="region" aria-label="Thông báo" className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex items-start gap-3 rounded-lg border border-(--toast-border) bg-(--toast-bg) p-3 shadow-(--toast-shadow) animate-[toast-in_0.2s_ease-out]">
              <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", tones[t.tone])} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                {t.description && <p className="text-sm text-muted">{t.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label={messages.common.close} className="rounded p-1 text-muted hover:bg-surface-muted">
                <XIcon className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}