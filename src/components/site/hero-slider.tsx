"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { PlayIcon } from "@/components/icons/icons-learn";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface Slide {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  text?: string;
  href: string;
  cta: string;
}

const INTERVAL = 6500;

/**
 * Full-width hero carousel. Autoplays (not with reduced motion), pauses on hover, focus and when the tab is hidden,
 * has previous/next buttons, dots, a pause button, arrow keys and swipe.
 */
export function HeroSlider({ slides, label }: { slides: Slide[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduced, setReduced] = useState(true); // assume reduced until the media query says otherwise: no flash of motion
  const touch = useRef<number | null>(null);
  const root = useRef<HTMLElement>(null);
  const n = slides.length;

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);
  const playing = !reduced && !userPaused && !hover && n > 1;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % n);
    }, INTERVAL);
    return () => window.clearInterval(id);
  }, [playing, n]);

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label={label}
      className="relative isolate overflow-hidden bg-surface-muted"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) setHover(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
      onTouchStart={(e) => {
        touch.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className={cn("flex", !reduced && "transition-transform duration-500 ease-out")} style={{ transform: `translateX(-${index * 100}%)` }} aria-live={playing ? "off" : "polite"}>
        {slides.map((s, i) => (
          <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${n}`} aria-hidden={i !== index} className="relative min-w-full">
            <div className="relative h-[27rem] md:h-[33rem]">
              <Image src={s.image} alt="" fill priority={i === 0} sizes="100vw" className="object-cover object-center" />
              <div className="absolute inset-0" style={{ background: "var(--p-alpha-overlay-dark)" }} />
              <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col justify-center px-4 pb-14 text-primary-foreground sm:px-6 md:px-16">
                <p className="w-fit rounded-full border border-primary-foreground/40 px-3 py-1 text-xs font-semibold tracking-wide uppercase">{s.eyebrow}</p>
                <h2 className="mt-4 max-w-3xl text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">{s.title}</h2>
                {s.text && <p className="mt-4 line-clamp-3 max-w-2xl text-base text-balance opacity-90 md:text-lg">{s.text}</p>}
                <div className="mt-6">
                  <Link href={s.href} tabIndex={i === index ? 0 : -1} className={buttonStyles({ size: "lg", variant: "secondary" })}>{s.cta}</Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label="Slide trước" className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted md:flex">
            <ChevronLeftIcon size={20} />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Slide sau" className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted md:flex">
            <ChevronRightIcon size={20} />
          </button>
          <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2" role="group" aria-label="Chọn slide">
              {slides.map((s, i) => (
                <button key={s.id} type="button" onClick={() => go(i)} aria-label={`Slide ${i + 1}`} aria-current={i === index} className={cn("h-2 rounded-full transition-all", i === index ? "w-8 bg-primary-foreground" : "w-2 bg-primary-foreground/50 hover:bg-primary-foreground/80")} />
              ))}
            </div>
            {!reduced && (
              <button type="button" onClick={() => setUserPaused((p) => !p)} aria-label={userPaused ? "Tiếp tục tự chuyển slide" : "Tạm dừng tự chuyển slide"} aria-pressed={userPaused} className="flex size-7 items-center justify-center rounded-full border border-primary-foreground/60 text-primary-foreground hover:bg-primary-foreground/15">
                {userPaused ? (
                  <PlayIcon size={12} />
                ) : (
                  <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" aria-hidden>
                    <rect x="2" y="1.5" width="3" height="9" rx="0.5" />
                    <rect x="7" y="1.5" width="3" height="9" rx="0.5" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
