import { FormEvent, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useScheduleStore } from "@/hooks/useSchedule";
import { cn } from "@/lib/utils";

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function ChatPanel() {
  const [draft, setDraft] = useState("");
  const selectedCommunityId = useScheduleStore((state) => state.selectedCommunityId);
  const communityMessages = useScheduleStore((state) => state.communityMessages);
  const students = useScheduleStore((state) => state.students);
  const sendCommunityMessage = useScheduleStore((state) => state.sendCommunityMessage);
  const messages = selectedCommunityId ? communityMessages[selectedCommunityId] ?? [] : [];
  const senderById = new Map(students.map((student) => [student.id, student]));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendCommunityMessage(draft);
    setDraft("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          {messages.map((message) => {
            const sender = senderById.get(message.sender_id);
            const isOwn = sender?.id === "student-current";

            return (
              <div key={message.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[236px] rounded-sm border px-3 py-2",
                    isOwn ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-950"
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide",
                      isOwn ? "text-white/60" : "text-zinc-500"
                    )}
                  >
                    <span>{sender?.name ?? "Тодорхойгүй"}</span>
                    <span>{formatMessageTime(message.created_at)}</span>
                  </div>
                  <p className="text-sm leading-5">{message.content}</p>
                </div>
              </div>
            );
          })}

          {messages.length === 0 && (
            <div className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-500">
              Зурвас алга.
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t border-zinc-200 p-3">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Зурвас бичих"
          aria-label="Чатын зурвас"
        />
        <Button type="submit" size="icon" aria-label="Зурвас илгээх">
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
