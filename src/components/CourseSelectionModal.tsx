import { X } from "lucide-react";
import { CourseSearch } from "@/components/CourseSearch";
import { Button } from "@/components/ui/button";
import { useScheduleStore } from "@/hooks/useSchedule";

export function CourseSelectionModal() {
  const isOpen = useScheduleStore((state) => state.isCourseModalOpen);
  const closeCourseModal = useScheduleStore((state) => state.closeCourseModal);
  const setSelectedCourse = useScheduleStore((state) => state.setSelectedCourse);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 py-2 sm:px-4 sm:py-6">
      <section className="flex h-[94dvh] max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white sm:h-[86vh] sm:max-h-[86vh]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-3 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-950">Хичээл нэмэх</h2>
            <p className="mt-1 truncate text-sm text-zinc-500">Код, хичээлийн нэр эсвэл багшаар хайна.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={closeCourseModal} aria-label="Хаах">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-5">
          <CourseSearch compact onCourseSelect={setSelectedCourse} />
        </div>
      </section>
    </div>
  );
}
