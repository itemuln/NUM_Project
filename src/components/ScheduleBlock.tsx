import { PointerEvent, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripHorizontal, MapPin, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DAY_END_MINUTES, HOUR_HEIGHT } from "@/data/seedData";
import { durationToPixels, formatMinutes, minuteToPixels } from "@/hooks/useDragDrop";
import { useScheduleStore } from "@/hooks/useSchedule";
import { cn } from "@/lib/utils";
import type { ScheduleItem, ScheduleOwner } from "@/types";

interface ScheduleBlockProps {
  item: ScheduleItem;
  owner: ScheduleOwner;
  conflict?: boolean;
}

const kindLabels = {
  lecture: "Лекц",
  seminar: "Семинар",
  lab: "Лаб"
};

export function ScheduleBlock({ item, owner, conflict = false }: ScheduleBlockProps) {
  const resizeScheduleItem = useScheduleStore((state) => state.resizeScheduleItem);
  const duration = item.endMinutes - item.startMinutes;
  const canMove = owner === "me";

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `schedule-${item.id}`,
    disabled: !canMove,
    data: {
      dragType: "schedule-block",
      itemId: item.id,
      duration
    }
  });

  const handleResizeStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const startY = event.clientY;
      const originalEnd = item.endMinutes;
      const pixelsPerMinute = HOUR_HEIGHT / 60;

      const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
        const deltaMinutes = (moveEvent.clientY - startY) / pixelsPerMinute;
        resizeScheduleItem(item.id, Math.min(DAY_END_MINUTES, originalEnd + deltaMinutes));
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [item.endMinutes, item.id, resizeScheduleItem]
  );

  const blockTop = minuteToPixels(item.startMinutes);
  const blockHeight = Math.max(durationToPixels(duration), 38);
  const transformStyle = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined;

  return (
    <article
      ref={setNodeRef}
      style={{
        top: blockTop,
        height: blockHeight,
        transform: transformStyle,
        left: owner === "me" ? "6px" : "18px",
        right: owner === "me" ? "6px" : "18px"
      }}
      className={cn(
        "group absolute rounded-md border p-2 text-left transition-[box-shadow,opacity,border-color,transform,filter] duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110",
        owner === "me" && "schedule-block-own z-20",
        owner === "me" && item.kind === "lecture" && "schedule-block-lecture",
        owner === "me" && item.kind === "seminar" && "schedule-block-seminar",
        owner === "me" && item.kind === "lab" && "schedule-block-lab",
        owner === "friend" && "schedule-block-friend pointer-events-none z-10 border-dashed backdrop-blur-[1px]",
        conflict && owner === "me" && "border-red-400 ring-2 ring-red-500/50",
        conflict && owner === "friend" && "border-red-400 bg-red-500/20",
        isDragging && "z-50 scale-[1.02] opacity-80 shadow-[0_22px_52px_rgba(0,0,0,0.38)]"
      )}
      {...attributes}
      {...(canMove ? listeners : {})}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={cn(
                "truncate text-[11px] font-semibold uppercase tracking-wide",
                owner === "me" ? "schedule-block-time" : "schedule-block-friend-time"
              )}
            >
              {formatMinutes(item.startMinutes)} - {formatMinutes(item.endMinutes)}
            </div>
            <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-4">{item.courseName}</h3>
          </div>
          <Badge
            variant={item.kind}
            className={cn(
              "hidden shrink-0 border-white/20 text-[10px] lg:inline-flex",
              owner === "friend" && "schedule-block-friend-badge"
            )}
          >
            {kindLabels[item.kind]}
          </Badge>
        </div>

        <div
          className={cn(
            "mt-1.5 min-w-0 space-y-1 text-[11px] leading-4",
            owner === "me" ? "schedule-block-meta" : "schedule-block-friend-meta"
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <UserRound className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.teacher}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.room}</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-2 top-full z-50 mt-2 hidden w-64 animate-soft-pop rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-700 shadow-xl group-hover:block">
        <div className="font-semibold text-zinc-950">{item.courseName}</div>
        <div className="mt-2 grid grid-cols-[72px_1fr] gap-y-1">
          <span className="text-zinc-500">Багш</span>
          <span>{item.teacher}</span>
          <span className="text-zinc-500">Өрөө</span>
          <span>{item.room}</span>
          <span className="text-zinc-500">Цаг</span>
          <span>
            {formatMinutes(item.startMinutes)} - {formatMinutes(item.endMinutes)}
          </span>
        </div>
      </div>

      {canMove && (
        <button
          className="schedule-block-resize absolute inset-x-2 bottom-1 flex h-3 cursor-ns-resize items-center justify-center rounded-md opacity-0 transition-all duration-200 group-hover:opacity-100"
          type="button"
          aria-label={`${item.courseName} хугацаа өөрчлөх`}
          onPointerDown={handleResizeStart}
        >
          <GripHorizontal className="h-3 w-3" />
        </button>
      )}
    </article>
  );
}
