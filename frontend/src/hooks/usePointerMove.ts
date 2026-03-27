import { useRef, useCallback, useEffect } from "react";

const GRID_ROW_HEIGHT = 44;
const MOVE_THRESHOLD = 4;
const SCROLL_ZONE = 40;
const SCROLL_SPEED = 6;

interface MoveState {
  taskId: string;
  date: string;
  startHour: number;
  duration: number;
  startY: number;
  moved: boolean;
}

function autoScroll(clientY: number, container: HTMLElement | null): void {
  if (!container) return;
  const rect = container.getBoundingClientRect();
  if (clientY < rect.top + SCROLL_ZONE) {
    container.scrollBy({ top: -SCROLL_SPEED });
  } else if (clientY > rect.bottom - SCROLL_ZONE) {
    container.scrollBy({ top: SCROLL_SPEED });
  }
}

export function usePointerMove(
  onMove: (taskId: string, fromDate: string, fromHour: number, toHour: number) => void,
  isSlotFree: (hour: number, excludeTaskId: string) => boolean,
) {
  const stateRef = useRef<MoveState | null>(null);
  const previewElRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const onMoveRef = useRef(onMove);
  const isSlotFreeRef = useRef(isSlotFree);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
  useEffect(() => { isSlotFreeRef.current = isSlotFree; }, [isSlotFree]);

  const calcTargetHour = useCallback((clientY: number): number => {
    const state = stateRef.current;
    if (!state) return 0;

    const deltaPx = clientY - state.startY;
    const deltaSlots = Math.round(deltaPx / GRID_ROW_HEIGHT);
    const raw = state.startHour + deltaSlots;
    return Math.max(0, Math.min(24 - state.duration, raw));
  }, []);

  const canPlace = useCallback((targetHour: number): boolean => {
    const state = stateRef.current;
    if (!state) return false;
    for (let h = targetHour; h < targetHour + state.duration; h++) {
      if (!isSlotFreeRef.current(h, state.taskId)) return false;
    }
    return true;
  }, []);

  const handleMovePointerDown = useCallback((
    e: React.PointerEvent,
    entry: { taskId: string; date: string; hour: number; duration: number },
    entryEl: HTMLElement | null,
  ) => {
    // Don't start move from interactive children
    const target = e.target as HTMLElement;
    if (target.closest("[data-resize-handle]") || target.closest("button") || target.closest("[role='checkbox']")) {
      return;
    }

    stateRef.current = {
      taskId: entry.taskId,
      date: entry.date,
      startHour: entry.hour,
      duration: entry.duration,
      startY: e.clientY,
      moved: false,
    };
    previewElRef.current = entryEl;
    scrollContainerRef.current = entryEl?.parentElement?.parentElement ?? null;

    const onPointerMove = (ev: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;

      if (!state.moved) {
        if (Math.abs(ev.clientY - state.startY) < MOVE_THRESHOLD) return;
        state.moved = true;
        document.body.style.setProperty("user-select", "none");
        document.body.style.setProperty("touch-action", "none");
        if (previewElRef.current) {
          previewElRef.current.style.opacity = "0.7";
          previewElRef.current.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          previewElRef.current.style.zIndex = "10";
          previewElRef.current.style.transition = "none";
          previewElRef.current.style.cursor = "grabbing";
        }
      }

      autoScroll(ev.clientY, scrollContainerRef.current);
      const targetHour = calcTargetHour(ev.clientY);
      if (canPlace(targetHour) && previewElRef.current) {
        previewElRef.current.style.setProperty("--row-start", String(targetHour + 1));
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      const state = stateRef.current;

      if (state && state.moved) {
        const targetHour = calcTargetHour(ev.clientY);
        if (targetHour !== state.startHour && canPlace(targetHour)) {
          onMoveRef.current(state.taskId, state.date, state.startHour, targetHour);
        } else if (previewElRef.current) {
          previewElRef.current.style.setProperty("--row-start", String(state.startHour + 1));
        }
      }

      // Cleanup styles
      if (previewElRef.current) {
        previewElRef.current.style.removeProperty("opacity");
        previewElRef.current.style.removeProperty("box-shadow");
        previewElRef.current.style.removeProperty("z-index");
        previewElRef.current.style.removeProperty("transition");
        previewElRef.current.style.removeProperty("cursor");
      }

      stateRef.current = null;
      previewElRef.current = null;
      scrollContainerRef.current = null;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("touch-action");
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [calcTargetHour, canPlace]);

  return { handleMovePointerDown };
}
