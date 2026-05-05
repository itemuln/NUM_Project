import type { DragEndEvent } from "@dnd-kit/core";
import { DAY_END_MINUTES, DAY_START_MINUTES, HOUR_HEIGHT, SLOT_MINUTES } from "@/data/seedData";
import { useScheduleStore } from "@/hooks/useSchedule";
import type { DayKey } from "@/types";

const pixelsPerMinute = HOUR_HEIGHT / 60;

const snapToSlot = (minutes: number) => Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type DragData =
  | {
      dragType: "course-card";
      courseId: string;
      duration: number;
    }
  | {
      dragType: "schedule-block";
      itemId: string;
      duration: number;
    };

export function minuteToPixels(minutes: number) {
  return (minutes - DAY_START_MINUTES) * pixelsPerMinute;
}

export function durationToPixels(minutes: number) {
  return minutes * pixelsPerMinute;
}

export function pixelsToMinutes(pixels: number) {
  return DAY_START_MINUTES + pixels / pixelsPerMinute;
}

export function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getDropStartMinutes(event: DragEndEvent, duration: number) {
  const overRect = event.over?.rect;
  const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;

  if (!overRect || !activeRect) return null;

  const relativeTop = activeRect.top - overRect.top;
  const rawMinutes = pixelsToMinutes(relativeTop);
  const snappedStart = snapToSlot(rawMinutes);

  return clamp(snappedStart, DAY_START_MINUTES, DAY_END_MINUTES - duration);
}

export function useDragDrop() {
  const addScheduleItem = useScheduleStore((state) => state.addScheduleItem);
  const moveScheduleItem = useScheduleStore((state) => state.moveScheduleItem);

  const handleDragEnd = (event: DragEndEvent) => {
    const day = event.over?.data.current?.day as DayKey | undefined;
    const dragData = event.active.data.current as DragData | undefined;

    if (!day || !dragData) return;

    const startMinutes = getDropStartMinutes(event, dragData.duration);
    if (startMinutes === null) return;

    if (dragData.dragType === "course-card") {
      addScheduleItem(dragData.courseId, day, startMinutes, dragData.duration);
      return;
    }

    moveScheduleItem(dragData.itemId, day, startMinutes);
  };

  return { handleDragEnd };
}
