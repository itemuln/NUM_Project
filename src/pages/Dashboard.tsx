import { UserPlus } from "lucide-react";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import { Button } from "@/components/ui/button";
import { useScheduleStore, useSelectedFriend } from "@/hooks/useSchedule";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const selectedSemester = useScheduleStore((state) => state.selectedSemester);
  const comparisonMode = useScheduleStore((state) => state.comparisonMode);
  const friends = useScheduleStore((state) => state.friends);
  const selectedFriendId = useScheduleStore((state) => state.selectedFriendId);
  const setComparisonMode = useScheduleStore((state) => state.setComparisonMode);
  const setSelectedFriend = useScheduleStore((state) => state.setSelectedFriend);
  const openCourseModal = useScheduleStore((state) => state.openCourseModal);
  const setActivePage = useScheduleStore((state) => state.setActivePage);
  const selectedFriend = useSelectedFriend();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      <header className="shrink-0 border border-zinc-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{selectedSemester}</div>
            <h1 className="mt-1 text-lg font-semibold text-zinc-950 sm:text-xl">Миний долоо хоногийн хуваарь</h1>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <div className="grid grid-cols-2 rounded-md border border-zinc-200 bg-zinc-50 p-1 sm:inline-grid">
              <button
                type="button"
                onClick={() => setComparisonMode(false)}
                className={cn(
                  "h-8 rounded-md px-3 text-sm font-medium transition-colors",
                  !comparisonMode ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
                )}
              >
                Миний хуваарь
              </button>
              <button
                type="button"
                onClick={() => setComparisonMode(true)}
                className={cn(
                  "h-8 rounded-md px-3 text-sm font-medium transition-colors",
                  comparisonMode ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
                )}
              >
                Харьцуулах
              </button>
            </div>

            {comparisonMode && (
              <select
                value={selectedFriendId ?? ""}
                onChange={(event) => setSelectedFriend(event.target.value || null)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-teal-500/20 sm:w-auto"
                aria-label="Харьцуулах найз"
              >
                {friends.map((friend) => (
                  <option key={friend.id} value={friend.id}>
                    {friend.name}
                  </option>
                ))}
              </select>
            )}

            <Button className="w-full sm:w-auto" onClick={openCourseModal}>+ Хичээл нэмэх</Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setActivePage("friends")}>
              <UserPlus className="h-4 w-4" />
              Найз нэмэх
            </Button>
          </div>
        </div>

        {comparisonMode && selectedFriend && (
          <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
            {selectedFriend.name}-ийн хуваарийг давхар харуулж байна. Давхцал улаан, хамтын зав ногооноор тэмдэглэгдэнэ.
          </div>
        )}
        <div className="mt-3 rounded-md border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-sm text-teal-100">
          Энэ бол төлөвлөлтийн орчин. Энд гаргасан хуваариа найзуудтайгаа харьцуулаад, жинхэнэ хичээл сонголтоо
          сургуулийн албан систем дээр баталгаажуулна.
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <ScheduleGrid />
      </div>
    </div>
  );
}
