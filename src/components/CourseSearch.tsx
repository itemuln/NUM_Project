import { useMemo, useState } from "react";
import { AlertTriangle, Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { days } from "@/data/seedData";
import { formatMinutes } from "@/hooks/useDragDrop";
import { useScheduleStore } from "@/hooks/useSchedule";
import { cn } from "@/lib/utils";
import type { Course, ScheduleItem } from "@/types";

type SearchMode = "all" | "code" | "name" | "teacher";

interface CourseSearchProps {
  compact?: boolean;
  onCourseSelect?: (courseId: string) => void;
}

const searchModes: { value: SearchMode; label: string }[] = [
  { value: "all", label: "Бүгд" },
  { value: "code", label: "Код" },
  { value: "name", label: "Нэр" },
  { value: "teacher", label: "Багш" }
];

const kindLabels = {
  lecture: "Лекц",
  seminar: "Семинар"
};

const dayLabels = new Map(days.map((day) => [day.key, day.label]));
const generatedCodePattern = /^[A-F0-9]{8}$/;

function semesterKey(course: Course) {
  return `${course.year ?? "2025-2026"} · ${course.semester ?? "Намрын улирал"}`;
}

function scheduleMatchesCourse(item: ScheduleItem, course: Course) {
  const scheduleCourseGroupId = item.communityCourseId ?? item.courseId;
  const courseGroupId = course.communityCourseId ?? course.id;

  if (scheduleCourseGroupId === courseGroupId && item.kind === course.kind) return true;
  if (item.courseId === course.id) return true;
  if (course.sourceScheduleId && item.sourceScheduleId === course.sourceScheduleId) return true;

  return (
    Boolean(course.day) &&
    course.startMinutes !== undefined &&
    course.endMinutes !== undefined &&
    item.courseName === course.name &&
    item.teacher === course.teacher &&
    item.day === course.day &&
    item.startMinutes === course.startMinutes &&
    item.endMinutes === course.endMinutes
  );
}

function courseConflicts(course: Course, schedule: ScheduleItem[]) {
  if (!course.day || course.startMinutes === undefined || course.endMinutes === undefined) return false;

  return schedule.some(
    (item) =>
      item.day === course.day &&
      course.startMinutes! < item.endMinutes &&
      item.startMinutes < course.endMinutes!
  );
}

function matchesQuery(course: Course, query: string, mode: SearchMode) {
  if (!query) return true;

  const normalized = query.toLowerCase();
  const targets = {
    code: course.code,
    name: course.name,
    teacher: course.teacher
  };

  if (mode === "all") {
    return Object.values(targets).some((value) => value.toLowerCase().includes(normalized));
  }

  return targets[mode].toLowerCase().includes(normalized);
}

function displayCourseCode(course: Course) {
  return generatedCodePattern.test(course.code) ? "Кодгүй" : course.code;
}

function displayDepartment(course: Course) {
  return course.department === "Тэнхим тодорхойгүй" ? "Тэнхим тодорхойгүй" : course.department;
}

export function CourseSearch({ compact = false, onCourseSelect }: CourseSearchProps) {
  const [mode, setMode] = useState<SearchMode>("all");
  const [pendingConflictCourseId, setPendingConflictCourseId] = useState<string | null>(null);
  const courses = useScheduleStore((state) => state.courses);
  const currentUserSchedule = useScheduleStore((state) => state.currentUserSchedule);
  const selectedSemester = useScheduleStore((state) => state.selectedSemester);
  const semesterOptions = useScheduleStore((state) => state.semesterOptions);
  const catalogLoaded = useScheduleStore((state) => state.catalogLoaded);
  const courseSearchQuery = useScheduleStore((state) => state.courseSearchQuery);
  const scheduleNotice = useScheduleStore((state) => state.scheduleNotice);
  const setCourseSearchQuery = useScheduleStore((state) => state.setCourseSearchQuery);
  const setSelectedSemester = useScheduleStore((state) => state.setSelectedSemester);
  const addCourseFromCatalog = useScheduleStore((state) => state.addCourseFromCatalog);
  const removeCourseFromSchedule = useScheduleStore((state) => state.removeCourseFromSchedule);

  const visibleCourses = useMemo(
    () =>
      courses
        .filter((course) => semesterKey(course) === selectedSemester)
        .filter((course) => matchesQuery(course, courseSearchQuery.trim(), mode))
        .slice(0, compact ? 80 : 160),
    [compact, courseSearchQuery, courses, mode, selectedSemester]
  );

  const handleAdd = (course: Course) => {
    if (courseConflicts(course, currentUserSchedule) && pendingConflictCourseId !== course.id) {
      setPendingConflictCourseId(course.id);
      return;
    }

    addCourseFromCatalog(course.id);
    setPendingConflictCourseId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={courseSearchQuery}
            onChange={(event) => setCourseSearchQuery(event.target.value)}
            className="pl-9"
            placeholder="Код, нэр, багшаар хайх"
          />
        </div>
        <select
          value={selectedSemester}
          onChange={(event) => setSelectedSemester(event.target.value)}
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition-all duration-200 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/15"
          aria-label="Улирал сонгох"
        >
          {semesterOptions.map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {searchModes.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setMode(item.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5",
              mode === item.value
                ? "border-red-500/50 bg-red-500/15 text-red-400"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 hover:text-zinc-950"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs leading-5 text-blue-500">
        Улирал сонгоод дараагийн семестрийн хичээлээ төлөвлөнө. Багшийн review/rating нь одоогоор mock data бөгөөд
        дараагийн шатанд course review эх сурвалжтай холбогдоно.
      </div>

      {scheduleNotice && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
          {scheduleNotice}
        </div>
      )}

      <div className="scheduler-scrollbar min-h-0 flex-1 overflow-auto pr-1">
        <div className="space-y-2">
          {visibleCourses.map((course) => {
            const alreadyAdded = currentUserSchedule.some((item) => scheduleMatchesCourse(item, course));
            const conflict = courseConflicts(course, currentUserSchedule);
            const pendingConflict = pendingConflictCourseId === course.id;

            return (
              <article
                key={course.id}
                className="rounded-md border border-zinc-200 bg-white p-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-red-500/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onCourseSelect?.(course.id)}
                    className="min-w-0 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {displayCourseCode(course)}
                      </span>
                      <Badge variant={course.kind}>{kindLabels[course.kind]}</Badge>
                      {conflict && !alreadyAdded && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                          <AlertTriangle className="h-3 w-3" />
                          Давхцалтай
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-zinc-950">
                      {course.name}
                    </h3>
                  </button>

                  <div className="flex shrink-0 items-center gap-1 text-xs text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="font-semibold">{course.rating.toFixed(1)}</span>
                    <span className="text-zinc-500">({course.reviewCount})</span>
                  </div>
                </div>

                <div className="mt-2 grid gap-1 text-xs text-zinc-500">
                  <div>
                    <span className="font-medium text-zinc-700">{course.teacher}</span>
                    <span className="mx-1.5 text-zinc-500">/</span>
                    <span>{course.room}</span>
                  </div>
                  {course.day && course.startMinutes !== undefined && course.endMinutes !== undefined && (
                    <div>
                      {dayLabels.get(course.day)} · {formatMinutes(course.startMinutes)} -{" "}
                      {formatMinutes(course.endMinutes)}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-zinc-500">
                    {alreadyAdded
                      ? "Аль хэдийн нэмэгдсэн"
                      : pendingConflict
                        ? "Давхцалтай ч нэмэх үү?"
                        : catalogLoaded
                          ? `${displayDepartment(course)} · BagshSpace үнэлгээний орлуулагч`
                          : "Каталог уншиж байна"}
                  </div>
                  {alreadyAdded ? (
                    <Button variant="outline" size="sm" onClick={() => removeCourseFromSchedule(course.id)}>
                      Хасах
                    </Button>
                  ) : (
                    <Button
                      variant={pendingConflict ? "danger" : "secondary"}
                      size="sm"
                      onClick={() => handleAdd(course)}
                    >
                      {pendingConflict ? "Давхцалтай нэмэх" : "Нэмэх"}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {visibleCourses.length === 0 && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            Тохирох хичээл олдсонгүй.
          </div>
        )}
      </div>
    </div>
  );
}
