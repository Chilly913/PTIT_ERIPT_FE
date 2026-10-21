"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { buttonStyles } from "@/components/ui/button";
import { ExternalLinkIcon } from "@/components/icons";
import type { ScormPackage } from "@/features/site/types";
import { learnMessages as m } from "./messages";

type Dict = Record<string, string>;

const OK_LESSON_STATUS = new Set(["completed", "passed", "failed", "browsed", "incomplete"]);
const OK_COMPLETION = new Set(["completed", "incomplete"]);
const OK_SUCCESS = new Set(["passed", "failed", "unknown"]);

function clampScore(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, n));
}

/**
 * Minimal SCORM 1.2 / 2004 runtime. The API objects are published on the host window (`API`, `API_1484_11`)
 * so same-origin content finds them by walking `window.parent`; results are sent to
 * `POST /courses/:c/lessons/:l/scorm/track` (debounced on every commit, immediately on finish).
 * Cross-origin content cannot see the API; a `postMessage({type:"scorm-track", ...})` bridge is also accepted.
 */
export function ScormFrame({
  course,
  lessonId,
  pkg,
  onCompleted,
}: {
  course: string;
  lessonId: number;
  pkg: ScormPackage;
  onCompleted: () => void;
}) {
  const data = useRef<Dict>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastErr = useRef("0");
  const doneRef = useRef(false);
  const [status, setStatus] = useState("");
  const entry = pkg.entry_url ?? "";
  const sameOrigin = (() => {
    if (!entry || typeof window === "undefined") return false;
    try {
      return new URL(entry, window.location.href).origin === window.location.origin;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    const v2004 = pkg.version === "2004";
    data.current = v2004
      ? { "cmi.completion_status": "unknown", "cmi.success_status": "unknown", "cmi.suspend_data": "", "cmi.location": "", "cmi.mode": "normal", "cmi.credit": "credit" }
      : { "cmi.core.lesson_status": "not attempted", "cmi.suspend_data": "", "cmi.core.lesson_location": "", "cmi.core.credit": "credit", "cmi.core.entry": "ab-initio", "cmi.launch_data": "" };

    const send = (final: boolean) => {
      const d = data.current;
      const lessonStatus = d["cmi.core.lesson_status"];
      const completion = d["cmi.completion_status"];
      const success = d["cmi.success_status"];
      const body: Record<string, unknown> = { version: v2004 ? "2004" : "1.2" };
      if (lessonStatus && OK_LESSON_STATUS.has(lessonStatus)) body.status = lessonStatus;
      if (completion && OK_COMPLETION.has(completion)) body.completion_status = completion;
      if (success && OK_SUCCESS.has(success)) body.success_status = success;
      const score = clampScore(d["cmi.core.score.raw"] ?? d["cmi.score.raw"]);
      if (score !== undefined) body.score = score;
      const loc = d["cmi.core.lesson_location"] ?? d["cmi.location"];
      if (loc) body.lesson_location = loc;
      if (d["cmi.suspend_data"]) body.suspend_data = d["cmi.suspend_data"];

      const completed = ["completed", "passed"].includes(lessonStatus ?? "") || completion === "completed" || success === "passed";
      if (completed && !doneRef.current) {
        doneRef.current = true;
        onCompleted();
      }
      setStatus(lessonStatus || completion || "");
      const url = `/courses/${course}/lessons/${lessonId}/scorm/track`;
      if (final) {
        try {
          void fetch(`/bff${url}`, { method: "POST", keepalive: true, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } catch { /* best effort */ }
      } else {
        api.post(url, body).catch(() => {});
      }
    };
    const schedule = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => send(false), 1500);
    };

    const get = (el: string) => {
      lastErr.current = "0";
      if (el in data.current) return data.current[el];
      if (el.endsWith("._count")) return "0";
      if (el === "cmi.core._children") return "student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,exit,session_time";
      if (el === "cmi.core.score._children") return "raw,min,max";
      lastErr.current = "0";
      return "";
    };
    const set = (el: string, val: unknown) => {
      lastErr.current = "0";
      data.current[el] = String(val ?? "");
      schedule();
      return "true";
    };
    const base = {
      GetLastError: () => lastErr.current,
      GetErrorString: () => "",
      GetDiagnostic: () => "",
    };
    const w = window as unknown as Record<string, unknown>;
    w.API = {
      LMSInitialize: () => "true",
      LMSFinish: () => { clearTimeout(timer.current); send(false); return "true"; },
      LMSGetValue: get,
      LMSSetValue: set,
      LMSCommit: () => { schedule(); return "true"; },
      LMSGetLastError: base.GetLastError,
      LMSGetErrorString: base.GetErrorString,
      LMSGetDiagnostic: base.GetDiagnostic,
    };
    w.API_1484_11 = {
      Initialize: () => "true",
      Terminate: () => { clearTimeout(timer.current); send(false); return "true"; },
      GetValue: get,
      SetValue: set,
      Commit: () => { schedule(); return "true"; },
      ...base,
    };

    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { type?: string; data?: Dict } | null;
      if (!msg || msg.type !== "scorm-track" || typeof msg.data !== "object" || !msg.data) return;
      for (const [k, val] of Object.entries(msg.data)) data.current[k] = String(val);
      schedule();
    };
    window.addEventListener("message", onMessage);
    const onHide = () => { if (document.visibilityState === "hidden" && timer.current) { clearTimeout(timer.current); send(true); } };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onHide);
      if (timer.current) {
        clearTimeout(timer.current);
        send(true);
      }
      delete w.API;
      delete w.API_1484_11;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, lessonId, pkg.version, pkg.id]);

  if (!entry) {
    return <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border bg-surface-subtle text-muted">{m.scorm.none}</div>;
  }
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <iframe
          src={entry}
          title={pkg.title ?? "SCORM"}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          referrerPolicy="no-referrer"
          className="h-[70dvh] min-h-96 w-full border-0"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{sameOrigin ? m.scorm.note : m.scorm.crossOrigin}{status ? ` (${m.scorm.status}: ${status})` : ""}</span>
        <a href={entry} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "ghost", size: "sm" })}>
          <ExternalLinkIcon size={14} />{m.scorm.open}
        </a>
      </div>
    </div>
  );
}
