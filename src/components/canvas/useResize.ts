import { useCallback, useRef } from "react";

interface ResizeState {
  startX: number;
  startY: number;
  origW: number;
  origH: number;
  aspect: number;
}

/**
 * Custom resize hook with aspect-ratio lock.
 * Hold Shift during resize to unlock aspect ratio.
 * Returns an onPointerDown handler for the resize handle.
 */
export function useResize(opts: {
  onResize: (w: number, h: number) => void;
  onResizeEnd?: (w: number, h: number) => void;
  getInitial: () => { w: number; h: number };
  minW?: number;
  minH?: number;
}) {
  const state = useRef<ResizeState | null>(null);
  const minW = opts.minW ?? 80;
  const minH = opts.minH ?? 60;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const initial = opts.getInitial();
      state.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: initial.w,
        origH: initial.h,
        aspect: initial.w / (initial.h || 1),
      };
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!state.current) return;
        const dx = ev.clientX - state.current.startX;
        let nw = Math.max(minW, state.current.origW + dx);
        let nh: number;

        if (ev.shiftKey) {
          // Unlock aspect ratio
          const dy = ev.clientY - state.current.startY;
          nh = Math.max(minH, state.current.origH + dy);
        } else {
          // Lock aspect ratio
          nh = nw / state.current.aspect;
          if (nh < minH) {
            nh = minH;
            nw = nh * state.current.aspect;
          }
        }
        opts.onResize(nw, nh);
      };

      const onUp = (ev: PointerEvent) => {
        if (state.current) {
          const dx = ev.clientX - state.current.startX;
          let nw = Math.max(minW, state.current.origW + dx);
          let nh: number;
          if (ev.shiftKey) {
            const dy = ev.clientY - state.current.startY;
            nh = Math.max(minH, state.current.origH + dy);
          } else {
            nh = nw / state.current.aspect;
            if (nh < minH) { nh = minH; nw = nh * state.current.aspect; }
          }
          opts.onResizeEnd?.(nw, nh);
        }
        state.current = null;
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [opts, minW, minH]
  );

  return { onPointerDown };
}
