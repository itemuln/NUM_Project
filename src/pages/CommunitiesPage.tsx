import { BookOpen, GraduationCap, School, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useScheduleStore } from "@/hooks/useSchedule";
import { cn } from "@/lib/utils";
import { CommunityService } from "@/services/CommunityService";
import type { Community, CommunityType } from "@/types";

const typeLabels = {
  school: "Сургуулийн бүлэг",
  class: "Анги / хөтөлбөр",
  major: "Мэргэжил / анги",
  course: "Хичээл"
} satisfies Record<CommunityType, string>;

const typeIcons = {
  school: School,
  class: GraduationCap,
  major: GraduationCap,
  course: BookOpen
} satisfies Record<CommunityType, typeof School>;

const visibleCommunityTypes = ["school", "class"] as const;
const isVisibleCommunityType = (type: CommunityType) => type === "school" || type === "class" || type === "major";

function CommunityCard({ community }: { community: Community }) {
  const selectedCommunityId = useScheduleStore((state) => state.selectedCommunityId);
  const communityMessages = useScheduleStore((state) => state.communityMessages);
  const setSelectedCommunity = useScheduleStore((state) => state.setSelectedCommunity);
  const Icon = typeIcons[community.type];
  const selected = selectedCommunityId === community.id;
  const lastMessage = communityMessages[community.id]?.at(-1);

  return (
    <button
      type="button"
      onClick={() => setSelectedCommunity(community.id)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5",
        selected ? "border-teal-500 bg-teal-500/15" : "border-zinc-200 bg-white hover:border-zinc-400"
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-zinc-950">{community.name}</span>
          <span className="block truncate text-xs text-zinc-500">
            {lastMessage?.content ?? `${community.memberCount} гишүүн · Чат нээх`}
          </span>
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-zinc-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {typeLabels[community.type]}
      </span>
    </button>
  );
}

export function CommunitiesPage() {
  const communities = useScheduleStore((state) => state.communities);
  const currentStudent = useScheduleStore((state) => state.currentStudent);
  const communityMembers = useScheduleStore((state) => state.communityMembers);
  const searchQuery = useScheduleStore((state) => state.searchQuery);
  const setSearchQuery = useScheduleStore((state) => state.setSearchQuery);
  const visibleCommunities = CommunityService.getVisibleCommunities(currentStudent, communities, communityMembers);
  const grouped = CommunityService.groupCommunities(
    visibleCommunities
      .filter((community) => isVisibleCommunityType(community.type))
      .filter((community) => community.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      <header className="shrink-0 border border-zinc-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Messenger хэлбэрийн community</div>
            <h1 className="mt-1 text-xl font-semibold text-zinc-950">Бүлэг чат</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Бүлэг дээр дарахад баруун талд чат нээгдэнэ. Зөвхөн {currentStudent.school} сургуулийн таны харьяалагдах
              бүлгүүд харагдана.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
              placeholder="Бүлэг хайх"
            />
          </div>
        </div>
      </header>

      <div className="scheduler-scrollbar min-h-0 flex-1 overflow-auto">
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleCommunityTypes.map((type) => (
            <section key={type} className="border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{typeLabels[type]}</h2>
              <div className="space-y-2">
                {grouped[type].map((community) => (
                  <CommunityCard key={community.id} community={community} />
                ))}
                {grouped[type].length === 0 && (
                  <div className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-500">
                    Бүлэг олдсонгүй.
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
