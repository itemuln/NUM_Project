import { create } from "zustand";
import {
  courses as seedCourses,
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  friends as seedFriends,
  groups as seedGroups,
  MIN_BLOCK_DURATION,
  mySchedule as seedSchedule,
  currentUserEmail,
  students as seedStudents,
  SLOT_MINUTES
} from "@/data/seedData";
import { ChatService } from "@/services/ChatService";
import { CommunityService } from "@/services/CommunityService";
import type {
  AppDatabaseSnapshot,
  AppPage,
  BoardPost,
  BuyRequest,
  Community,
  CommunityChatMessage,
  CommunityMember,
  Course,
  DayKey,
  Friend,
  Group,
  MarketplaceItem,
  RightContextType,
  ScheduleItem,
  SchoolEvent,
  Student,
  ThemeMode
} from "@/types";

interface ScheduleState {
  userEmail: string;
  currentStudent: Student;
  students: Student[];
  courses: Course[];
  currentUserSchedule: ScheduleItem[];
  friends: Friend[];
  groups: Group[];
  schoolEvents: SchoolEvent[];
  boardPosts: BoardPost[];
  marketplaceItems: MarketplaceItem[];
  buyRequests: BuyRequest[];
  communities: Community[];
  communityMembers: CommunityMember[];
  isOnboarded: boolean;
  activePage: AppPage;
  rightContext: RightContextType | null;
  isCourseModalOpen: boolean;
  selectedCourseId: string | null;
  selectedSemester: string;
  semesterOptions: string[];
  catalogLoaded: boolean;
  databaseReady: boolean;
  scheduleNotice: string | null;
  friendNotice: string | null;
  selectedCommunityId: string | null;
  communityMessages: Record<string, CommunityChatMessage[]>;
  searchQuery: string;
  courseSearchQuery: string;
  selectedFriendId: string | null;
  comparisonMode: boolean;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  rightPanelWidth: number;
  theme: ThemeMode;
  setComparisonMode: (enabled: boolean) => void;
  completeOnboarding: (input: { email: string; program: string; year: string; classGroup: string }) => void;
  setActivePage: (page: AppPage) => void;
  openCourseModal: () => void;
  closeCourseModal: () => void;
  setRightContext: (context: RightContextType | null) => void;
  setSelectedFriend: (friendId: string | null) => void;
  setSelectedCommunity: (communityId: string) => void;
  setSelectedCourse: (courseId: string | null) => void;
  setSelectedSemester: (semester: string) => void;
  setSearchQuery: (query: string) => void;
  setCourseSearchQuery: (query: string) => void;
  clearNotices: () => void;
  loadCourseCatalog: () => Promise<void>;
  hydrateFromDatabase: (snapshot: AppDatabaseSnapshot | null) => void;
  addFriendByEmail: (email: string) => void;
  addCourseFromCatalog: (courseId: string) => void;
  removeScheduleItem: (itemId: string) => void;
  removeCourseFromSchedule: (courseId: string) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  toggleTheme: () => void;
  addScheduleItem: (courseId: string, day: DayKey, startMinutes: number, duration?: number) => void;
  moveScheduleItem: (itemId: string, day: DayKey, startMinutes: number) => void;
  resizeScheduleItem: (itemId: string, endMinutes: number) => void;
  sendCommunityMessage: (body: string) => void;
  addBoardPost: (content: string) => void;
  addMarketplaceItem: (input: {
    title: string;
    price: string;
    condition: string;
    location: string;
    description: string;
  }) => void;
  sendBuyRequest: (itemId: string, message: string) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const snapToSlot = (minutes: number) => Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;

const unique = <T>(items: T[]) => Array.from(new Set(items));

const createScheduleId = (prefix: string) => {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
};

const detectedCurrentStudent = CommunityService.detectStudentIdentity({
  id: "student-current",
  email: currentUserEmail,
  name: "Та",
  program: "Олон нийтийн харилцаа",
  year: "3-р курс",
  classGroup: "PR-3A",
  enrolledCourseIds: seedSchedule.map((item) => item.courseId),
  isOnline: true
});

const initialStudents = [
  detectedCurrentStudent,
  ...seedStudents.filter((student) => student.id !== detectedCurrentStudent.id)
];

const initialCommunityAssignment = CommunityService.buildCommunities(initialStudents, seedCourses);

const initialSelectedCommunityId =
  initialCommunityAssignment.communities.find(
    (community) => community.type === "class" && community.reference_id === detectedCurrentStudent.class_group
  )?.id ??
  initialCommunityAssignment.communities.find((community) => community.type === "school")?.id ??
  initialCommunityAssignment.communities[0]?.id ??
  null;

const findCommunityId = (type: Community["type"], referenceId: string) =>
  initialCommunityAssignment.communities.find(
    (community) => community.type === type && community.reference_id === referenceId
  )?.id;

const classCommunityId = findCommunityId("class", detectedCurrentStudent.class_group);
const schoolCommunityId = findCommunityId("school", detectedCurrentStudent.school);
const policyCourseCommunityId = findCommunityId("course", "course-policy-analysis");

const initialCommunityMessages: CommunityChatMessage[] = [
  ...(schoolCommunityId
    ? [
        {
          id: "community-message-school-1",
          sender_id: "student-anu",
          community_id: schoolCommunityId,
          content: "Намрын улирлын хуваариа харьцуулж эхэлсэн хүн байна уу?",
          created_at: "2026-05-05T08:14:00.000Z"
        }
      ]
    : []),
  ...(classCommunityId
    ? [
        {
          id: "community-message-class-1",
          sender_id: "student-current",
          community_id: classCommunityId,
          content: "PR семинараа Мягмар гарагт орууллаа. Бүлэгт тохирч байна уу?",
          created_at: "2026-05-05T08:18:00.000Z"
        },
        {
          id: "community-message-class-2",
          sender_id: "student-anu",
          community_id: classCommunityId,
          content: "Миний хувьд Мягмарын үдээс хойш завтай.",
          created_at: "2026-05-05T08:20:00.000Z"
        }
      ]
    : []),
  ...(policyCourseCommunityId
    ? [
        {
          id: "community-message-course-1",
          sender_id: "student-saruul",
          community_id: policyCourseCommunityId,
          content: "Бодлогын анализын өрөө өнгөрсөн долоо хоногт 5-р байр болсон.",
          created_at: "2026-05-05T08:26:00.000Z"
        }
      ]
    : [])
];

const chatService = new ChatService(initialCommunityMessages);

const initialSchoolEvents: SchoolEvent[] = [
  {
    id: "event-registration",
    school: "MUIS",
    title: "Албан ёсны хичээл сонголт эхлэх өдөр",
    date: "2026-08-20",
    location: "Сургуулийн систем"
  },
  {
    id: "event-orientation",
    school: "MUIS",
    title: "Шинэ улирлын зөвлөгөө уулзалт",
    date: "2026-08-24",
    location: "Хичээлийн байр 2"
  },
  {
    id: "event-hackathon",
    school: "MUIS",
    title: "Student Schedule Hackathon",
    date: "2026-09-06",
    location: "МУИС Номын сан"
  },
  {
    id: "event-olympiad",
    school: "MUIS",
    title: "Мэдээллийн системийн оюутны олимпиад",
    date: "2026-09-18",
    location: "Хичээлийн байр 3"
  }
];

const initialBoardPosts: BoardPost[] = classCommunityId
  ? [
      {
        id: "board-post-1",
        community_id: classCommunityId,
        sender_id: "student-anu",
        content: "Энэ апп дээр зөвхөн төлөвлөгөө гаргаад, жинхэнэ сонголтоо сургуулийн систем дээр баталгаажуулна.",
        created_at: "2026-05-05T08:12:00.000Z"
      }
    ]
  : [];

const rebuildCommunityState = (students: Student[], courses: Course[]) =>
  CommunityService.buildCommunities(students, courses);

const semesterKey = (course: Course) => `${course.year ?? "2025-2026"} · ${course.semester ?? "Намрын улирал"}`;

const defaultSemester = "2025-2026 · Намрын улирал";

const getSemesterOptions = (courses: Course[]) =>
  Array.from(new Set(courses.map(semesterKey))).sort((first, second) => second.localeCompare(first));

const getEnrollmentCourseId = (course: Course) => course.communityCourseId ?? course.id;

const getScheduleEnrollmentCourseId = (item: ScheduleItem) => item.communityCourseId ?? item.courseId;

const isSchedulableCourse = (course: Course) =>
  Boolean(course.day) && course.startMinutes !== undefined && course.endMinutes !== undefined;

const hasScheduledClass = (schedule: ScheduleItem[], course: Course) =>
  schedule.some((item) => {
    if (getScheduleEnrollmentCourseId(item) === getEnrollmentCourseId(course) && item.kind === course.kind) {
      return true;
    }

    if (course.sourceScheduleId && item.sourceScheduleId === course.sourceScheduleId) return true;
    if (
      course.day &&
      course.startMinutes !== undefined &&
      course.endMinutes !== undefined &&
      item.courseName === course.name &&
      item.teacher === course.teacher &&
      item.day === course.day &&
      item.startMinutes === course.startMinutes &&
      item.endMinutes === course.endMinutes
    ) {
      return true;
    }
    return item.courseId === course.id;
  });

const courseHasTimeConflict = (course: Course, schedule: ScheduleItem[]) => {
  if (!isSchedulableCourse(course)) return false;

  return schedule.some(
    (item) =>
      item.day === course.day &&
      course.startMinutes! < item.endMinutes &&
      item.startMinutes < course.endMinutes!
  );
};

const findCompanionCourse = (course: Course, courses: Course[], schedule: ScheduleItem[]) => {
  const targetKind = course.kind === "lecture" ? "seminar" : "lecture";
  const courseGroupId = getEnrollmentCourseId(course);

  const candidates = courses.filter(
    (candidate) =>
      candidate.id !== course.id &&
      candidate.kind === targetKind &&
      getEnrollmentCourseId(candidate) === courseGroupId &&
      semesterKey(candidate) === semesterKey(course) &&
      isSchedulableCourse(candidate) &&
      !hasScheduledClass(schedule, candidate)
  );

  return (
    candidates.sort((first, second) => {
      const firstConflicts = courseHasTimeConflict(first, schedule) ? 1 : 0;
      const secondConflicts = courseHasTimeConflict(second, schedule) ? 1 : 0;

      if (firstConflicts !== secondConflicts) return firstConflicts - secondConflicts;
      if (first.day !== second.day) return first.day!.localeCompare(second.day!);
      return first.startMinutes! - second.startMinutes!;
    })[0] ?? null
  );
};

const createScheduleItemFromCatalogCourse = (course: Course) =>
  createScheduleItemFromCourse(
    course,
    course.day!,
    course.startMinutes!,
    course.endMinutes ? course.endMinutes - course.startMinutes! : course.preferredDuration
  );

const createScheduleItemFromCourse = (
  course: Course,
  day: DayKey,
  startMinutes: number,
  duration?: number
): ScheduleItem => {
  const blockDuration = duration ?? course.preferredDuration;
  const snappedStart = snapToSlot(startMinutes);
  const boundedStart = clamp(snappedStart, DAY_START_MINUTES, DAY_END_MINUTES - blockDuration);

  return {
    id: createScheduleId("schedule"),
    courseId: course.id,
    sourceScheduleId: course.sourceScheduleId,
    communityCourseId: course.communityCourseId,
    courseName: course.name,
    teacher: course.teacher,
    room: course.room,
    day,
    startMinutes: boundedStart,
    endMinutes: boundedStart + blockDuration,
    kind: course.kind
  };
};

const mergeCourses = (baseCourses: Course[], importedCourses: Course[]) => {
  const byId = new Map<string, Course>();
  [...baseCourses, ...importedCourses].forEach((course) => {
    byId.set(course.id, course);
  });
  return Array.from(byId.values());
};

const createStudentIdFromEmail = (email: string) =>
  `student-${email.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

const createFriendFromStudent = (student: Student, schedule: ScheduleItem[] = []): Friend => ({
  id: `friend-${student.id}`,
  studentId: student.id,
  name: student.name,
  email: student.email,
  group: student.class_group,
  accent: "#14b8a6",
  schedule
});

const createPostId = () => createScheduleId("board-post");

const createMarketplaceId = () => createScheduleId("market");

const createBuyRequestId = () => createScheduleId("buy-request");

const anonymousHandle = (studentId: string) => {
  const hash = Array.from(studentId).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return `Anonymous #${String(1000 + (hash % 9000)).padStart(4, "0")}`;
};

