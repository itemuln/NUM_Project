import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ExternalLink, RefreshCw, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NewsService } from "@/services/NewsService";
import type { NewsFeedCategory, NewsFeedItem } from "@/types";

type FeedFilter = "all" | NewsFeedCategory;
type Priority = "high" | "medium" | "low";

const filterOptions: { value: FeedFilter; label: string }[] = [
  { value: "all", label: "Бүгд" },
  { value: "event", label: "Үйл явдал" },
  { value: "hackathon", label: "Хакатон" },
  { value: "olympiad", label: "Олимпиад" },
  { value: "announcement", label: "Зарлал" },
  { value: "news", label: "Мэдээ" }
];

const categoryLabels: Record<NewsFeedCategory, string> = {
  event: "Үйл явдал",
  news: "Мэдээ",
  announcement: "Зарлал",
  hackathon: "Хакатон",
  olympiad: "Олимпиад"
};

const priorityLabels: Record<Priority, string> = {
  high: "High priority",
  medium: "Medium",
  low: "Low"
};

const priorityClasses: Record<Priority, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-zinc-200 bg-zinc-50 text-zinc-500"
};

const mockEvents = [
  {
    id: "mock-exchange",
    title: "Солилцооны хөтөлбөрийн мэдээллийн өдөр",
    date: "2026-09-12",
    location: "МУИС Номын сан",
    priority: "high" as Priority
  },
  {
    id: "mock-hackathon",
    title: "Student Collaboration Hackathon",
    date: "2026-09-21",
    location: "Хичээлийн байр 3",
    priority: "high" as Priority
  },
  {
    id: "mock-bookfair",
    title: "Used book fair",
    date: "2026-10-04",
    location: "МУИС 2-р байр",
    priority: "medium" as Priority
  }
];

function formatDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function priorityForItem(item: NewsFeedItem): Priority {
  const text = `${item.title} ${item.summary} ${item.organizer ?? ""}`.toLowerCase();

  if (
    [
      "оюутан солилцоо",
      "солилцооны хөтөлбөр",
      "exchange",
      "тэтгэлэг",
      "оюутан",
      "дотуур байр",
      "сургалтын төлбөр",
      "олимпиад",
      "хакатон",
      "өдөрлөг",
      "клуб"
    ].some((keyword) => text.includes(keyword))
  ) {
    return "high";
  }

  if (["сургалт", "семинар", "лекц", "хурал", "ажлын байр"].some((keyword) => text.includes(keyword))) {
    return "medium";
  }

  return "low";
}

function InformationCard({ item, featured = false }: { item: NewsFeedItem; featured?: boolean }) {
  const priority = priorityForItem(item);
  const dateLabel = item.eventDate ? formatDate(item.eventDate) : formatDate(item.publishedAt);

  return (
    <article
      className={cn(
        "group border border-zinc-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-400",
        featured ? "grid gap-4 p-4 xl:grid-cols-[260px_1fr]" : "p-3"
      )}
    >
      {featured && (
        <div className="aspect-[16/11] overflow-hidden border border-zinc-200 bg-zinc-50">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <Sparkles className="h-8 w-8" />
            </div>
          )}
        </div>
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-500">
            {categoryLabels[item.category]}
          </span>
          <span className={cn("border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide", priorityClasses[priority])}>
            {priorityLabels[priority]}
          </span>
        </div>

        <h2 className={cn("mt-3 font-semibold leading-tight text-zinc-950", featured ? "text-2xl" : "text-base")}>
          {item.title}
        </h2>
        {item.summary && (
          <p className={cn("mt-2 text-sm leading-6 text-zinc-500", featured ? "line-clamp-3" : "line-clamp-2")}>
            {item.summary}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLabel}
            {item.eventTime ? ` · ${item.eventTime}` : ""}
          </span>
          {item.location && <span>{item.location}</span>}
          {item.organizer && <span>{item.organizer}</span>}
        </div>

        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-blue-500 hover:text-blue-400"
        >
          news.num.edu.mn дээр унших
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}

export function NewsFeedPage() {
  const [items, setItems] = useState<NewsFeedItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const nextItems = await NewsService.listItems(signal);
      setItems(nextItems);
    } catch (nextError) {
      if (signal?.aborted) return;
      setError(nextError instanceof Error ? nextError.message : "Мэдээ уншиж чадсангүй.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadItems(controller.signal);

    return () => controller.abort();
  }, [loadItems]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items
      .filter((item) => filter === "all" || item.category === filter)
      .filter((item) =>
        normalizedQuery
          ? [item.title, item.summary, item.location, item.organizer]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(normalizedQuery))
          : true
      )
      .sort((first, second) => {
        const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[priorityForItem(first)] - priorityOrder[priorityForItem(second)];
        if (priorityDiff !== 0) return priorityDiff;
        return second.publishedAt.localeCompare(first.publishedAt);
      });
  }, [filter, items, query]);

  const featuredItem = visibleItems[0];
  const restItems = visibleItems.slice(1);
  const highPriorityCount = items.filter((item) => priorityForItem(item) === "high").length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      <header className="shrink-0 border border-zinc-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">NUM information</div>
            <h1 className="mt-1 text-xl font-semibold text-zinc-950">Оюутанд хэрэгтэй мэдээлэл</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              Зөвхөн NUM эх сурвалжаас авсан мэдээ. Оюутанд шууд хамааралтай мэдээллийг high priority болгон эрэмбэлнэ.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-right text-xs text-zinc-500">
            <div className="border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="text-lg font-semibold text-zinc-950">{items.length}</div>
              <div>нийт</div>
            </div>
            <div className="border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="text-lg font-semibold text-zinc-950">{highPriorityCount}</div>
              <div>high</div>
            </div>
          </div>
        </div>
      </header>

      <section className="shrink-0 border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="Солилцоо, тэтгэлэг, олимпиад, өдөрлөгөөр хайх"
            />
          </div>
          <Button variant="outline" onClick={() => void loadItems()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Дахин ачаалах
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {filterOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                "border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                filter === item.value
                  ? "border-blue-500 bg-blue-500/15 text-blue-500"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 hover:text-zinc-950"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="scheduler-scrollbar min-h-0 flex-1 overflow-auto pr-1">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 space-y-4">
            {featuredItem && <InformationCard item={featuredItem} featured />}

            <div className="grid gap-4 lg:grid-cols-2">
              {restItems.map((item) => (
                <InformationCard key={item.id} item={item} />
              ))}
            </div>

            {loading && (
              <div className="border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
                Мэдээ уншиж байна...
              </div>
            )}
            {!loading && !featuredItem && (
              <div className="border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
                Тохирох мэдээлэл олдсонгүй.
              </div>
            )}
            {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          </main>

          <aside className="space-y-4">
            <section className="border border-zinc-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mock events</div>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950">Ойрын арга хэмжээ</h2>
            <div className="mt-4 space-y-3">
              {mockEvents.map((event) => (
                <div key={event.id} className="border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-950">{event.title}</span>
                    <span className={cn("border px-2 py-1 text-[10px] font-semibold uppercase", priorityClasses[event.priority])}>
                      {priorityLabels[event.priority]}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">{formatDate(event.date)} · {event.location}</div>
                </div>
              ))}
            </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
