import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, MessageSquareText, Search, Star } from "lucide-react";
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
  seminar: "Семинар",
  lab: "Лаб"
};

const dayLabels = new Map(days.map((day) => [day.key, day.label]));
const generatedCodePattern = /^[A-F0-9]{8}$/;

function semesterKey(course: Course) {
  return `${course.year ?? "2025-2026"} · ${course.semester ?? "Намрын улирал"}`;
}

function scheduleSemesterKey(item: ScheduleItem) {
  return item.semesterKey ?? `${item.year ?? "2025-2026"} · ${item.semester ?? "Намрын улирал"}`;
}

function courseReviewKey(course: Course) {
  return course.communityCourseId ?? course.id;
}

function scheduleMatchesCourse(item: ScheduleItem, course: Course) {
  if (scheduleSemesterKey(item) !== semesterKey(course)) return false;

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
      scheduleSemesterKey(item) === semesterKey(course) &&
      item.day === course.day &&
      course.startMinutes! < item.endMinutes &&
      item.startMinutes < course.endMinutes!
  );
}

function averageRating(reviews: { rating: number }[]) {
  if (reviews.length === 0) return null;
  return reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
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
  const [expandedReviewCourseId, setExpandedReviewCourseId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const courses = useScheduleStore((state) => state.courses);
  const currentUserSchedule = useScheduleStore((state) => state.currentUserSchedule);
  const selectedSemester = useScheduleStore((state) => state.selectedSemester);
  const semesterOptions = useScheduleStore((state) => state.semesterOptions);
  const catalogLoaded = useScheduleStore((state) => state.catalogLoaded);
  const courseSearchQuery = useScheduleStore((state) => state.courseSearchQuery);
  const scheduleNotice = useScheduleStore((state) => state.scheduleNotice);
  const courseReviews = useScheduleStore((state) => state.courseReviews);
  const setCourseSearchQuery = useScheduleStore((state) => state.setCourseSearchQuery);
  const setSelectedSemester = useScheduleStore((state) => state.setSelectedSemester);
  const addCourseFromCatalog = useScheduleStore((state) => state.addCourseFromCatalog);
  const removeCourseFromSchedule = useScheduleStore((state) => state.removeCourseFromSchedule);
  const loadCourseReviews = useScheduleStore((state) => state.loadCourseReviews);
  const addCourseReview = useScheduleStore((state) => state.addCourseReview);

  const visibleCourses = useMemo(
    () =>
      courses
        .filter((course) => semesterKey(course) === selectedSemester)
        .filter((course) => matchesQuery(course, courseSearchQuery.trim(), mode))
        .slice(0, compact ? 80 : 160),
    [compact, courseSearchQuery, courses, mode, selectedSemester]
  );
  const selectedTermSchedule = useMemo(
    () => currentUserSchedule.filter((item) => scheduleSemesterKey(item) === selectedSemester),
    [currentUserSchedule, selectedSemester]
  );

  const handleAdd = (course: Course) => {
    if (courseConflicts(course, selectedTermSchedule) && pendingConflictCourseId !== course.id) {
      setPendingConflictCourseId(course.id);
      return;
    }

    addCourseFromCatalog(course.id);
    setPendingConflictCourseId(null);
  };

  useEffect(() => {
    if (!expandedReviewCourseId) return;
    void loadCourseReviews(expandedReviewCourseId);
  }, [expandedReviewCourseId, loadCourseReviews]);

  const handleReviewSubmit = (event: FormEvent<HTMLFormElement>, course: Course) => {
    event.preventDefault();
    const reviewKey = courseReviewKey(course);
    addCourseReview(reviewKey, reviewRating, reviewComment);
    setReviewComment("");
    setReviewRating(5);
    setExpandedReviewCourseId(reviewKey);
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
            const reviewKey = courseReviewKey(course);
            const reviews = courseReviews[reviewKey] ?? [];
            const classAverage = averageRating(reviews);
            const reviewsOpen = expandedReviewCourseId === reviewKey;
            const alreadyAdded = selectedTermSchedule.some((item) => scheduleMatchesCourse(item, course));
            const conflict = courseConflicts(course, selectedTermSchedule);
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

                  <div className="grid shrink-0 gap-1 text-right text-xs">
                    <div className="flex items-center justify-end gap-1 text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="font-semibold">{course.rating.toFixed(1)}</span>
                      <span className="text-zinc-500">багш</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-blue-500">
                      <MessageSquareText className="h-3.5 w-3.5" />
                      <span className="font-semibold">{classAverage ? classAverage.toFixed(1) : "-"}</span>
                      <span className="text-zinc-500">({reviews.length})</span>
                    </div>
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
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setExpandedReviewCourseId(reviewsOpen ? null : reviewKey)}>
                        Үнэлэх
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeCourseFromSchedule(course.id)}>
                        Хасах
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setExpandedReviewCourseId(reviewsOpen ? null : reviewKey)}>
                        Үнэлэх
                      </Button>
                      <Button
                        variant={pendingConflict ? "danger" : "secondary"}
                        size="sm"
                        onClick={() => handleAdd(course)}
                      >
                        {pendingConflict ? "Давхцалтай нэмэх" : "Нэмэх"}
                      </Button>
                    </div>
                  )}
                </div>

                {reviewsOpen && (
                  <div className="mt-3 border-t border-zinc-200 pt-3">
                    <form onSubmit={(event) => handleReviewSubmit(event, course)} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Нэргүй class review
                        </div>
                        <div className="flex items-center gap-1" aria-label="5 хүртэл үнэлэх">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setReviewRating(value)}
                              className={cn(
                                "rounded-sm p-1 text-amber-400 transition-transform hover:scale-110",
                                value <= reviewRating ? "opacity-100" : "opacity-35"
                              )}
                              aria-label={`${value} од`}
                            >
                              <Star className={cn("h-4 w-4", value <= reviewRating && "fill-current")} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        className="min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-red-500/60 focus:ring-2 focus:ring-red-500/15"
                        placeholder="Энэ class-ийн ачаалал, багш, семинарын чанарын талаар нэргүй сэтгэгдэл бичих"
                        required
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-zinc-500">Таны нэр харагдахгүй. Зөвхөн үнэлгээ, сэтгэгдэл хадгалагдана.</span>
                        <Button type="submit" size="sm" disabled={!reviewComment.trim()}>
                          Нэргүй илгээх
                        </Button>
                      </div>
                    </form>

                    <div className="mt-3 space-y-2">
                      {reviews.slice(0, 3).map((review) => (
                        <div key={review.id} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-zinc-700">Нэргүй оюутан</span>
                            <span className="text-zinc-500">
                              {review.rating}/5 · {formatReviewDate(review.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-5 text-zinc-700">{review.comment}</p>
                        </div>
                      ))}
                      {reviews.length === 0 && (
                        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">
                          Энэ class дээр нэргүй review алга.
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
