import { useRef, useCallback, useEffect } from "react";

const HOUR_HEIGHT = 66;
const PX_PER_MINUTE = HOUR_HEIGHT / 60;
const SCROLL_ZONE = 40;
const SCROLL_SPEED = 6;

interface ResizeState {
  taskId: string;
  date: string;
  startMinute: number;  // в минутах
  startY: number;
  startDuration: number; // в минутах
}

function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, "0")}`;
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

  // Плавная (без снапа) — для визуального размера во время тянуть
  const calcRawDuration = useCallback((clientY: number): number => {
    const state = stateRef.current;
    if (!state) return 60;
    const deltaPx = clientY - state.startY;
    const raw = state.startDuration + deltaPx / PX_PER_MINUTE;
    return Math.max(10, Math.min(24 * 60 - state.startMinute, raw));
  }, []);

  // Снаппинг к 10 минутам — только для фиксации при отпускании
  const calcSnappedDuration = useCallback((clientY: number): number => {
    const state = stateRef.current;
    if (!state) return 60;
    const deltaPx = clientY - state.startY;
    const deltaMinutes = Math.round(deltaPx / PX_PER_MINUTE / 10) * 10;
    const raw = state.startDuration + deltaMinutes;
    return Math.max(10, Math.min(24 * 60 - state.startMinute, raw));
  }, []);

  const handleResizePointerDown = useCallback((
    e: React.PointerEvent,
    entry: { taskId: string; date: string; startMinute: number; duration: number },
    entryEl: HTMLElement | null,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    // Блокируем нативное всплытие — иначе на мобильных одновременно активируется usePointerMove
    e.nativeEvent.stopImmediatePropagation();

    stateRef.current = {
      taskId: entry.taskId,
      date: entry.date,
      startMinute: entry.startMinute,
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
      if (previewElRef.current && stateRef.current) {
        // Плавная высота без снапа для мягкого ощущения
        const rawDur = calcRawDuration(ev.clientY);
        const heightPx = rawDur * PX_PER_MINUTE - 4;
        previewElRef.current.style.height = `${Math.max(heightPx, 20)}px`;
        // Метка конца — показываем снаппинутое значение (куда приземлится)
        const snappedDur = calcSnappedDuration(ev.clientY);
        const endEl = previewElRef.current.querySelector("[data-time-end]") as HTMLElement | null;
        if (endEl) {
          endEl.textContent = fmtMin(stateRef.current.startMinute + snappedDur);
          endEl.style.display = "";
        }
      }
    };

    const onUp = (ev: PointerEvent) => {
      const state = stateRef.current;
      if (state) {
        // Фиксируем снаппинутое значение
        const newDuration = calcSnappedDuration(ev.clientY);
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
  }, [calcRawDuration, calcSnappedDuration]);

  return { handleResizePointerDown };
}
