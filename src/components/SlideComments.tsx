"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
};

const KEY = "akm:live-comments-open";

export default function SlideComments({ children }: Props) {
  const [open, setOpen] = useState(true);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hintOn, setHintOn] = useState(true);

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const locked = useRef<"h" | "v" | null>(null);
  const dxRef = useRef(0);
  const isEdgeDrag = useRef(false);

  // Restore open/closed state across visits in the same session
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(KEY);
      if (stored === "0") queueMicrotask(() => setOpen(false));
    } catch {
      /* noop */
    }
  }, []);

  // 30-sec blink cycle for the hint
  useEffect(() => {
    const t = setInterval(() => setHintOn((v) => !v), 30_000);
    return () => clearInterval(t);
  }, []);

  const persist = useCallback((next: boolean) => {
    setOpen(next);
    try {
      sessionStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* noop */
    }
  }, []);

  // Pointer down on the comment area: capture pointer so drag tracks smoothly across entire window
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const tag = (event.target as HTMLElement | null)?.tagName;
    // Don't drag when interacting with text inputs, buttons, emojis, or scrollbars
    if (tag === "INPUT" || tag === "BUTTON" || tag === "TEXTAREA") return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* noop */
    }

    startX.current = event.clientX;
    startY.current = event.clientY;
    draggingRef.current = true;
    isEdgeDrag.current = false;
    locked.current = null;
    dxRef.current = 0;
    setDx(0);
    setDragging(true);
  }, []);

  // Pointer down on the right-side swipe catcher when comments are hidden
  const onEdgeDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* noop */
    }

    startX.current = event.clientX;
    startY.current = event.clientY;
    draggingRef.current = true;
    isEdgeDrag.current = true;
    locked.current = "h"; // immediately horizontal
    dxRef.current = 0;
    setDx(0);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!draggingRef.current || startX.current == null || startY.current == null) return;
      const mx = event.clientX - startX.current;
      const my = event.clientY - startY.current;

      // Lock direction: horizontal gesture slides comments, vertical scrolls chat text
      if (!locked.current) {
        if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
        locked.current = Math.abs(mx) >= Math.abs(my) ? "h" : "v";
      }

      if (locked.current !== "h") return;

      // If open: swiping right (positive mx) slides comments away to the right
      // If closed: swiping left from the right edge (negative mx) pulls comments back in
      if (open) {
        const clamped = Math.max(0, mx);
        dxRef.current = clamped;
        setDx(clamped);
      } else {
        const clamped = Math.min(0, mx);
        dxRef.current = clamped;
        setDx(clamped);
      }
    },
    [open],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!draggingRef.current) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* noop */
      }

      draggingRef.current = false;
      setDragging(false);

      const distance = dxRef.current;
      const wasHorizontal = locked.current === "h";

      startX.current = null;
      startY.current = null;
      locked.current = null;
      dxRef.current = 0;
      setDx(0);

      if (wasHorizontal) {
        // Swiped right > 35px -> hide comments
        if (open && distance > 35) {
          persist(false);
        }
        // Swiped left < -35px -> show comments
        if (!open && distance < -35) {
          persist(true);
        }
      }
    },
    [open, persist],
  );

  // Transform:
  // open -> translate3d(dx px, 0, 0)
  // closed -> translate3d(100% + 40px, 0, 0) pushed off screen to the right
  const transform = open
    ? `translate3d(${dx}px, 0, 0)`
    : `translate3d(calc(100% + 40px + ${dx}px), 0, 0)`;

  return (
    <>
      {/* 
        Slide comments overlay:
        - Only takes the bottom half (max-h-[50%]) so the top half of live video is always completely visible
        - Transparent background except text shadow/scrim
        - When closed, it is cleanly translated off-screen to the right
      */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex max-h-[50%] flex-col justify-end max-w-lg touch-pan-y select-none"
        style={{
          transform,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Swipe hint */}
        {open && hintOn && (
          <div className="pointer-events-none mx-3 mb-1.5 self-start rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md shadow-sm transition-opacity duration-500 border border-white/10">
            👉 Swipe right to hide comments
          </div>
        )}

        {/* Chat box with pointer-events enabled for scrolling text & typing */}
        <div className="pointer-events-auto flex flex-col justify-end">
          {children}
        </div>
      </div>

      {/* 
        When comments are hidden:
        1. A floating tab badge on the right edge (tap to show)
        2. An invisible swipe-catcher across the right half of the stage (swipe left to pull comments back)
      */}
      {!open && (
        <>
          <button
            type="button"
            onClick={() => persist(true)}
            className="pointer-events-auto absolute bottom-20 right-0 z-30 flex items-center gap-1.5 rounded-l-full border border-r-0 border-white/20 bg-black/85 px-3.5 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md transition-all active:scale-95 hover:bg-black"
            title="Swipe left or tap to show comments"
            aria-label="Show comments"
          >
            <span className="text-base">💬</span>
            <span className="text-[11px] font-semibold text-white/90">Comments</span>
            <span className="text-[11px] text-fuchsia-300">👈</span>
          </button>

          {/* Swipe catcher: dragging left on the right 40% of the screen brings comments back */}
          <div
            className="pointer-events-auto absolute bottom-0 right-0 top-1/4 z-20 w-44 touch-pan-y"
            title="Swipe left to show comments"
            onPointerDown={onEdgeDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </>
      )}
    </>
  );
}
