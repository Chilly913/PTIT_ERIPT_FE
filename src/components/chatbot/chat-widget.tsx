"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { SendIcon, XIcon, ResetIcon } from "@/components/icons";
import { ChatbotIcon } from "./chatbot-icon";

interface Msg {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const STORAGE_KEY = "eript-chat-v1";
const SUGGESTIONS = [
  "Viện Kinh tế Bưu điện đào tạo những ngành nào?",
  "Làm sao để đăng ký học trên hệ thống?",
  "Liên hệ Viện ở đâu?",
  "Có những khóa học trực tuyến nào?",
];
const GREETING = "Xin chào! Mình là trợ lý ERIPT. Bạn cần tìm hiểu về ngành học, khóa học hay thủ tục của Viện?";

function load(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Msg[]) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => !m.error).slice(-40) : [];
  } catch {
    return [];
  }
}

/** Floating assistant: a round button that opens a chat panel backed by POST /bff/chatbot. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  // Messages render only while the panel is open (client interaction), so reading storage lazily is hydration-safe.
  const [messages, setMessages] = useState<Msg[]>(() => (typeof window === "undefined" ? [] : load()));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.error).slice(-40)));
    } catch {
      /* storage unavailable: keep the chat in memory only */
    }
  }, [messages]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    launcher.current?.focus();
  };

  const send = async (raw: string, history: Msg[] = messages) => {
    const message = raw.trim();
    if (!message || busy) return;
    const next: Msg[] = [...history.filter((m) => !m.error), { role: "user", content: message }];
    setMessages(next);
    setText("");
    setBusy(true);
    try {
      const res = await api.post<{ reply: string }>("/chatbot", {
        message,
        history: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      const why = isApiError(e) ? e.message : "Không gửi được tin nhắn.";
      setMessages([...next, { role: "assistant", content: why, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const idx = messages.lastIndexOf(lastUser);
    void send(lastUser.content, messages.slice(0, idx));
  };

  const clear = () => {
    setMessages([]);
    field.current?.focus();
  };

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="Trợ lý ERIPT"
          onKeyDown={(e) => { if (e.key === "Escape") close(); }}
          className="fixed inset-x-3 bottom-24 z-50 flex max-h-[min(36rem,calc(100dvh-8rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-md sm:inset-x-auto sm:right-6 sm:w-96"
        >
          <header className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary" style={{ ["--chatbot-spark" as string]: "var(--primary)" }}>
              <ChatbotIcon size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Trợ lý ERIPT</p>
              <p className="text-xs opacity-80">Hỏi đáp về Viện Kinh tế Bưu điện</p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={clear} aria-label="Xóa cuộc trò chuyện" title="Xóa cuộc trò chuyện" className="rounded-md p-1.5 hover:bg-primary-hover">
                <ResetIcon className="size-4" aria-hidden />
              </button>
            )}
            <button type="button" onClick={close} aria-label="Đóng trợ lý" className="rounded-md p-1.5 hover:bg-primary-hover">
              <XIcon className="size-4" aria-hidden />
            </button>
          </header>

          <div ref={list} className="flex-1 space-y-3 overflow-y-auto bg-surface-subtle p-4" aria-live="polite" aria-busy={busy}>
            <Bubble role="assistant">{GREETING}</Bubble>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-primary-soft">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                <Bubble role={m.role} error={m.error}>{m.content}</Bubble>
                {m.error && i === messages.length - 1 && (
                  <button type="button" onClick={retry} className="mt-1 text-sm font-medium text-primary hover:underline">Thử lại</button>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-1.5 pl-1" role="status" aria-label="Trợ lý đang trả lời">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="size-2 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded-full bg-muted" style={{ animationDelay: `${d * 0.18}s` }} />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void send(text); }}
            className="flex items-end gap-2 border-t border-border bg-surface p-3"
          >
            <textarea
              ref={field}
              rows={1}
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text); } }}
              placeholder="Nhập câu hỏi của bạn..."
              aria-label="Câu hỏi cho trợ lý"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border border-(--input-border,var(--border-control)) bg-surface px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-primary-soft"
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Gửi" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
              <SendIcon className="size-4" aria-hidden />
            </button>
          </form>
        </section>
      )}

      <button
        ref={launcher}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label={open ? "Đóng trợ lý ERIPT" : "Mở trợ lý ERIPT"}
        className="fixed right-4 bottom-4 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:right-6 sm:bottom-6"
      >
        {open ? <XIcon className="size-6" aria-hidden /> : <ChatbotIcon size={30} />}
      </button>
    </>
  );
}

function Bubble({ role, error, children }: { role: "user" | "assistant"; error?: boolean; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
          mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-surface text-foreground",
          error && "border-danger bg-danger-soft text-danger",
        )}
      >
        {children}
      </p>
    </div>
  );
}
