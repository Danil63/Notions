import { useRef, useCallback, useEffect } from "react";

const HOUR_HEIGHT = 66;
const PX_PER_MINUTE = HOUR_HEIGHT / 60;
const SCROLL_ZONE = 40;
const SCROLL_SPEED = 6;

interface ResizeState {
  taskId: string;
  date: string;
  startMinute: number;
  startY: number;
  startDuration: number; // в минутах
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
  onResize: (taskId: string, date: string, startMinute: number, newDuration: number) => void,
  isSlotFree: (startMinute: number, excludeTaskId: string) => boolean,
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
    if (!state) return 60;

    const deltaPx = clientY - state.startY;
    // Снаппим к 10 минутам
    const deltaMinutes = Math.round(deltaPx / PX_PER_MINUTE / 10) * 10;
    const raw = state.startDuration + deltaMinutes;
    const clamped = Math.max(10, Math.min(24 * 60 - state.startMinute, raw));
    return clamped;
  }, []);

  const handleResizePointerDown = useCallback((
    e: React.PointerEvent,
    entry: { taskId: string; date: string; hour: number; duration: number },
    entryEl: HTMLElement | null,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    // hour и duration приходят в "часовых" единицах из DayCalendar (для совместимости)
    // но мы конвертируем в минуты
    const startMinute = entry.hour * 60;
    const startDuration = entry.duration * 60;

    stateRef.current = {
      taskId: entry.taskId,
      date: entry.date,
      startMinute,
      startY: e.clientY,
      startDuration,
    };
    previewElRef.current = entryEl;
    scrollContainerRef.current = entryEl?.closest(`.${CSS.escape("calendar")}`) as HTMLElement | null
      ?? entryEl?.parentElement?.parentElement ?? null;

    document.body.style.setProperty("user-select", "none");
    document.body.style.setProperty("touch-action", "none");

    const onMove = (ev: PointerEvent) => {
      autoScroll(ev.clientY, scrollContainerRef.current);
      if (previewElRef.current) {
        const dur = calcDuration(ev.clientY);
        const heightPx = dur * PX_PER_MINUTE - 4;
        previewElRef.current.style.height = `${Math.max(heightPx, 20)}px`;
      }
    };

    const onUp = (ev: PointerEvent) => {
      const state = stateRef.current;
      if (state) {
        const newDuration = calcDuration(ev.clientY);
        if (newDuration !== state.startDuration) {
          onResizeRef.current(state.taskId, state.date, state.startMinute, newDuration);
        } else if (previewElRef.current) {
          previewElRef.current.style.height = `${Math.max(state.startDuration * PX_PER_MINUTE - 4, 20)}px`;
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
