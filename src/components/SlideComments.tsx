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

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(KEY);
      if (stored === "0") queueMicrotask(() => setOpen(false));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHintOn((v) => !v), 30_000);
    return () => clearInterval(t);
  }, []);

  const persist = (next: boolean) => {
    setOpen(next);
    try {
      sessionStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* noop */
    }
  };

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "BUTTON" || tag === "TEXTAREA") return;
    startX.current = event.clientX;
    startY.current = event.clientY;
    draggingRef.current = true;
    locked.current = null;
    setDragging(true);
    setDx(0);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!draggingRef.current || startX.current == null || startY.current == null) return;
      const mx = event.clientX - startX.current;
      const my = event.clientY - startY.current;
      if (!locked.current) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        locked.current = Math.abs(mx) > Math.abs(my) ? "h" : "v";
      }
      if (locked.current !== "h") return;
      event.preventDefault();
      if (open) setDx(Math.max(0, mx));
      else setDx(Math.min(0, mx));
    },
    [open],
  );

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const distance = dx;
    startX.current = null;
    startY.current = null;
    locked.current = null;
    setDx(0);
    if (open && distance > 64) persist(false);
    if (!open && distance < -64) persist(true);
  }, [dx, open]);

  const shift = open ? dx : `calc(110% + ${dx}px)`;
  const instant = dragging;

  return (
    <>
      <div
        className="absolute inset-x-0 bottom-0 z-20 max-w-lg touch-pan-y"
        style={{
          transform: `translate3d(${typeof shift === "number" ? `${shift}px` : shift}, 0, 0)`,
          transition: instant ? "none" : "transform 0.28s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {open && hintOn && (
          <div className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-full bg-white/15 px-3 py-0.5 text-[10px] font-semibold text-white/70 transition-opacity duration-500">
            ⟶ swipe right to hide comments
          </div>
        )}
        {children}
      </div>

      {!open && (
        <button
          type="button"
          onClick={() => persist(true)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute bottom-28 right-0 z-30 rounded-l-2xl border border-white/15 bg-black/70 px-2 py-5 text-lg backdrop-blur"
          title="Show comments"
        >
          💬
        </button>
      )}
    </>
  );
}
