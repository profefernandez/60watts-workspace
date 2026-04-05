import { useCallback, useRef } from "react";

interface DragState {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

/**
 * Custom drag hook using pointer events.
 * Returns an onPointerDown handler to attach to the draggable element.
 * Calls onDrag with (x, y) in pixels during drag, onDragEnd on release.
 */
export function useDrag(opts: {
  onDrag: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  getInitial: () => { x: number; y: number };
}) {
  const dragging = useRef<DragState | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const initial = opts.getInitial();
      dragging.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: initial.x,
        origY: initial.y,
      };
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const dx = ev.clientX - dragging.current.startX;
        const dy = ev.clientY - dragging.current.startY;
        const nx = dragging.current.origX + dx;
        const ny = dragging.current.origY + dy;
        opts.onDrag(nx, ny);
      };

      const onUp = (ev: PointerEvent) => {
        if (dragging.current) {
          const dx = ev.clientX - dragging.current.startX;
          const dy = ev.clientY - dragging.current.startY;
          const nx = dragging.current.origX + dx;
          const ny = dragging.current.origY + dy;
          opts.onDragEnd?.(nx, ny);
        }
        dragging.current = null;
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [opts]
  );

  return { onPointerDown };
}
