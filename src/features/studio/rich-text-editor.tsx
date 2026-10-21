"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { useState } from "react";
import {
  BoldIcon,
  CheckIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  RedoIcon,
  UndoIcon,
  XIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

/** Typography for editor + rendered HTML (no global stylesheet dependency). */
export const RTE_CLASS =
  "leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "code", "pre", "hr"];

/** Strips everything that is not basic formatting; links open in a new tab with noopener. */
export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:)/i,
  });
  const empty = clean.replace(/<p>(<br\s*\/?>)?<\/p>/g, "").trim() === "";
  return empty ? "" : clean;
}

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor selection while clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40",
        active && "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  minHeight = 160,
  invalid,
  label,
}: {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  invalid?: boolean;
  label?: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `${RTE_CLASS} outline-none`,
        "aria-label": label ?? "Soạn thảo nội dung",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: ed }) => onChange(sanitizeHtml(ed.getHTML())),
  });

  const s = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed?.isActive("bold") ?? false,
      italic: ed?.isActive("italic") ?? false,
      h2: ed?.isActive("heading", { level: 2 }) ?? false,
      ul: ed?.isActive("bulletList") ?? false,
      ol: ed?.isActive("orderedList") ?? false,
      quote: ed?.isActive("blockquote") ?? false,
      link: ed?.isActive("link") ?? false,
      canUndo: ed?.can().undo() ?? false,
      canRedo: ed?.can().redo() ?? false,
    }),
  });

  function openLink() {
    if (!editor) return;
    setLinkValue((editor.getAttributes("link").href as string | undefined) ?? "https://");
    setLinkOpen(true);
  }
  function applyLink() {
    if (!editor) return;
    const url = linkValue.trim();
    if (!url || url === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (/^(https?:|mailto:|tel:)/i.test(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkOpen(false);
  }

  return (
    <div className={cn("rounded-lg border bg-(--input-bg) focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-(--input-focus-ring)", invalid ? "border-(--input-error)" : "border-border-control")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1" role="toolbar" aria-label="Định dạng">
        <ToolButton label="In đậm" active={s?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}><BoldIcon className="size-4" /></ToolButton>
        <ToolButton label="In nghiêng" active={s?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}><ItalicIcon className="size-4" /></ToolButton>
        <ToolButton label="Tiêu đề" active={s?.h2} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><HeadingIcon className="size-4" /></ToolButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolButton label="Danh sách" active={s?.ul} onClick={() => editor?.chain().focus().toggleBulletList().run()}><ListIcon className="size-4" /></ToolButton>
        <ToolButton label="Danh sách số" active={s?.ol} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrderedIcon className="size-4" /></ToolButton>
        <ToolButton label="Trích dẫn" active={s?.quote} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><QuoteIcon className="size-4" /></ToolButton>
        <ToolButton label="Chèn liên kết" active={s?.link} onClick={openLink}><LinkIcon className="size-4" /></ToolButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolButton label="Hoàn tác" disabled={!s?.canUndo} onClick={() => editor?.chain().focus().undo().run()}><UndoIcon className="size-4" /></ToolButton>
        <ToolButton label="Làm lại" disabled={!s?.canRedo} onClick={() => editor?.chain().focus().redo().run()}><RedoIcon className="size-4" /></ToolButton>
      </div>
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-2 py-1.5">
          <input
            autoFocus
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                e.stopPropagation();
                setLinkOpen(false);
              }
            }}
            placeholder="https://..."
            aria-label="Đường dẫn liên kết"
            className="h-8 min-w-0 flex-1 rounded-md border border-border-control bg-(--input-bg) px-2 text-sm outline-none focus:outline-2 focus:outline-(--input-focus-ring)"
          />
          <button type="button" onClick={applyLink} aria-label="Áp dụng liên kết" className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary-hover">
            <CheckIcon className="size-4" />
          </button>
          <button type="button" onClick={() => setLinkOpen(false)} aria-label="Hủy" className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-muted">
            <XIcon className="size-4" />
          </button>
        </div>
      )}
      <div className="px-3 py-2.5" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/** Renders sanitised HTML (defence in depth for content that came from the API). */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  return <div className={cn(RTE_CLASS, className)} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
