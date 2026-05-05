import { FormEvent, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { CalendarDays, Circle, MessageSquareText, Newspaper, X } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { days } from "@/data/seedData";
import { formatMinutes } from "@/hooks/useDragDrop";
import { useScheduleStore, useSelectedCommunity, useSelectedFriend } from "@/hooks/useSchedule";
import { CommunityService } from "@/services/CommunityService";
import type { Course, ScheduleItem } from "@/types";

const communityTypeLabels = {
  school: "сургууль",
  class: "анги",
  course: "хичээл"
};

const kindLabels = {
  lecture: "Лекц",
  seminar: "Семинар"
};

function dayLabel(dayKey: ScheduleItem["day"]) {
  return days.find((day) => day.key === dayKey)?.shortLabel ?? dayKey;
}

function scheduleCourseKey(item: ScheduleItem) {
  return item.communityCourseId ?? item.courseId;
}

function overlaps(first: ScheduleItem, second: ScheduleItem) {
  return first.day === second.day && first.startMinutes < second.endMinutes && second.startMinutes < first.endMinutes;
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
  const [communitySection, setCommunitySection] = useState<"board" | "chat" | "timetable">("chat");
  const [postDraft, setPostDraft] = useState("");
  const rightContext = useScheduleStore((state) => state.rightContext);
  const selectedCourseId = useScheduleStore((state) => state.selectedCourseId);
  const selectedCommunity = useSelectedCommunity();
  const selectedFriend = useSelectedFriend();
  const currentStudent = useScheduleStore((state) => state.currentStudent);
  const students = useScheduleStore((state) => state.students);
  const communityMembers = useScheduleStore((state) => state.communityMembers);
  const courses = useScheduleStore((state) => state.courses);
  const currentUserSchedule = useScheduleStore((state) => state.currentUserSchedule);
  const friends = useScheduleStore((state) => state.friends);
  const schoolEvents = useScheduleStore((state) => state.schoolEvents);
  const boardPosts = useScheduleStore((state) => state.boardPosts);
  const addBoardPost = useScheduleStore((state) => state.addBoardPost);
  const addCourseFromCatalog = useScheduleStore((state) => state.addCourseFromCatalog);
  const setRightContext = useScheduleStore((state) => state.setRightContext);
  const setComparisonMode = useScheduleStore((state) => state.setComparisonMode);
  const setActivePage = useScheduleStore((state) => state.setActivePage);

  if (!rightContext) return null;

  if (rightContext === "community" && selectedCommunity) {
    const members = CommunityService.getCommunityMembers(selectedCommunity.id, communityMembers, students);
    const onlineMembers = members.filter((member) => member.isOnline);
    const courseScheduleEntries =
      selectedCommunity.type === "course" && selectedCommunity.reference_id
        ? [
            ...currentUserSchedule
              .filter((item) => scheduleCourseKey(item) === selectedCommunity.reference_id)
              .map((item) => ({ item, owner: "Та" })),
            ...friends.flatMap((friend) =>
              friend.schedule
                .filter((item) => scheduleCourseKey(item) === selectedCommunity.reference_id)
                .map((item) => ({ item, owner: friend.name }))
            )
          ]
        : [];
    const sharedOverlaps =
      selectedCommunity.type === "course" && selectedCommunity.reference_id
        ? friends.flatMap((friend) =>
            currentUserSchedule
              .filter((item) => scheduleCourseKey(item) === selectedCommunity.reference_id)
              .flatMap((ownItem) =>
                friend.schedule
                  .filter(
                    (friendItem) =>
                      scheduleCourseKey(friendItem) === selectedCommunity.reference_id && overlaps(ownItem, friendItem)
                  )
                  .map((friendItem) => ({ friendName: friend.name, ownItem, friendItem }))
              )
          )
        : [];
    const communityPosts = boardPosts.filter((post) => post.community_id === selectedCommunity.id);
    const senderById = new Map(students.map((student) => [student.id, student]));
    const visibleEvents = schoolEvents.filter((event) => event.school === currentStudent.school);
    const submitPost = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      addBoardPost(postDraft);
      setPostDraft("");
      setCommunitySection("board");
    };

    return (
      <ContextPanelShell>
        <div className="shrink-0 border-b border-zinc-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-950">{selectedCommunity.name}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {communityTypeLabels[selectedCommunity.type]} · {members.length} гишүүн · {onlineMembers.length} онлайн
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setRightContext(null)} aria-label="Хаах">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {onlineMembers.slice(0, 4).map((member) => (
              <span key={member.id} className="inline-flex items-center gap-1 text-xs text-emerald-500">
                <Circle className="h-2.5 w-2.5 fill-current" />
                {member.name}
              </span>
            ))}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 border-b border-zinc-200 p-2">
          {[
            { id: "board" as const, label: "Самбар", icon: Newspaper },
            { id: "chat" as const, label: "Чат", icon: MessageSquareText },
            { id: "timetable" as const, label: "Цаг", icon: CalendarDays }
          ].map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setCommunitySection(section.id)}
                className={`flex items-center justify-center gap-1 rounded-sm px-2 py-2 text-xs font-semibold ${
                  communitySection === section.id ? "bg-teal-500/15 text-teal-100" : "text-zinc-500"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {section.label}
              </button>
            );
          })}
        </div>

        {communitySection === "board" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <form onSubmit={submitPost} className="flex shrink-0 gap-2 border-b border-zinc-200 p-3">
              <Input
                value={postDraft}
                onChange={(event) => setPostDraft(event.target.value)}
                placeholder="Бүлэгт нийтлэх"
                aria-label="Самбарын нийтлэл"
              />
              <Button type="submit" size="sm">Нийтлэх</Button>
            </form>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-3 p-4">
                {selectedCommunity.type === "school" && (
                  <section className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Сургуулийн ойрын үйл явдал</div>
                    {visibleEvents.map((event) => (
                      <div key={event.id} className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="text-sm font-semibold text-zinc-950">{event.title}</div>
                        <div className="mt-1 text-xs text-zinc-500">{event.date} · {event.location}</div>
                      </div>
                    ))}
                  </section>
                )}
                {communityPosts.map((post) => (
                  <article key={post.id} className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {senderById.get(post.sender_id)?.name ?? "Тодорхойгүй"}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-zinc-950">{post.content}</p>
                  </article>
                ))}
                {communityPosts.length === 0 && (
                  <div className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-500">
                    Самбар дээр нийтлэл алга.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {communitySection === "chat" && <ChatPanel />}

        {communitySection === "timetable" && (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 p-4">
              <div className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                Энэ апп дээр гаргасан нь төлөвлөгөө. Жинхэнэ хичээл сонголтоо сургуулийн систем дээр баталгаажуулна.
              </div>
              {courseScheduleEntries.map(({ item, owner }) => (
                <div key={`${owner}-${item.id}`} className="rounded-sm border border-zinc-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-zinc-950">{owner}</span>
                    <Badge variant={item.kind}>{kindLabels[item.kind]}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {dayLabel(item.day)} · {formatMinutes(item.startMinutes)} - {formatMinutes(item.endMinutes)}
                  </div>
                  <div className="truncate text-xs text-zinc-500">{item.room}</div>
                </div>
              ))}
              <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {sharedOverlaps.length > 0
                  ? sharedOverlaps
                      .map(({ friendName, ownItem, friendItem }) => {
                        const start = Math.max(ownItem.startMinutes, friendItem.startMinutes);
                        const end = Math.min(ownItem.endMinutes, friendItem.endMinutes);
                        return `${friendName}: ${dayLabel(ownItem.day)} ${formatMinutes(start)}-${formatMinutes(end)}`;
                      })
                      .join(", ")
                  : "Найзтай давхцах цаг алга."}
              </div>
            </div>
          </ScrollArea>
        )}
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
