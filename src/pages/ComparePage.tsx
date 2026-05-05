import { Badge } from "@/components/ui/badge";
import { useScheduleStore, useSelectedFriend } from "@/hooks/useSchedule";

export function ComparePage() {
  const comparisonMode = useScheduleStore((state) => state.comparisonMode);
  const selectedFriend = useSelectedFriend();

  if (!comparisonMode || !selectedFriend) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1540px] flex-wrap items-center justify-between gap-3 border border-zinc-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Харьцуулалт</div>
          <div className="text-sm font-medium text-zinc-950">
            Таны хуваарь {selectedFriend.name}-ийн хуваарьтай давхар харагдана · {selectedFriend.group}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="lecture">Миний лекц</Badge>
        <Badge variant="seminar">Миний семинар</Badge>
        <Badge variant="danger">Давхцал</Badge>
        <Badge variant="success">Хамтын зав</Badge>
      </div>
    </div>
  );
}
