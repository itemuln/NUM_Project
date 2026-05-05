import { CourseSearch } from "@/components/CourseSearch";
import { Button } from "@/components/ui/button";
import { useScheduleStore } from "@/hooks/useSchedule";

export function CoursesPage() {
  const openCourseModal = useScheduleStore((state) => state.openCourseModal);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      <header className="flex shrink-0 items-center justify-between border border-zinc-200 bg-white px-4 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Каталог</div>
          <h1 className="mt-1 text-xl font-semibold text-zinc-950">Хичээл хайх</h1>
        </div>
        <Button onClick={openCourseModal}>+ Хичээл нэмэх</Button>
      </header>

      <section className="min-h-0 flex-1 overflow-hidden border border-zinc-200 bg-white p-4">
        <CourseSearch />
      </section>
    </div>
  );
}
