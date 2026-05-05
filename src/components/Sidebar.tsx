import type { PointerEvent as ReactPointerEvent } from "react";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Gift,
  LayoutDashboard,
  MessageSquareText,
  Moon,
  Newspaper,
  Sun,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScheduleStore } from "@/hooks/useSchedule";
import { cn } from "@/lib/utils";
import type { AppPage } from "@/types";

const navItems: { page: AppPage; label: string; icon: typeof LayoutDashboard }[] = [
  { page: "dashboard", label: "Самбар", icon: LayoutDashboard },
  { page: "courses", label: "Хичээлүүд", icon: BookOpen },
  { page: "communities", label: "Бүлгүүд", icon: MessageSquareText },
  { page: "friends", label: "Найзууд", icon: UsersRound },
  { page: "benefits", label: "Ашиг тус", icon: Gift },
  { page: "news", label: "Мэдээлэл", icon: Newspaper }
];

const mobileLabels: Record<AppPage, string> = {
  dashboard: "Самбар",
  courses: "Хичээл",
  communities: "Бүлэг",
  friends: "Найз",
  benefits: "Sale",
  news: "Info"
};

function useNavigationState() {
  const activePage = useScheduleStore((state) => state.activePage);
  const currentStudent = useScheduleStore((state) => state.currentStudent);
  const userEmail = useScheduleStore((state) => state.userEmail);
  const theme = useScheduleStore((state) => state.theme);
  const sidebarCollapsed = useScheduleStore((state) => state.sidebarCollapsed);
  const sidebarWidth = useScheduleStore((state) => state.sidebarWidth);
  const setActivePage = useScheduleStore((state) => state.setActivePage);
  const setSidebarWidth = useScheduleStore((state) => state.setSidebarWidth);
  const toggleSidebar = useScheduleStore((state) => state.toggleSidebar);
  const toggleTheme = useScheduleStore((state) => state.toggleTheme);

  return {
    activePage,
    currentStudent,
    userEmail,
    theme,
    sidebarCollapsed,
    sidebarWidth,
    setActivePage,
    setSidebarWidth,
    toggleSidebar,
    toggleTheme
  };
}

export function Sidebar() {
  const {
    activePage,
    currentStudent,
    userEmail,
    theme,
    sidebarCollapsed,
    sidebarWidth,
    setActivePage,
    setSidebarWidth,
    toggleSidebar,
    toggleTheme
  } = useNavigationState();
  const visualWidth = sidebarCollapsed ? 72 : sidebarWidth;

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setSidebarWidth(startWidth + moveEvent.clientX - startX);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <aside
      className="relative hidden h-screen shrink-0 border-r border-zinc-200 bg-white transition-[width,background-color,border-color] duration-300 lg:flex lg:flex-col"
      style={{ width: visualWidth }}
    >
      <div className={cn("border-b border-zinc-200 py-5", sidebarCollapsed ? "px-3" : "px-5")}>
        <div className="flex items-start justify-between gap-2">
          <div className={cn("min-w-0", sidebarCollapsed && "sr-only")}>
            <div className="truncate text-base font-semibold tracking-normal text-zinc-950">МУИС Хуваарь</div>
            <div className="mt-1 truncate text-xs text-zinc-500">Ухаалаг төлөвлөлт</div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Sidebar нээх хаах">
            {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!sidebarCollapsed && (
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="truncate text-sm font-semibold text-zinc-950">{currentStudent.name}</div>
          <div className="mt-1 truncate text-xs text-zinc-500">{userEmail}</div>
          <div className="mt-2 inline-flex max-w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <span className="truncate">{currentStudent.school} · {currentStudent.class_group}</span>
          </div>
        </div>
      )}

      <nav className={cn("flex-1 space-y-1", sidebarCollapsed ? "p-2" : "p-3")}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = activePage === item.page;

          return (
            <button
              key={item.page}
              type="button"
              onClick={() => setActivePage(item.page)}
              className={cn(
                "group relative flex h-10 w-full items-center overflow-hidden rounded-md border text-sm font-medium transition-all duration-200 ease-out hover:translate-x-1",
                sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3",
                selected
                  ? "border-red-500/40 bg-red-500/15 text-red-400"
                  : "border-transparent text-zinc-500 hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-red-500 opacity-0 transition-opacity duration-200",
                  selected && "opacity-100"
                )}
              />
              <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              {!sidebarCollapsed && item.label}
            </button>
          );
        })}
      </nav>

      <div className={cn("border-t border-zinc-200", sidebarCollapsed ? "p-2" : "p-3")}>
        <Button
          variant="outline"
          size={sidebarCollapsed ? "icon" : "md"}
          className={cn("mb-2 w-full", !sidebarCollapsed && "justify-start")}
          onClick={toggleTheme}
          aria-label="Theme солих"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!sidebarCollapsed && (theme === "dark" ? "Өдрийн горим" : "Шөнийн горим")}
        </Button>
        <Button
          variant="secondary"
          size={sidebarCollapsed ? "icon" : "md"}
          className={cn("w-full", !sidebarCollapsed && "justify-start")}
          onClick={() => setActivePage("courses")}
          aria-label="Хичээл нэмэх"
        >
          <BookOpen className="h-4 w-4" />
          {!sidebarCollapsed && "Хичээл нэмэх"}
        </Button>
      </div>

      {!sidebarCollapsed && (
        <button
          type="button"
          className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none rounded-full bg-transparent transition-colors hover:bg-red-500/40"
          onPointerDown={handleResizeStart}
          aria-label="Sidebar хэмжээ өөрчлөх"
        />
      )}
    </aside>
  );
}

export function MobileTopBar() {
  const { activePage, currentStudent, userEmail, theme, toggleTheme } = useNavigationState();
  const activeItem = navItems.find((item) => item.page === activePage) ?? navItems[0];

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-3 py-2.5 transition-colors duration-300 lg:hidden">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-950">University Scheduler</div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-500">
          <span className="shrink-0">{activeItem.label}</span>
          <span className="text-zinc-300">/</span>
          <span className="truncate">{userEmail}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 min-[390px]:inline-flex">
          {currentStudent.school}
        </span>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Theme солих">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const { activePage, setActivePage } = useNavigationState();

  return (
    <nav className="shrink-0 border-t border-zinc-200 bg-white px-2 py-2 transition-colors duration-300 lg:hidden">
      <div className="scheduler-scrollbar flex gap-1 overflow-x-auto pb-[max(env(safe-area-inset-bottom),0px)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = activePage === item.page;

          return (
            <button
              key={item.page}
              type="button"
              onClick={() => setActivePage(item.page)}
              className={cn(
                "flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold transition-all duration-200",
                selected
                  ? "border-red-500/40 bg-red-500/15 text-red-400"
                  : "border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
              )}
              aria-current={selected ? "page" : undefined}
            >
              <Icon className="h-4 w-4" />
              <span>{mobileLabels[item.page]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
