import { useRef, useCallback, useEffect } from "react";

const HOUR_HEIGHT = 66;
const PX_PER_MINUTE = HOUR_HEIGHT / 60;
const MOVE_THRESHOLD = 4;
const SCROLL_ZONE = 40;
const SCROLL_SPEED = 6;

interface MoveState {
  taskId: string;
  date: string;
  startMinute: number;  // в минутах
  duration: number;     // в минутах
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
  onMove: (taskId: string, fromDate: string, fromStartMinute: number, toStartMinute: number) => void,
  isSlotFree: (startMinute: number, excludeTaskId: string) => boolean,
) {
  const stateRef = useRef<MoveState | null>(null);
  const previewElRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const onMoveRef = useRef(onMove);
  const isSlotFreeRef = useRef(isSlotFree);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
  useEffect(() => { isSlotFreeRef.current = isSlotFree; }, [isSlotFree]);

  const calcTargetMinute = useCallback((clientY: number): number => {
    const state = stateRef.current;
    if (!state) return 0;

    const deltaPx = clientY - state.startY;
    // Снаппим к 10 минутам
    const deltaMinutes = Math.round(deltaPx / PX_PER_MINUTE / 10) * 10;
    const raw = state.startMinute + deltaMinutes;
    return Math.max(0, Math.min(24 * 60 - state.duration, raw));
  }, []);

  const canPlace = useCallback((targetMinute: number): boolean => {
    const state = stateRef.current;
    if (!state) return false;
    // Проверяем свободен ли первый минутный слот начала (грубая проверка)
    return isSlotFreeRef.current(targetMinute, state.taskId);
  }, []);

  const handleMovePointerDown = useCallback((
    e: React.PointerEvent,
    entry: { taskId: string; date: string; startMinute: number; duration: number },
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
      startMinute: entry.startMinute,
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
      const targetMinute = calcTargetMinute(ev.clientY);
      if (canPlace(targetMinute) && previewElRef.current && state) {
        const minuteInHour = targetMinute % 60;
        previewElRef.current.style.top = `${minuteInHour * PX_PER_MINUTE}px`;
        // Обновляем метки времени начала и конца
        const fmtMin = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
        const startEl = previewElRef.current.querySelector("[data-time-start]") as HTMLElement | null;
        if (startEl) startEl.textContent = fmtMin(targetMinute);
        const endEl = previewElRef.current.querySelector("[data-time-end]") as HTMLElement | null;
        if (endEl) endEl.textContent = fmtMin(targetMinute + state.duration);
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      const state = stateRef.current;

      if (state && state.moved) {
        const targetMinute = calcTargetMinute(ev.clientY);
        if (targetMinute !== state.startMinute && canPlace(targetMinute)) {
          onMoveRef.current(state.taskId, state.date, state.startMinute, targetMinute);
        } else if (previewElRef.current) {
          const minuteInHour = state.startMinute % 60;
          previewElRef.current.style.top = `${minuteInHour * PX_PER_MINUTE}px`;
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
  }, [calcTargetMinute, canPlace]);

  return { handleMovePointerDown };
}
