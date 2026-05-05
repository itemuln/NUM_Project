import { FormEvent, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScheduleStore } from "@/hooks/useSchedule";
import { cn } from "@/lib/utils";

export function TopBar() {
  const [friendEmail, setFriendEmail] = useState("");
  const [friendFormOpen, setFriendFormOpen] = useState(false);
  const userEmail = useScheduleStore((state) => state.userEmail);
  const currentStudent = useScheduleStore((state) => state.currentStudent);
  const comparisonMode = useScheduleStore((state) => state.comparisonMode);
  const databaseReady = useScheduleStore((state) => state.databaseReady);
  const friendNotice = useScheduleStore((state) => state.friendNotice);
  const setComparisonMode = useScheduleStore((state) => state.setComparisonMode);
  const addFriendByEmail = useScheduleStore((state) => state.addFriendByEmail);

  const handleAddFriend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addFriendByEmail(friendEmail);
    setFriendEmail("");
  };

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:px-6">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">МУИС Ухаалаг Хуваарь</div>
        <div className="truncate text-sm font-medium text-zinc-950">
          {userEmail} · {currentStudent.school} · {currentStudent.class_group}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden rounded-sm border border-zinc-200 bg-zinc-50 p-1 sm:flex">
          <button
            type="button"
            onClick={() => setComparisonMode(false)}
            className={cn(
              "h-8 rounded-sm px-3 text-sm font-medium transition-colors",
              !comparisonMode ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
            )}
          >
            Миний хуваарь
          </button>
          <button
            type="button"
            onClick={() => setComparisonMode(true)}
            className={cn(
              "h-8 rounded-sm px-3 text-sm font-medium transition-colors",
              comparisonMode ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
            )}
          >
            Харьцуулах
          </button>
        </div>

        <div className="hidden text-xs font-medium text-zinc-500 md:block">
          Хадгалалт: {databaseReady ? "IndexedDB" : "уншиж байна"}
        </div>

        <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => setFriendFormOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Найз нэмэх
        </Button>
      </div>

      {friendFormOpen && (
        <div className="absolute right-4 top-[calc(100%+8px)] z-50 w-[360px] border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-950">Сургуулийн найз нэмэх</div>
              <div className="text-xs text-zinc-500">Зөвхөн ижил сургуулийн имэйл зөвшөөрнө.</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFriendFormOpen(false)} aria-label="Хаах">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleAddFriend} className="flex gap-2">
            <Input
              value={friendEmail}
              onChange={(event) => setFriendEmail(event.target.value)}
              placeholder="name@stud.num.edu.mn"
              aria-label="Найзын имэйл"
            />
            <Button type="submit">Нэмэх</Button>
          </form>

          {friendNotice && <div className="mt-2 text-xs font-medium text-zinc-500">{friendNotice}</div>}
        </div>
      )}
    </header>
  );
}
