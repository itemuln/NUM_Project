import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { CalendarDays, Circle, MessageCircle, X } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { days } from "@/data/seedData";
import { formatMinutes } from "@/hooks/useDragDrop";
import { useScheduleStore, useSelectedCommunity, useSelectedFriend } from "@/hooks/useSchedule";
import { CommunityService } from "@/services/CommunityService";
import type { Course, ScheduleItem } from "@/types";

const communityTypeLabels = {
  school: "сургууль",
  class: "анги",
  major: "мэргэжил",
  course: "хичээл"
};

function dayLabel(dayKey: ScheduleItem["day"]) {
  return days.find((day) => day.key === dayKey)?.shortLabel ?? dayKey;
}

function findSameClass(item: ScheduleItem, courses: Course[]) {
  return courses.find((course) => {
    const availableSeats = (course.capacity ?? 0) - (course.enrolledCount ?? 0);

    return (
      availableSeats > 0 &&
      course.kind === item.kind &&
      course.name === item.courseName &&
      course.teacher === item.teacher &&
      course.day === item.day &&
      course.startMinutes === item.startMinutes &&
      course.endMinutes === item.endMinutes
    );
  });
}

function ContextPanelShell({ children }: { children: ReactNode }) {
  const setRightContext = useScheduleStore((state) => state.setRightContext);
  const rightPanelWidth = useScheduleStore((state) => state.rightPanelWidth);
  const setRightPanelWidth = useScheduleStore((state) => state.setRightPanelWidth);

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = rightPanelWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setRightPanelWidth(startWidth + startX - moveEvent.clientX);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 bg-black/55 backdrop-blur-sm xl:hidden"
        onClick={() => setRightContext(null)}
        aria-label="Контекст хаах"
      />
      <aside
        className="fixed inset-x-3 bottom-[74px] top-[58px] z-40 flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl animate-page-enter xl:relative xl:inset-auto xl:z-auto xl:h-screen xl:w-[var(--right-panel-width)] xl:shrink-0 xl:rounded-none xl:border-y-0 xl:border-r-0 xl:border-l xl:shadow-none"
        style={{ "--right-panel-width": `${rightPanelWidth}px` } as CSSProperties}
      >
        <button
          type="button"
          className="absolute inset-y-0 -left-1 hidden w-2 cursor-col-resize bg-transparent transition-colors hover:bg-teal-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 xl:block"
          onPointerDown={handleResizeStart}
          aria-label="Баруун самбарын хэмжээг өөрчлөх"
        />
        {children}
      </aside>
    </>
  );
}

export function RightContextPanel() {
  const rightContext = useScheduleStore((state) => state.rightContext);
  const selectedCourseId = useScheduleStore((state) => state.selectedCourseId);
  const selectedCommunity = useSelectedCommunity();
  const selectedFriend = useSelectedFriend();
  const students = useScheduleStore((state) => state.students);
  const communityMembers = useScheduleStore((state) => state.communityMembers);
  const courses = useScheduleStore((state) => state.courses);
  const addCourseFromCatalog = useScheduleStore((state) => state.addCourseFromCatalog);
  const setRightContext = useScheduleStore((state) => state.setRightContext);
  const setComparisonMode = useScheduleStore((state) => state.setComparisonMode);
  const setActivePage = useScheduleStore((state) => state.setActivePage);

  if (!rightContext) return null;

  if (rightContext === "community" && selectedCommunity) {
    const members = CommunityService.getCommunityMembers(selectedCommunity.id, communityMembers, students);
    const onlineMembers = members.filter((member) => member.isOnline);

    return (
      <ContextPanelShell>
        <div className="shrink-0 border-b border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-950">{selectedCommunity.name}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {communityTypeLabels[selectedCommunity.type]} · {members.length} гишүүн · {onlineMembers.length} онлайн
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setRightContext(null)} aria-label="Хаах">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {onlineMembers.slice(0, 4).map((member) => (
              <span
                key={member.id}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-500"
              >
                <Circle className="h-2.5 w-2.5 fill-current" />
                {member.name}
              </span>
            ))}
          </div>
        </div>

        <ChatPanel />
      </ContextPanelShell>
    );
  }

  if (rightContext === "friend" && selectedFriend) {
    return (
      <ContextPanelShell>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 p-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-950">{selectedFriend.name}</div>
            <div className="mt-1 text-xs text-zinc-500">{selectedFriend.email}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setRightContext(null)} aria-label="Хаах">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="shrink-0 border-b border-zinc-200 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setComparisonMode(true);
                setActivePage("dashboard");
              }}
            >
              Харьцуулах
            </Button>
            <Button variant="outline" onClick={() => setActivePage("dashboard")}>
              Хуваарь үзэх
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <CalendarDays className="h-4 w-4" />
              Найзын хуваарь
            </div>
            {selectedFriend.schedule.map((item) => (
              <div key={item.id} className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-sm font-semibold text-zinc-950">{item.courseName}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {dayLabel(item.day)} · {formatMinutes(item.startMinutes)} - {formatMinutes(item.endMinutes)}
                </div>
                <div className="truncate text-xs text-zinc-500">{item.room}</div>
                {(() => {
                  const sameClass = findSameClass(item, courses);
                  if (!sameClass) {
                    return (
                      <div className="mt-2 text-[11px] font-medium text-zinc-500">
                        Ижил class-д сул суудал баталгаажаагүй.
                      </div>
                    );
                  }

                  const availableSeats = (sameClass.capacity ?? 0) - (sameClass.enrolledCount ?? 0);

                  return (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-emerald-500">{availableSeats} сул суудал</span>
                      <Button size="sm" variant="outline" onClick={() => addCourseFromCatalog(sameClass.id)}>
                        Ижил class авах
                      </Button>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </ScrollArea>
      </ContextPanelShell>
    );
  }

  if (rightContext === "course" && selectedCourseId) {
    const course = courses.find((item) => item.id === selectedCourseId);
    if (!course) return null;

    return (
      <ContextPanelShell>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 p-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-950">{course.name}</div>
            <div className="mt-1 text-xs text-zinc-500">{course.code} · {course.teacher}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setRightContext(null)} aria-label="Хаах">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3 p-4 text-sm text-zinc-500">
          <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Цаг</div>
            <div className="mt-1 text-zinc-950">
              {course.day && course.startMinutes !== undefined && course.endMinutes !== undefined
                ? `${dayLabel(course.day)} · ${formatMinutes(course.startMinutes)} - ${formatMinutes(course.endMinutes)}`
                : "Тодорхойгүй"}
            </div>
          </div>
          <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Өрөө</div>
            <div className="mt-1 text-zinc-950">{course.room}</div>
          </div>
          <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Үнэлгээ</div>
            <div className="mt-1 text-zinc-950">{course.rating.toFixed(1)} · {course.reviewCount} сэтгэгдэл</div>
          </div>
        </div>
      </ContextPanelShell>
    );
  }

  return null;
}
