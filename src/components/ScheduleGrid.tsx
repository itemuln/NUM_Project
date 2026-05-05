import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ScheduleBlock } from "@/components/ScheduleBlock";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DAY_END_MINUTES, DAY_START_MINUTES, days, HOUR_HEIGHT } from "@/data/seedData";
import { durationToPixels, formatMinutes, minuteToPixels } from "@/hooks/useDragDrop";
import { useScheduleStore, useSelectedFriend } from "@/hooks/useSchedule";
import { cn } from "@/lib/utils";
import type { DayDefinition, ScheduleItem } from "@/types";

interface Interval {
  start: number;
  end: number;
}

const totalMinutes = DAY_END_MINUTES - DAY_START_MINUTES;
const gridHeight = durationToPixels(totalMinutes);

const hourMarkers = Array.from({ length: totalMinutes / 60 + 1 }, (_, index) => DAY_START_MINUTES + index * 60);
const halfHourMarkers = Array.from({ length: totalMinutes / 30 + 1 }, (_, index) => DAY_START_MINUTES + index * 30);

function intervalsOverlap(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

function itemToInterval(item: ScheduleItem): Interval {
  return {
    start: item.startMinutes,
    end: item.endMinutes
  };
}

function getConflictSegments(ownItems: ScheduleItem[], friendItems: ScheduleItem[]) {
  const segments: Interval[] = [];

  ownItems.forEach((ownItem) => {
    friendItems.forEach((friendItem) => {
      const own = itemToInterval(ownItem);
      const friend = itemToInterval(friendItem);

      if (!intervalsOverlap(own, friend)) return;

      segments.push({
        start: Math.max(own.start, friend.start),
        end: Math.min(own.end, friend.end)
      });
    });
  });

  return segments;
}

function mergeIntervals(intervals: Interval[]) {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [sorted[0]];

  sorted.slice(1).forEach((interval) => {
    const last = merged[merged.length - 1];

    if (interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
      return;
    }

    merged.push({ ...interval });
  });

  return merged;
}

function invertBusyIntervals(items: ScheduleItem[]) {
  const busy = mergeIntervals(items.map(itemToInterval));
  const free: Interval[] = [];
  let cursor = DAY_START_MINUTES;

  busy.forEach((interval) => {
    if (interval.start > cursor) {
      free.push({ start: cursor, end: interval.start });
    }

    cursor = Math.max(cursor, interval.end);
  });

  if (cursor < DAY_END_MINUTES) {
    free.push({ start: cursor, end: DAY_END_MINUTES });
  }

  return free;
}

function getMutualFreeSegments(ownItems: ScheduleItem[], friendItems: ScheduleItem[]) {
  const ownFree = invertBusyIntervals(ownItems);
  const friendFree = invertBusyIntervals(friendItems);
  const mutual: Interval[] = [];

  ownFree.forEach((own) => {
    friendFree.forEach((friend) => {
      if (!intervalsOverlap(own, friend)) return;

      const segment = {
        start: Math.max(own.start, friend.start),
        end: Math.min(own.end, friend.end)
      };

      if (segment.end - segment.start >= 60) {
        mutual.push(segment);
      }
    });
  });

  return mutual;
}

function hasConflict(item: ScheduleItem, conflictSegments: Interval[]) {
  const interval = itemToInterval(item);
  return conflictSegments.some((segment) => intervalsOverlap(interval, segment));
}

function SegmentHighlight({
  segment,
  tone
}: {
  segment: Interval;
  tone: "conflict" | "free";
}) {
  return (
    <div
      aria-label={`${tone === "conflict" ? "давхцал" : "хамтын зав"} ${formatMinutes(segment.start)}-${formatMinutes(segment.end)}`}
      className={cn(
        "pointer-events-none absolute inset-x-1 rounded-md border-l-2 transition-opacity duration-300",
        tone === "conflict" && "z-0 animate-conflict-pulse border-red-500 bg-red-500/25",
        tone === "free" && "z-0 border-emerald-400 bg-emerald-500/10"
      )}
      style={{
        top: minuteToPixels(segment.start),
        height: Math.max(durationToPixels(segment.end - segment.start), 10)
      }}
    />
  );
}

interface DayColumnProps {
  day: DayDefinition;
  ownItems: ScheduleItem[];
  friendItems: ScheduleItem[];
  comparisonMode: boolean;
}

function DayColumn({ day, ownItems, friendItems, comparisonMode }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.key}`,
    data: {
      day: day.key
    }
  });

  const conflictSegments = useMemo(
    () => (comparisonMode ? getConflictSegments(ownItems, friendItems) : []),
    [comparisonMode, friendItems, ownItems]
  );

  const freeSegments = useMemo(
    () => (comparisonMode ? getMutualFreeSegments(ownItems, friendItems) : []),
    [comparisonMode, friendItems, ownItems]
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-r border-zinc-200 bg-white transition-colors duration-200",
        isOver && "bg-teal-50/80"
      )}
      style={{ height: gridHeight }}
    >
      {halfHourMarkers.map((minutes) => (
        <div
          key={`${day.key}-${minutes}`}
          className={cn(
            "pointer-events-none absolute inset-x-0 border-t",
            minutes % 60 === 0 ? "border-zinc-200" : "border-zinc-100"
          )}
          style={{ top: minuteToPixels(minutes) }}
        />
      ))}

      {freeSegments.map((segment) => (
        <SegmentHighlight key={`free-${day.key}-${segment.start}-${segment.end}`} segment={segment} tone="free" />
      ))}

      {conflictSegments.map((segment) => (
        <SegmentHighlight
          key={`conflict-${day.key}-${segment.start}-${segment.end}`}
          segment={segment}
          tone="conflict"
        />
      ))}

      {friendItems.map((item) => (
        <ScheduleBlock
          key={item.id}
          item={item}
          owner="friend"
          conflict={hasConflict(item, conflictSegments)}
        />
      ))}

      {ownItems.map((item) => (
        <ScheduleBlock key={item.id} item={item} owner="me" conflict={hasConflict(item, conflictSegments)} />
      ))}
    </div>
  );
}

export function ScheduleGrid() {
  const ownSchedule = useScheduleStore((state) => state.currentUserSchedule);
  const comparisonMode = useScheduleStore((state) => state.comparisonMode);
  const selectedFriend = useSelectedFriend();
  const friendSchedule = comparisonMode && selectedFriend ? selectedFriend.schedule : [];

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-[1540px] flex-col">
      <ScrollArea className="h-full min-h-0 border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
        <div className="min-w-[820px] sm:min-w-[920px] xl:min-w-[1180px]">
          <div className="sticky top-0 z-30 grid grid-cols-[52px_repeat(7,minmax(108px,1fr))] border-b border-zinc-200 bg-zinc-50 sm:grid-cols-[60px_repeat(7,minmax(122px,1fr))] xl:grid-cols-[72px_repeat(7,minmax(150px,1fr))]">
            <div className="sticky left-0 z-40 border-r border-zinc-200 bg-zinc-50 px-2 py-3 text-xs font-medium uppercase tracking-wide text-zinc-400 sm:px-3">
              Цаг
            </div>
            {days.map((day) => (
              <div key={day.key} className="min-w-0 border-r border-zinc-200 px-2 py-3 sm:px-3">
                <div className="truncate text-sm font-semibold text-zinc-950">{day.label}</div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">7 хоног</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[52px_repeat(7,minmax(108px,1fr))] sm:grid-cols-[60px_repeat(7,minmax(122px,1fr))] xl:grid-cols-[72px_repeat(7,minmax(150px,1fr))]">
            <div className="sticky left-0 z-20 border-r border-zinc-200 bg-zinc-50" style={{ height: gridHeight }}>
              {hourMarkers.map((minutes) => (
                <div
                  key={minutes}
                  className="absolute right-1 -translate-y-2 text-[11px] font-medium tabular-nums text-zinc-400 sm:right-2 sm:text-xs"
                  style={{ top: minuteToPixels(minutes) }}
                >
                  {formatMinutes(minutes)}
                </div>
              ))}
            </div>

            {days.map((day) => {
              const ownItems = ownSchedule.filter((item) => item.day === day.key);
              const friendItems = friendSchedule.filter((item) => item.day === day.key);

              return (
                <DayColumn
                  key={day.key}
                  day={day}
                  ownItems={ownItems}
                  friendItems={friendItems}
                  comparisonMode={comparisonMode}
                />
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
