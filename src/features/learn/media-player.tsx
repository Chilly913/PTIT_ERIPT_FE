"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { clock } from "@/features/site/format";
import { learnMessages as m } from "./messages";
import { parseVideoSource } from "./embed";

export interface PlayerBridge {
  getTime: () => number;
  seek: (seconds: number) => void;
}

const SAVE_EVERY_MS = 10_000;
const AUTO_COMPLETE_RATIO = 0.9;

interface Props {
  course: string;
  lessonId: number;
  url: string;
  kind: "video" | "audio";
  /** Lesson duration from the catalog (seconds); the element duration wins once known. */
  duration: number;
  initialPosition: number;
  initialWatched: number;
  completed: boolean;
  bridgeRef: React.RefObject<PlayerBridge | null>;
  /** Called once when the 90% rule is reached (the parent flips completion optimistically). */
  onAutoComplete: (watchedSeconds: number) => void;
}

/**
 * HTML5 media with resume + progress saving. Position is saved every ~10 s while playing, on pause/end,
 * when the tab is hidden and on unmount (keepalive request), so a refresh never loses more than a few seconds.
 */
function FilePlayer({ course, lessonId, url, kind, duration, initialPosition, initialWatched, completed, bridgeRef, onAutoComplete }: Props) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const watched = useRef(initialWatched);
  const lastTime = useRef(0);
  const dirty = useRef(false);
  const completedRef = useRef(completed);
  const autoFired = useRef(completed);
  const [error, setError] = useState(false);
  const [resumeAt, setResumeAt] = useState(initialPosition > 5 ? initialPosition : 0);

  useEffect(() => {
    completedRef.current = completed;
    if (completed) autoFired.current = true;
  }, [completed]);

  const body = useCallback((): { progress_percent: number; last_position: number; watched_seconds: number; completed: boolean } => {
    const el = ref.current;
    const dur = el && Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
    const pos = Math.floor(el?.currentTime ?? 0);
    return {
      progress_percent: dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0,
      last_position: pos,
      watched_seconds: Math.floor(watched.current),
      completed: completedRef.current,
    };
  }, [duration]);

  const path = `/courses/${course}/lessons/${lessonId}/progress`;
  const save = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    api.put(path, body()).catch(() => {
      dirty.current = true; // retry on the next tick
    });
  }, [body, path]);

  /** Fire-and-forget save that survives page unload. */
  const flush = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    try {
      void fetch(`/bff${path}`, {
        method: "PUT",
        keepalive: true,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body()),
      });
    } catch {
      /* best effort */
    }
  }, [body, path]);

  useEffect(() => {
    bridgeRef.current = {
      getTime: () => ref.current?.currentTime ?? 0,
      seek: (s) => {
        const el = ref.current;
        if (!el) return;
        el.currentTime = Math.max(0, s);
        void el.play().catch(() => {});
      },
    };
    const interval = window.setInterval(save, SAVE_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
      bridgeRef.current = null;
    };
  }, [bridgeRef, save, flush]);

  const onTimeUpdate = () => {
    const el = ref.current;
    if (!el) return;
    const delta = el.currentTime - lastTime.current;
    if (!el.paused && delta > 0 && delta < 2) watched.current += delta;
    lastTime.current = el.currentTime;
    dirty.current = true;
    const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
    if (!autoFired.current && dur > 0 && watched.current >= dur * AUTO_COMPLETE_RATIO) {
      autoFired.current = true;
      completedRef.current = true;
      onAutoComplete(Math.floor(watched.current));
    }
  };

  const Tag = kind === "audio" ? "audio" : "video";
  return (
    <div className="space-y-2">
      <div className={kind === "video" ? "overflow-hidden rounded-xl bg-black" : ""}>
        <Tag
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={ref as any}
          key={url}
          src={url}
          controls
          preload="metadata"
          playsInline
          onLoadedMetadata={() => {
            const el = ref.current;
            if (!el || !resumeAt) return;
            if (el.duration && resumeAt < el.duration - 5) {
              el.currentTime = resumeAt;
              lastTime.current = resumeAt;
            }
          }}
          onTimeUpdate={onTimeUpdate}
          onPause={() => { save(); }}
          onEnded={() => {
            dirty.current = true;
            save();
          }}
          onError={() => setError(true)}
          className={kind === "video" ? "aspect-video w-full bg-black" : "w-full"}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {m.video.failed}{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium underline">{m.video.openExternal}</a>
        </p>
      )}
      {resumeAt > 0 && !error && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{m.video.resumeAt(clock(resumeAt))}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const el = ref.current;
              if (el) { el.currentTime = 0; void el.play().catch(() => {}); }
              setResumeAt(0);
            }}
          >
            {m.video.startOver}
          </Button>
        </div>
      )}
    </div>
  );
}

export function MediaPlayer(props: Props) {
  const src = parseVideoSource(props.url);
  if (src.kind === "youtube" || src.kind === "vimeo") {
    return (
      <div className="space-y-2">
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={src.embed}
            title="Video bài học"
            loading="lazy"
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="size-full border-0"
          />
        </div>
        <p className="text-sm text-muted">{m.video.embedNote}</p>
      </div>
    );
  }
  if (src.kind === "file") return <FilePlayer {...props} url={src.src} />;
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border bg-surface-subtle text-muted">
      {m.video.noVideo}
    </div>
  );
}
