import { useRef, useCallback, useEffect } from "react";

const GRID_ROW_HEIGHT = 44;
const SCROLL_ZONE = 40;
const SCROLL_SPEED = 6;

interface ResizeState {
  taskId: string;
  date: string;
  hour: number;
  startY: number;
  startDuration: number;
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

export function usePointerResize(
  onResize: (taskId: string, date: string, hour: number, newDuration: number) => void,
  isSlotFree: (hour: number, excludeTaskId: string) => boolean,
) {
  const stateRef = useRef<ResizeState | null>(null);
  const previewElRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const onResizeRef = useRef(onResize);
  const isSlotFreeRef = useRef(isSlotFree);
  useEffect(() => { onResizeRef.current = onResize; }, [onResize]);
  useEffect(() => { isSlotFreeRef.current = isSlotFree; }, [isSlotFree]);

  const calcDuration = useCallback((clientY: number): number => {
    const state = stateRef.current;
    if (!state) return 1;

    const deltaPx = clientY - state.startY;
    const deltaSlots = Math.round(deltaPx / GRID_ROW_HEIGHT);
    const raw = state.startDuration + deltaSlots;
    const clamped = Math.max(1, Math.min(24 - state.hour, raw));

    let newDuration = clamped;
    if (newDuration > state.startDuration) {
      for (let h = state.hour + state.startDuration; h < state.hour + newDuration; h++) {
        if (!isSlotFreeRef.current(h, state.taskId)) {
          newDuration = h - state.hour;
          break;
        }
      }
    }
    return Math.max(1, newDuration);
  }, []);

  const handleResizePointerDown = useCallback((
    e: React.PointerEvent,
    entry: { taskId: string; date: string; hour: number; duration: number },
    entryEl: HTMLElement | null,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    stateRef.current = {
      taskId: entry.taskId,
      date: entry.date,
      hour: entry.hour,
      startY: e.clientY,
      startDuration: entry.duration,
    };
    previewElRef.current = entryEl;
    scrollContainerRef.current = entryEl?.closest(`.${CSS.escape("calendar")}`) as HTMLElement | null
      ?? entryEl?.parentElement?.parentElement ?? null;

    document.body.style.setProperty("user-select", "none");
    document.body.style.setProperty("touch-action", "none");

    const onMove = (ev: PointerEvent) => {
      autoScroll(ev.clientY, scrollContainerRef.current);
      const dur = calcDuration(ev.clientY);
      if (previewElRef.current) {
        previewElRef.current.style.setProperty("--row-span", String(dur));
      }
    };

    const onUp = (ev: PointerEvent) => {
      const state = stateRef.current;
      if (state) {
        const newDuration = calcDuration(ev.clientY);
        if (newDuration !== state.startDuration) {
          onResizeRef.current(state.taskId, state.date, state.hour, newDuration);
        } else if (previewElRef.current) {
          previewElRef.current.style.setProperty("--row-span", String(state.startDuration));
        }
      }

      stateRef.current = null;
      previewElRef.current = null;
      scrollContainerRef.current = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("touch-action");
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [calcDuration]);

  return { handleResizePointerDown };
}
