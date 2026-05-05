import { useEffect } from "react";
import { DndContext, pointerWithin } from "@dnd-kit/core";
import { CourseSelectionModal } from "@/components/CourseSelectionModal";
import { OnboardingModal } from "@/components/OnboardingModal";
import { RightContextPanel } from "@/components/RightContextPanel";
import { MobileBottomNav, MobileTopBar, Sidebar } from "@/components/Sidebar";
import { useDragDrop } from "@/hooks/useDragDrop";
import { createDatabaseSnapshot, useScheduleStore } from "@/hooks/useSchedule";
import { CommunitiesPage } from "@/pages/CommunitiesPage";
import { CoursesPage } from "@/pages/CoursesPage";
import { Dashboard } from "@/pages/Dashboard";
import { FriendsPage } from "@/pages/FriendsPage";
import { NewsFeedPage } from "@/pages/NewsFeedPage";
import { BenefitsPage } from "@/pages/BenefitsPage";
import { DatabaseService } from "@/services/DatabaseService";

function ActivePage() {
  const activePage = useScheduleStore((state) => state.activePage);
  let page = <Dashboard />;

  if (activePage === "courses") page = <CoursesPage />;
  if (activePage === "communities") page = <CommunitiesPage />;
  if (activePage === "friends") page = <FriendsPage />;
  if (activePage === "benefits") page = <BenefitsPage />;
  if (activePage === "news") page = <NewsFeedPage />;

  return (
    <div key={activePage} className="h-full animate-page-enter">
      {page}
    </div>
  );
}

export function AppLayout() {
  const { handleDragEnd } = useDragDrop();
  const hydrateFromDatabase = useScheduleStore((state) => state.hydrateFromDatabase);
  const loadCourseCatalog = useScheduleStore((state) => state.loadCourseCatalog);
  const theme = useScheduleStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function boot() {
      await loadCourseCatalog();
      const snapshot = await DatabaseService.loadSnapshot();
      if (!active) return;

      hydrateFromDatabase(snapshot);
      unsubscribe = useScheduleStore.subscribe((state) => {
        if (!state.databaseReady) return;
        void DatabaseService.saveSnapshot(createDatabaseSnapshot(state));
      });
    }

    void boot();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [hydrateFromDatabase, loadCourseCatalog]);

  return (
    <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className="flex h-screen overflow-hidden bg-zinc-100 text-zinc-950 transition-colors duration-300 supports-[height:100dvh]:h-[100dvh]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-5">
            <ActivePage />
          </main>
          <MobileBottomNav />
        </div>
        <RightContextPanel />
      </div>
      <CourseSelectionModal />
      <OnboardingModal />
    </DndContext>
  );
}