const validAppPages: AppPage[] = ["dashboard", "courses", "communities", "friends", "benefits", "news"];

const normalizeActivePage = (page?: string | null): AppPage =>
  validAppPages.includes(page as AppPage) ? (page as AppPage) : "dashboard";

const clampSidebarWidth = (width: number) => clamp(Math.round(width), 220, 360);
const clampRightPanelWidth = (width: number) => clamp(Math.round(width), 300, 460);

const initialMarketplaceItems: MarketplaceItem[] = [
  {
    id: "market-book-db",
    seller_id: "student-anu",
    anonymousSeller: "Anonymous #2481",
    title: "Database Systems ном",
    price: "35,000₮",
    condition: "Сайн",
    location: "МУИС 3-р байр",
    description: "Хичээлийн тэмдэглэлтэй, хавтас цэвэр.",
    created_at: "2026-05-05T08:35:00.000Z"
  },
  {
    id: "market-calculator",
    seller_id: "student-saruul",
    anonymousSeller: "Anonymous #9140",
    title: "Scientific calculator",
    price: "28,000₮",
    condition: "Дунд",
    location: "МУИС 2-р байр",
    description: "Статистик, математикийн хичээлд ашигласан.",
    created_at: "2026-05-05T08:42:00.000Z"
  },
  {
    id: "market-notes",
    seller_id: "student-anu",
    anonymousSeller: "Anonymous #5502",
    title: "Discrete Math notes",
    price: "10,000₮",
    condition: "PDF + print",
    location: "Онлайн",
    description: "Дасгал бодлогын товч тайлбартай.",
    created_at: "2026-05-05T08:48:00.000Z"
  }
];

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  userEmail: currentUserEmail,
  currentStudent: detectedCurrentStudent,
  students: initialStudents,
  courses: seedCourses,
  currentUserSchedule: seedSchedule,
  friends: seedFriends,
  groups: seedGroups,
  schoolEvents: initialSchoolEvents,
  boardPosts: initialBoardPosts,
  marketplaceItems: initialMarketplaceItems,
  buyRequests: [],
  communities: initialCommunityAssignment.communities,
  communityMembers: initialCommunityAssignment.members,
  isOnboarded: false,
  activePage: "dashboard",
  rightContext: null,
  isCourseModalOpen: false,
  selectedCourseId: null,
  selectedSemester: defaultSemester,
  semesterOptions: getSemesterOptions(seedCourses),
  catalogLoaded: false,
  databaseReady: false,
  scheduleNotice: null,
  friendNotice: null,
  selectedCommunityId: initialSelectedCommunityId,
  communityMessages: chatService.getAllMessages(),
  searchQuery: "",
  courseSearchQuery: "",
  selectedFriendId: seedFriends[0]?.id ?? null,
  comparisonMode: false,
  sidebarCollapsed: false,
  sidebarWidth: 260,
  rightPanelWidth: 320,
  theme: "dark",
  setComparisonMode: (enabled) =>
    set((state) => ({
      comparisonMode: enabled,
      selectedFriendId: enabled ? state.selectedFriendId ?? state.friends[0]?.id ?? null : state.selectedFriendId
    })),
  completeOnboarding: (input) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const nextStudent = CommunityService.detectStudentIdentity({
      id: "student-current",
      email: normalizedEmail,
      name: "Та",
      program: input.program.trim() || "Тодорхойгүй хөтөлбөр",
      year: input.year,
      classGroup: input.classGroup.trim() || "Тодорхойгүй",
      enrolledCourseIds: get().currentUserSchedule.map((item) => item.communityCourseId ?? item.courseId),
      isOnline: true
    });

    set((state) => {
      const students = state.students.map((student) =>
        student.id === nextStudent.id ? nextStudent : student
      );
      const assignment = rebuildCommunityState(students, state.courses);

      return {
        userEmail: normalizedEmail,
        currentStudent: nextStudent,
        students,
        communities: assignment.communities,
        communityMembers: assignment.members,
        isOnboarded: true
      };
    });
  },
  setActivePage: (page) => set({ activePage: page }),
  openCourseModal: () => set({ isCourseModalOpen: true, scheduleNotice: null }),
  closeCourseModal: () => set({ isCourseModalOpen: false }),
  setRightContext: (context) => set({ rightContext: context }),
  setSelectedFriend: (friendId) =>
    set({
      selectedFriendId: friendId,
      rightContext: friendId ? "friend" : null
    }),
  setSelectedCommunity: (communityId) => set({ selectedCommunityId: communityId, rightContext: "community" }),
  setSelectedCourse: (courseId) => set({ selectedCourseId: courseId, rightContext: courseId ? "course" : null }),
  setSelectedSemester: (semester) => set({ selectedSemester: semester }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCourseSearchQuery: (query) => set({ courseSearchQuery: query }),
  clearNotices: () => set({ scheduleNotice: null, friendNotice: null }),
  loadCourseCatalog: async () => {
    if (get().catalogLoaded) return;

    const response = await fetch("/data/course-catalog.json");
    const importedCourses = (await response.json()) as Course[];

    set((state) => {
      const courses = mergeCourses(state.courses, importedCourses);
      const assignment = rebuildCommunityState(state.students, courses);

      return {
        courses,
        semesterOptions: getSemesterOptions(courses),
        communities: assignment.communities,
        communityMembers: assignment.members,
        catalogLoaded: true
      };
    });
  },
  hydrateFromDatabase: (snapshot) => {
    if (!snapshot) {
      set({ databaseReady: true });
      return;
    }

    set((state) => {
      const assignment = rebuildCommunityState(snapshot.students, state.courses);

      return {
        ...snapshot,
        userEmail: snapshot.currentStudent.email,
        activePage: normalizeActivePage(snapshot.activePage),
        selectedCourseId: snapshot.selectedCourseId ?? null,
        isOnboarded: snapshot.isOnboarded ?? false,
        boardPosts: snapshot.boardPosts ?? state.boardPosts,
        marketplaceItems: snapshot.marketplaceItems ?? state.marketplaceItems,
        buyRequests: snapshot.buyRequests ?? state.buyRequests,
        theme: snapshot.theme ?? state.theme,
        sidebarCollapsed: snapshot.sidebarCollapsed ?? state.sidebarCollapsed,
        sidebarWidth: snapshot.sidebarWidth ? clampSidebarWidth(snapshot.sidebarWidth) : state.sidebarWidth,
        rightPanelWidth: snapshot.rightPanelWidth
          ? clampRightPanelWidth(snapshot.rightPanelWidth)
          : state.rightPanelWidth,
        rightContext: null,
        isCourseModalOpen: false,
        communities: assignment.communities,
        communityMembers: assignment.members,
        semesterOptions: getSemesterOptions(state.courses),
        databaseReady: true
      };
    });
  },
  addFriendByEmail: (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    const state = get();
    const school = CommunityService.detectSchoolFromEmail(normalizedEmail);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      set({ friendNotice: "Имэйл хаяг буруу байна." });
      return;
    }

    if (school !== state.currentStudent.school) {
      set({ friendNotice: "Зөвхөн нэг сургуулийн оюутныг найзаар нэмнэ." });
      return;
    }

    if (normalizedEmail === state.currentStudent.email.toLowerCase()) {
      set({ friendNotice: "Өөрийгөө найзаар нэмэх боломжгүй." });
      return;
    }

    if (state.friends.some((friend) => friend.email.toLowerCase() === normalizedEmail)) {
      set({ friendNotice: "Энэ оюутан аль хэдийн найзын жагсаалтад байна." });
      return;
    }

    const existingStudent = state.students.find((student) => student.email.toLowerCase() === normalizedEmail);
    const student =
      existingStudent ??
      CommunityService.detectStudentIdentity({
        id: createStudentIdFromEmail(normalizedEmail),
        email: normalizedEmail,
        name: normalizedEmail.split("@")[0],
        program: "Ерөнхий хөтөлбөр",
        year: "1-р курс",
        classGroup: "Тодорхойгүй",
        enrolledCourseIds: [],
        isOnline: false
      });
    const knownFriend = state.friends.find((friend) => friend.studentId === student.id);
    const newFriend = knownFriend ?? createFriendFromStudent(student);
    const nextStudents = existingStudent ? state.students : [...state.students, student];
    const nextFriends = [...state.friends, newFriend];
    const assignment = rebuildCommunityState(nextStudents, state.courses);

    set({
      students: nextStudents,
      friends: nextFriends,
      selectedFriendId: newFriend.id,
      communities: assignment.communities,
      communityMembers: assignment.members,
      friendNotice: "Найз амжилттай нэмэгдлээ."
    });
  },
  addCourseFromCatalog: (courseId) => {
    const state = get();
    const course = state.courses.find((item) => item.id === courseId);
    if (!course || !isSchedulableCourse(course)) return;

    if (hasScheduledClass(state.currentUserSchedule, course)) {
      set({ scheduleNotice: "Энэ хичээлийн энэ төрлийн цаг таны хуваарьт аль хэдийн байна." });
      return;
    }

    const newItem = createScheduleItemFromCatalogCourse(course);
    const companionCourse = findCompanionCourse(course, state.courses, [...state.currentUserSchedule, newItem]);
    const newItems = companionCourse
      ? [newItem, createScheduleItemFromCatalogCourse(companionCourse)]
      : [newItem];
    const enrollmentCourseId = getEnrollmentCourseId(course);
    const nextCurrentStudent = {
      ...state.currentStudent,
      enrolledCourseIds: unique([...state.currentStudent.enrolledCourseIds, enrollmentCourseId])
    };
    const nextStudents = state.students.map((student) =>
      student.id === state.currentStudent.id ? nextCurrentStudent : student
    );
    const assignment = rebuildCommunityState(nextStudents, state.courses);

    set({
      currentUserSchedule: [...state.currentUserSchedule, ...newItems],
      currentStudent: nextCurrentStudent,
      students: nextStudents,
      communities: assignment.communities,
      communityMembers: assignment.members,
      scheduleNotice:
        newItems.length > 1
          ? "Лекц болон семинар хуваарьт хамт нэмэгдлээ."
          : "Хичээл хуваарьт нэмэгдлээ."
    });
  },
  removeScheduleItem: (itemId) =>
    set((state) => {
      const nextSchedule = state.currentUserSchedule.filter((item) => item.id !== itemId);
      const nextCourseIds = unique(nextSchedule.map((item) => item.communityCourseId ?? item.courseId));
      const nextCurrentStudent = {
        ...state.currentStudent,
        enrolledCourseIds: nextCourseIds
      };
      const nextStudents = state.students.map((student) =>
        student.id === state.currentStudent.id ? nextCurrentStudent : student
      );
      const assignment = rebuildCommunityState(nextStudents, state.courses);

      return {
        currentUserSchedule: nextSchedule,
        currentStudent: nextCurrentStudent,
        students: nextStudents,
        communities: assignment.communities,
        communityMembers: assignment.members,
        scheduleNotice: "Хичээл хуваариас хасагдлаа."
      };
    }),
  removeCourseFromSchedule: (courseId) => {
    const state = get();
    const course = state.courses.find((item) => item.id === courseId);
    const nextSchedule = state.currentUserSchedule.filter((item) => {
      if (item.courseId === courseId) return false;
      if (course?.sourceScheduleId && item.sourceScheduleId === course.sourceScheduleId) return false;
      return true;
    });

    if (nextSchedule.length === state.currentUserSchedule.length) return;

    const nextCourseIds = unique(nextSchedule.map((item) => item.communityCourseId ?? item.courseId));
    const nextCurrentStudent = {
      ...state.currentStudent,
      enrolledCourseIds: nextCourseIds
    };
    const nextStudents = state.students.map((student) =>
      student.id === state.currentStudent.id ? nextCurrentStudent : student
    );
    const assignment = rebuildCommunityState(nextStudents, state.courses);

    set({
      currentUserSchedule: nextSchedule,
      currentStudent: nextCurrentStudent,
      students: nextStudents,
      communities: assignment.communities,
      communityMembers: assignment.members,
      scheduleNotice: "Хичээл хуваариас хасагдлаа."
    });
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarWidth: (width) => set({ sidebarWidth: clampSidebarWidth(width), sidebarCollapsed: false }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: clampRightPanelWidth(width) }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  addScheduleItem: (courseId, day, startMinutes, duration) => {
    const course = get().courses.find((item) => item.id === courseId);
    if (!course) return;

    if (hasScheduledClass(get().currentUserSchedule, course)) {
      set({ scheduleNotice: "Энэ хичээлийн энэ төрлийн цаг таны хуваарьт аль хэдийн байна." });
      return;
    }

    const newItem = createScheduleItemFromCourse(course, day, startMinutes, duration);
    const enrollmentCourseId = getEnrollmentCourseId(course);

    set((state) => ({
      currentUserSchedule: [...state.currentUserSchedule, newItem],
      currentStudent: {
        ...state.currentStudent,
        enrolledCourseIds: unique([...state.currentStudent.enrolledCourseIds, enrollmentCourseId])
      },
      students: state.students.map((student) =>
        student.id === state.currentStudent.id
          ? {
              ...student,
              enrolledCourseIds: unique([...student.enrolledCourseIds, enrollmentCourseId])
            }
          : student
      ),
      scheduleNotice: "Хичээл хуваарьт нэмэгдлээ."
    }));

    set((state) => {
      const assignment = rebuildCommunityState(state.students, state.courses);

      return {
        communities: assignment.communities,
        communityMembers: assignment.members
      };
    });
  },
  moveScheduleItem: (itemId, day, startMinutes) =>
    set((state) => ({
      currentUserSchedule: state.currentUserSchedule.map((item) => {
        if (item.id !== itemId) return item;

        const duration = item.endMinutes - item.startMinutes;
        const snappedStart = snapToSlot(startMinutes);
        const boundedStart = clamp(snappedStart, DAY_START_MINUTES, DAY_END_MINUTES - duration);

        return {
          ...item,
          day,
          startMinutes: boundedStart,
          endMinutes: boundedStart + duration
        };
      })
    })),
  resizeScheduleItem: (itemId, endMinutes) =>
    set((state) => ({
      currentUserSchedule: state.currentUserSchedule.map((item) => {
        if (item.id !== itemId) return item;

        const snappedEnd = snapToSlot(endMinutes);
        const minimumEnd = item.startMinutes + MIN_BLOCK_DURATION;

        return {
          ...item,
          endMinutes: clamp(snappedEnd, minimumEnd, DAY_END_MINUTES)
        };
      })
    })),
  sendCommunityMessage: (body) => {
    const trimmedBody = body.trim();
    if (!trimmedBody) return;

    const state = get();
    if (!state.selectedCommunityId) return;

    const message = chatService.sendMessage({
      communityId: state.selectedCommunityId,
      senderId: state.currentStudent.id,
      content: trimmedBody
    });

    if (!message) return;

    set((currentState) => ({
      communityMessages: {
        ...currentState.communityMessages,
        [message.community_id]: [
          ...(currentState.communityMessages[message.community_id] ?? []),
          message
        ]
      }
    }));
  },
  addBoardPost: (content) => {
    const trimmed = content.trim();
    const state = get();
    if (!trimmed || !state.selectedCommunityId) return;

    set((currentState) => ({
      boardPosts: [
        {
          id: createPostId(),
          community_id: state.selectedCommunityId!,
          sender_id: state.currentStudent.id,
          content: trimmed,
          created_at: new Date().toISOString()
        },
        ...currentState.boardPosts
      ]
    }));
  },
  addMarketplaceItem: (input) => {
    const title = input.title.trim();
    const price = input.price.trim();
    const condition = input.condition.trim();
    const location = input.location.trim();
    const description = input.description.trim();
    const state = get();

    if (!title || !price || !condition || !location) return;

    set((currentState) => ({
      marketplaceItems: [
        {
          id: createMarketplaceId(),
          seller_id: state.currentStudent.id,
          anonymousSeller: anonymousHandle(state.currentStudent.id),
          title,
          price,
          condition,
          location,
          description,
          created_at: new Date().toISOString()
        },
        ...currentState.marketplaceItems
      ]
    }));
  },
  sendBuyRequest: (itemId, message) => {
    const state = get();
    const item = state.marketplaceItems.find((marketplaceItem) => marketplaceItem.id === itemId);
    if (!item || item.seller_id === state.currentStudent.id) return;

    const existingRequest = state.buyRequests.find(
      (request) => request.item_id === itemId && request.buyer_id === state.currentStudent.id
    );

    if (existingRequest) return;

    set((currentState) => ({
      buyRequests: [
        {
          id: createBuyRequestId(),
          item_id: itemId,
          buyer_id: state.currentStudent.id,
          seller_id: item.seller_id,
          message: message.trim() || "Сайн байна уу, энэ барааг авах хүсэлтэй байна.",
          status: "sent",
          created_at: new Date().toISOString()
        },
        ...currentState.buyRequests
      ]
    }));
  }
}));

export const useSelectedFriend = () =>
  useScheduleStore((state) => state.friends.find((friend) => friend.id === state.selectedFriendId) ?? null);

export const useSelectedCommunity = () =>
  useScheduleStore((state) => state.communities.find((community) => community.id === state.selectedCommunityId) ?? null);

export const createDatabaseSnapshot = (state: ScheduleState): AppDatabaseSnapshot => ({
  currentStudent: state.currentStudent,
  students: state.students,
  currentUserSchedule: state.currentUserSchedule,
  friends: state.friends,
  selectedFriendId: state.selectedFriendId,
  selectedCommunityId: state.selectedCommunityId,
  comparisonMode: state.comparisonMode,
  communityMessages: state.communityMessages,
  selectedSemester: state.selectedSemester,
  activePage: state.activePage,
  selectedCourseId: state.selectedCourseId,
  isOnboarded: state.isOnboarded,
  boardPosts: state.boardPosts,
  theme: state.theme,
  marketplaceItems: state.marketplaceItems,
  buyRequests: state.buyRequests,
  sidebarCollapsed: state.sidebarCollapsed,
  sidebarWidth: state.sidebarWidth,
  rightPanelWidth: state.rightPanelWidth
});
