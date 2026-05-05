import { FormEvent, useState } from "react";
import { Copy, Link2, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScheduleStore } from "@/hooks/useSchedule";
import { cn } from "@/lib/utils";

const emailSamples = [
  "23B1NUM2119@stud.num.edu.mn",
  "b23fa1631@ufe.edu.mn",
  "enkhtuya.a@muls.edu.mn",
  "uh@humanities.mn",
  "MMS24D155@etugen.edu.mn"
];

export function FriendsPage() {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const friends = useScheduleStore((state) => state.friends);
  const selectedFriendId = useScheduleStore((state) => state.selectedFriendId);
  const friendNotice = useScheduleStore((state) => state.friendNotice);
  const currentStudent = useScheduleStore((state) => state.currentStudent);
  const addFriendByEmail = useScheduleStore((state) => state.addFriendByEmail);
  const setSelectedFriend = useScheduleStore((state) => state.setSelectedFriend);
  const inviteLink = `${window.location.origin}?invite=${encodeURIComponent(currentStudent.id)}&school=${encodeURIComponent(currentStudent.school)}`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addFriendByEmail(email);
    setEmail("");
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      <header className="shrink-0 border border-zinc-200 bg-white px-4 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Хувийн холбоо</div>
          <h1 className="mt-1 text-xl font-semibold text-zinc-950">Найзууд</h1>
        </div>
      </header>

      <section className="shrink-0 border border-zinc-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-w-[260px] flex-1"
            placeholder="23B1NUM2119@stud.num.edu.mn"
            aria-label="Найзын имэйл"
          />
          <Button type="submit">
            <UserPlus className="h-4 w-4" />
            Нэмэх
          </Button>
        </form>
        {friendNotice && <div className="mt-2 text-sm text-zinc-500">{friendNotice}</div>}
        <div className="mt-3 text-xs leading-5 text-zinc-500">
          Дэмжих student email format: {emailSamples.join(" · ")}
        </div>
      </section>

      <section className="grid gap-3 border border-zinc-200 bg-white p-4 xl:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Link2 className="h-4 w-4" />
            Invitation link
          </div>
          <div className="mt-2 break-all border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            {inviteLink}
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Энэ линкээр найз тань таны төлөвлөсөн хуваарийг харж, сул суудалтай бол ижил class-г өөрийн төлөвлөгөөндөө
            нэмэх боломжтой.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button variant="outline" onClick={copyInviteLink}>
            <Copy className="h-4 w-4" />
            {copied ? "Хуулагдлаа" : "Хуулах"}
          </Button>
          <a
            href={`mailto:?subject=Миний хуваарийг харах урилга&body=${encodeURIComponent(inviteLink)}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-transparent px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-950 hover:text-zinc-950"
          >
            <Mail className="h-4 w-4" />
            Имэйлээр илгээх
          </a>
        </div>
      </section>

      <section className="scheduler-scrollbar min-h-0 flex-1 overflow-auto border border-zinc-200 bg-white p-4">
        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {friends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              onClick={() => setSelectedFriend(friend.id)}
              className={cn(
                "rounded-sm border px-3 py-3 text-left transition-colors",
                selectedFriendId === friend.id
                  ? "border-teal-500 bg-teal-500/15"
                  : "border-zinc-200 bg-zinc-50 hover:border-zinc-400"
              )}
            >
              <div className="text-sm font-semibold text-zinc-950">{friend.name}</div>
              <div className="mt-1 text-xs text-zinc-500">{friend.email}</div>
              <div className="mt-3 inline-flex rounded-sm border border-zinc-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {friend.group}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
