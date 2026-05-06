import { useDraggable } from "@dnd-kit/core";
import { CalendarPlus, Check, Clock3, GripVertical, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { days } from "@/data/seedData";
import { formatMinutes } from "@/hooks/useDragDrop";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";

interface CourseCardProps {
  course: Course;
  scheduled?: boolean;
  onAdd?: () => void;
}

const kindLabels = {
  lecture: "Лекц",
  seminar: "Семинар",
  lab: "Лаб"
};

const dayLabels = new Map(days.map((day) => [day.key, day.label]));

function Rating({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-zinc-500">
      <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${value} од`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn("h-3.5 w-3.5", index < Math.round(value) ? "fill-current" : "fill-transparent")}
            strokeWidth={1.8}
          />
        ))}
      </div>
      <span className="font-medium text-zinc-700">{value.toFixed(1)}</span>
      <span>({count})</span>
    </div>
  );
}

export function CourseCard({ course, scheduled = false, onAdd }: CourseCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `course-${course.id}`,
    disabled: scheduled,
    data: {
      dragType: "course-card",
      courseId: course.id,
      duration: course.preferredDuration
    }
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-md border border-zinc-200 bg-white p-3 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-red-500/40",
        scheduled && "opacity-70",
        isDragging && "z-50 scale-[1.02] opacity-80"
      )}
      {...attributes}
      {...(scheduled ? {} : listeners)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{course.code}</span>
            <Badge variant={course.kind}>{kindLabels[course.kind]}</Badge>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-zinc-950">{course.name}</h3>
        </div>
        {scheduled ? (
          <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
        ) : (
          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-700" />
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs text-zinc-500">
          <span className="font-medium text-zinc-700">{course.teacher}</span>
          <span className="mx-1.5 text-zinc-300">/</span>
          <span>{course.room}</span>
        </div>
        {course.day && course.startMinutes !== undefined && course.endMinutes !== undefined && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Clock3 className="h-3.5 w-3.5" />
            {dayLabels.get(course.day) ?? course.day} · {formatMinutes(course.startMinutes)} -{" "}
            {formatMinutes(course.endMinutes)}
          </div>
        )}
        <Rating value={course.rating} count={course.reviewCount} />
      </div>

      {onAdd && (
        <Button
          variant={scheduled ? "ghost" : "secondary"}
          size="sm"
          className="mt-3 w-full"
          disabled={scheduled}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
        >
          {scheduled ? <Check className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
          {scheduled ? "Нэмэгдсэн" : "Хуваарьт нэмэх"}
        </Button>
      )}
    </article>
  );
}
