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
import { ApiRequestError, ApiService } from "@/services/ApiService";
import type {
  AppDatabaseSnapshot,
  AppPage,
  BoardPost,
  BuyRequest,
  Community,
  CommunityChatMessage,
  CommunityMember,
  Course,
  CourseReview,
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
  studentSchedules: Record<string, Record<string, ScheduleItem[]>>;
  scheduleUpdatedAt: Record<string, string>;
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
  authNotice: string | null;
  scheduleNotice: string | null;
  friendNotice: string | null;
  selectedCommunityId: string | null;
  communityMessages: Record<string, CommunityChatMessage[]>;
  courseReviews: Record<string, CourseReview[]>;
  courseReviewsLoaded: Record<string, boolean>;
  searchQuery: string;
  courseSearchQuery: string;
  selectedFriendId: string | null;
  comparisonMode: boolean;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  rightPanelWidth: number;
  theme: ThemeMode;
  setComparisonMode: (enabled: boolean) => void;
  completeOnboarding: (input: {
    mode: "login" | "signup";
    email: string;
    program: string;
    year: string;
    classGroup: string;
    password?: string;
    provider?: "password" | "google" | "microsoft";
  }) => Promise<void>;
  logOut: () => void;
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
  loadFriendsFromApi: () => Promise<void>;
  loadStudentSchedule: (studentId: string, semester: string) => Promise<ScheduleItem[]>;
  getFriendSchedule: (friendId: string, semester: string) => Promise<ScheduleItem[]>;
  loadAcceptedFriendSchedules: (semester: string) => Promise<void>;
  addFriendByEmail: (email: string) => void;
  acceptFriendRequest: (friendshipId: string) => void;
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
  loadCourseReviews: (courseId: string) => Promise<void>;
  addCourseReview: (courseId: string, rating: number, comment: string) => void;
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

const initialCourseReviews: Record<string, CourseReview[]> = {
  "course-pr-theory": [
    {
      id: "review-pr-theory-1",
      course_id: "course-pr-theory",
      rating: 5,
      comment: "Лекц ойлгомжтой, семинар дээр кейс их ажилладаг.",
      created_at: "2026-05-05T08:44:00.000Z"
    }
  ],
  "course-policy-analysis": [
    {
      id: "review-policy-analysis-1",
      course_id: "course-policy-analysis",
      rating: 4,
      comment: "Унших материал ихтэй ч хуваарь төлөвлөхөд тохиромжтой.",
      created_at: "2026-05-05T08:46:00.000Z"
    }
  ]
};

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

const friendBelongsToSchool = (friend: Friend, school: string) =>
  CommunityService.detectSchoolFromEmail(friend.email) === school;

const getSchoolFriends = (friends: Friend[], school: string) =>
  friends.filter((friend) => friendBelongsToSchool(friend, school));

const normalizeFriendStatus = (status?: string | null) => {
  const normalized = status?.toLowerCase();
  if (normalized === "pending" || normalized === "rejected") return normalized;
  return "accepted";
};

const isAcceptedFriend = (friend: Friend) => normalizeFriendStatus(friend.status) === "accepted";

const getAcceptedSchoolFriends = (friends: Friend[], school: string) =>
  getSchoolFriends(friends, school).filter(isAcceptedFriend);

const getDefaultCommunityId = (
  communities: Community[],
  currentStudent: Student,
  members: CommunityMember[],
  preferredCommunityId?: string | null
) => {
  if (
    preferredCommunityId &&
    CommunityService.canAccessCommunity(preferredCommunityId, currentStudent, communities, members)
  ) {
    return preferredCommunityId;
  }

  const visibleCommunities = CommunityService.getVisibleCommunities(currentStudent, communities, members);

  return (
    visibleCommunities.find(
      (community) => community.type === "class" && community.reference_id === currentStudent.class_group
    )?.id ??
    visibleCommunities.find((community) => community.type === "school")?.id ??
    visibleCommunities[0]?.id ??
    null
  );
};

const semesterKey = (course: Course) => `${course.year ?? "2025-2026"} · ${course.semester ?? "Намрын улирал"}`;

const scheduleSemesterKey = (item: ScheduleItem) => `${item.year ?? "2025-2026"} · ${item.semester ?? "Намрын улирал"}`;

const getItemSemesterKey = (item: ScheduleItem) => item.semesterKey ?? scheduleSemesterKey(item);

const defaultSemester = "2025-2026 · Намрын улирал";

const studentSemesterKey = (studentId: string, semester: string) => `${studentId}:${semester}`;

const withScheduleIdentity = (items: ScheduleItem[], studentId: string, semester: string) =>
  items.map((item) => ({
    ...item,
    studentId,
    semesterKey: getItemSemesterKey(item) || semester
  }));

const replaceSemesterSchedule = (schedule: ScheduleItem[], semester: string, items: ScheduleItem[]) => [
  ...schedule.filter((item) => getItemSemesterKey(item) !== semester),
  ...items
];

const createInitialStudentSchedules = () => {
  const schedules: Record<string, Record<string, ScheduleItem[]>> = {
    [detectedCurrentStudent.id]: {
      [defaultSemester]: withScheduleIdentity(seedSchedule, detectedCurrentStudent.id, defaultSemester)
    }
  };

  seedFriends.forEach((friend) => {
    const studentId = friend.studentId ?? friend.id;
    schedules[studentId] = {
      [defaultSemester]: withScheduleIdentity(friend.schedule, studentId, defaultSemester)
    };
  });

  return schedules;
};

const mergeStudentSemesterSchedule = (
  studentSchedules: Record<string, Record<string, ScheduleItem[]>>,
  studentId: string,
  semester: string,
  items: ScheduleItem[]
) => ({
  ...studentSchedules,
  [studentId]: {
    ...(studentSchedules[studentId] ?? {}),
    [semester]: withScheduleIdentity(items, studentId, semester)
  }
});

const getCachedStudentSchedule = (
  studentSchedules: Record<string, Record<string, ScheduleItem[]>>,
  studentId: string,
  semester: string
) => studentSchedules[studentId]?.[semester] ?? [];

const mergeStudentSchedulesFromFlatSchedule = (
  studentSchedules: Record<string, Record<string, ScheduleItem[]>>,
  studentId: string,
  schedule: ScheduleItem[]
) =>
  unique(schedule.map(getItemSemesterKey)).reduce(
    (nextSchedules, semester) =>
      mergeStudentSemesterSchedule(
        nextSchedules,
        studentId,
        semester,
        schedule.filter((item) => getItemSemesterKey(item) === semester)
      ),
    studentSchedules
  );

const mergeFriendSchedules = (
  apiFriends: Friend[],
  previousFriends: Friend[],
  studentSchedules: Record<string, Record<string, ScheduleItem[]>>
) =>
  apiFriends.map((friend) => {
    const studentId = friend.studentId ?? friend.id;
    const previous = previousFriends.find(
      (item) => item.id === friend.id || item.studentId === friend.studentId || item.email.toLowerCase() === friend.email.toLowerCase()
    );
    const cached = Object.values(studentSchedules[studentId] ?? {}).flat();

    return {
      ...friend,
      schedule: cached.length > 0 ? cached : previous?.schedule ?? [],
      school: friend.school ?? CommunityService.detectSchoolFromEmail(friend.email),
      classGroup: friend.classGroup ?? friend.group,
      major: friend.major ?? previous?.major
    };
  });

const getSemesterOptions = (courses: Course[]) =>
  Array.from(new Set(courses.map(semesterKey))).sort((first, second) => second.localeCompare(first));

const normalizeSemesterOptions = (options: string[]) =>
  options.map((option) => option.trim()).filter(Boolean);

const mergeSemesterOptions = (...groups: string[][]) => unique(groups.flatMap(normalizeSemesterOptions));

const getEnrollmentCourseId = (course: Course) => course.communityCourseId ?? course.id;

const getScheduleEnrollmentCourseId = (item: ScheduleItem) => item.communityCourseId ?? item.courseId;

const isSchedulableCourse = (course: Course) =>
  Boolean(course.day) && course.startMinutes !== undefined && course.endMinutes !== undefined;

const hasScheduledClass = (schedule: ScheduleItem[], course: Course) =>
  schedule.some((item) => {
    if (scheduleSemesterKey(item) !== semesterKey(course)) return false;

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
      scheduleSemesterKey(item) === semesterKey(course) &&
      item.day === course.day &&
      course.startMinutes! < item.endMinutes &&
      item.startMinutes < course.endMinutes!
  );
};

const findCompanionCourse = (course: Course, courses: Course[], schedule: ScheduleItem[]) => {
  const targetKind = course.kind === "lecture" ? "seminar" : course.kind === "seminar" ? "lecture" : null;
  const courseGroupId = getEnrollmentCourseId(course);
  if (!targetKind) return null;

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
    year: course.year,
    semester: course.semester,
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
  school: student.school,
  major: student.program,
  classGroup: student.class_group,
  accent: "#14b8a6",
  schedule
});

const createPostId = () => createScheduleId("board-post");

const createCourseReviewId = () => createScheduleId("course-review");

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
  currentUserSchedule: withScheduleIdentity(seedSchedule, detectedCurrentStudent.id, defaultSemester),
  studentSchedules: createInitialStudentSchedules(),
  scheduleUpdatedAt: {},
  friends: seedFriends.map((friend) => ({
    ...friend,
    school: CommunityService.detectSchoolFromEmail(friend.email),
    major: seedStudents.find((student) => student.id === friend.studentId)?.program,
    classGroup: seedStudents.find((student) => student.id === friend.studentId)?.class_group ?? friend.group,
    schedule: withScheduleIdentity(friend.schedule, friend.studentId ?? friend.id, defaultSemester)
  })),
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
  authNotice: null,
  scheduleNotice: null,
  friendNotice: null,
  selectedCommunityId: initialSelectedCommunityId,
  communityMessages: chatService.getAllMessages(),
  courseReviews: initialCourseReviews,
  courseReviewsLoaded: {},
  searchQuery: "",
  courseSearchQuery: "",
  selectedFriendId: seedFriends[0]?.id ?? null,
  comparisonMode: false,
  sidebarCollapsed: false,
  sidebarWidth: 260,
  rightPanelWidth: 320,
  theme: "dark",
  setComparisonMode: (enabled) =>
    set((state) => {
      const visibleFriends = getAcceptedSchoolFriends(state.friends, state.currentStudent.school);
      const selectedFriendId = visibleFriends.some((friend) => friend.id === state.selectedFriendId)
        ? state.selectedFriendId
        : visibleFriends[0]?.id ?? null;

      return {
        comparisonMode: enabled,
        selectedFriendId: enabled ? selectedFriendId : state.selectedFriendId
      };
    }),
  completeOnboarding: async (input) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const program = input.program.trim() || "Тодорхойгүй хөтөлбөр";
    const classGroup = input.classGroup.trim() || "Тодорхойгүй";

    const applyStudentSession = (nextStudent: Student, apiSemesterOptions: string[] = [], apiFriends?: Friend[]) => {
      set((state) => {
        const students = state.students.some((student) => student.id === nextStudent.id)
          ? state.students.map((student) => (student.id === nextStudent.id ? nextStudent : student))
          : [
              nextStudent,
              ...state.students.filter(
                (student) =>
                  student.email.toLowerCase() !== nextStudent.email.toLowerCase() &&
                  student.id !== "student-current"
              )
            ];
        const studentSchedules = state.studentSchedules[nextStudent.id]
          ? state.studentSchedules
          : mergeStudentSemesterSchedule(state.studentSchedules, nextStudent.id, state.selectedSemester, []);
        const friends = apiFriends
          ? mergeFriendSchedules(apiFriends, state.friends, studentSchedules)
          : state.friends;
        const currentUserSchedule = Object.values(studentSchedules[nextStudent.id] ?? {}).flat();
      const assignment = rebuildCommunityState(students, state.courses);
        const visibleFriends = getAcceptedSchoolFriends(friends, nextStudent.school);

      return {
        userEmail: normalizedEmail,
        currentStudent: nextStudent,
        students,
        currentUserSchedule,
        studentSchedules,
          friends,
        communities: assignment.communities,
        communityMembers: assignment.members,
        selectedCommunityId: getDefaultCommunityId(assignment.communities, nextStudent, assignment.members),
        selectedFriendId:
          state.selectedFriendId && visibleFriends.some((friend) => friend.id === state.selectedFriendId)
            ? state.selectedFriendId
            : null,
        comparisonMode:
          state.selectedFriendId && visibleFriends.some((friend) => friend.id === state.selectedFriendId)
            ? state.comparisonMode
            : false,
        rightContext: null,
        activePage: "dashboard",
          isOnboarded: true,
          authNotice: null,
          semesterOptions: mergeSemesterOptions(
            getSemesterOptions(state.courses),
            state.semesterOptions,
            apiSemesterOptions
          )
      };
      });
    };

    try {
      const response = await ApiService.login({
        email: normalizedEmail,
        mode: input.mode,
        name: "Та",
        major: program,
        classGroup,
        password: input.password,
        provider: input.provider ?? "password"
      });
      const backendStudent = response.student;
      const nextStudent = CommunityService.detectStudentIdentity({
        id: backendStudent?.id ?? "student-current",
        email: backendStudent?.email ?? normalizedEmail,
        name: backendStudent?.name ?? "Та",
        program: backendStudent?.major ?? program,
        year: input.year,
        classGroup: backendStudent?.classGroup ?? classGroup,
        enrolledCourseIds: get().currentUserSchedule.map((item) => item.communityCourseId ?? item.courseId),
        isOnline: true
      });
      const apiSemesterOptions = response.terms?.map((term) => term.label) ?? [];
      const apiFriends = await ApiService.fetchFriends(normalizedEmail).catch(() => undefined);

      applyStudentSession(nextStudent, apiSemesterOptions, apiFriends);
      void get().loadStudentSchedule(nextStudent.id, get().selectedSemester);
      void get().loadAcceptedFriendSchedules(get().selectedSemester);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status < 500) {
        set({
          authNotice: error.message || "Нэвтрэх мэдээлэл буруу байна.",
          isOnboarded: false
        });
        throw error;
      }

      const fallbackStudent = CommunityService.detectStudentIdentity({
        id: "student-current",
        email: normalizedEmail,
        name: "Та",
        program,
        year: input.year,
        classGroup,
        enrolledCourseIds: get().currentUserSchedule.map((item) => item.communityCourseId ?? item.courseId),
        isOnline: true
      });

      applyStudentSession(fallbackStudent);
      set({ authNotice: "Сервер түр холбогдсонгүй. Offline төлөвлөгөөний горимоор нэвтэрлээ." });
    }
  },
  logOut: () =>
    set({
      isOnboarded: false,
      activePage: "dashboard",
      rightContext: null,
      isCourseModalOpen: false,
      selectedCourseId: null,
      selectedFriendId: null,
      comparisonMode: false,
      searchQuery: "",
      courseSearchQuery: "",
      authNotice: null,
      scheduleNotice: null,
      friendNotice: null
    }),
  setActivePage: (page) => set({ activePage: page }),
  openCourseModal: () => set({ isCourseModalOpen: true, scheduleNotice: null }),
  closeCourseModal: () => set({ isCourseModalOpen: false }),
  setRightContext: (context) => set({ rightContext: context }),
  setSelectedFriend: (friendId) =>
    set((state) => {
      const friend = state.friends.find((item) => item.id === friendId);
      const canAccessFriend = Boolean(
        friend &&
          friendBelongsToSchool(friend, state.currentStudent.school) &&
          isAcceptedFriend(friend)
      );

      return {
        selectedFriendId: canAccessFriend ? friendId : null,
        rightContext: canAccessFriend ? "friend" : null
      };
    }),
  setSelectedCommunity: (communityId) =>
    set((state) =>
      CommunityService.canAccessCommunity(communityId, state.currentStudent, state.communities, state.communityMembers)
        ? { selectedCommunityId: communityId, rightContext: "community" }
        : { rightContext: null }
    ),
  setSelectedCourse: (courseId) => set({ selectedCourseId: courseId, rightContext: courseId ? "course" : null }),
  setSelectedSemester: (semester) => set({ selectedSemester: semester }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCourseSearchQuery: (query) => set({ courseSearchQuery: query }),
  clearNotices: () => set({ scheduleNotice: null, friendNotice: null }),
  loadCourseCatalog: async () => {
    if (get().catalogLoaded) return;

    let importedCourses: Course[] | null = null;
    let apiSemesterOptions: string[] = [];

    try {
      const apiCourses = await ApiService.fetchCourses(get().currentStudent.email);
      if (apiCourses.length > 0) {
        importedCourses = apiCourses;
      }
    } catch {
      importedCourses = null;
    }

    try {
      apiSemesterOptions = (await ApiService.fetchTerms(get().currentStudent.email)).map((term) => term.label);
    } catch {
      apiSemesterOptions = [];
    }

    if (!importedCourses) {
      const response = await fetch("/data/course-catalog.json");
      importedCourses = (await response.json()) as Course[];
    }

    set((state) => {
      const courses = mergeCourses(state.courses, importedCourses);
      const assignment = rebuildCommunityState(state.students, courses);

      return {
        courses,
        semesterOptions: mergeSemesterOptions(getSemesterOptions(courses), apiSemesterOptions),
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
      const studentSchedules =
        snapshot.studentSchedules ??
        mergeStudentSemesterSchedule({}, snapshot.currentStudent.id, snapshot.selectedSemester, snapshot.currentUserSchedule);
      const friends = mergeFriendSchedules(snapshot.friends, state.friends, studentSchedules);
      const currentUserSchedule = Object.values(studentSchedules[snapshot.currentStudent.id] ?? {}).flat();
      const assignment = rebuildCommunityState(snapshot.students, state.courses);
      const visibleFriends = getAcceptedSchoolFriends(friends, snapshot.currentStudent.school);
      const selectedFriendId =
        snapshot.selectedFriendId && visibleFriends.some((friend) => friend.id === snapshot.selectedFriendId)
          ? snapshot.selectedFriendId
          : null;

      return {
        ...snapshot,
        userEmail: snapshot.currentStudent.email,
        currentUserSchedule,
        studentSchedules,
        scheduleUpdatedAt: snapshot.scheduleUpdatedAt ?? state.scheduleUpdatedAt,
        friends,
        activePage: normalizeActivePage(snapshot.activePage),
        selectedCourseId: snapshot.selectedCourseId ?? null,
        isOnboarded: snapshot.isOnboarded ?? false,
        boardPosts: snapshot.boardPosts ?? state.boardPosts,
        courseReviews: snapshot.courseReviews ?? state.courseReviews,
        courseReviewsLoaded: state.courseReviewsLoaded,
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
        selectedCommunityId: getDefaultCommunityId(
          assignment.communities,
          snapshot.currentStudent,
          assignment.members,
          snapshot.selectedCommunityId
        ),
        selectedFriendId,
        comparisonMode: selectedFriendId ? snapshot.comparisonMode : false,
        communities: assignment.communities,
        communityMembers: assignment.members,
        semesterOptions: mergeSemesterOptions(
          state.semesterOptions,
          getSemesterOptions(state.courses),
          snapshot.selectedSemester ? [snapshot.selectedSemester] : []
        ),
        databaseReady: true
      };
    });
  },
  loadFriendsFromApi: async () => {
    const state = get();

    try {
      const apiFriends = await ApiService.fetchFriends(state.currentStudent.email);
      set((currentState) => ({
        friends: mergeFriendSchedules(apiFriends, currentState.friends, currentState.studentSchedules),
        selectedFriendId:
          currentState.selectedFriendId &&
          apiFriends.some((friend) => friend.id === currentState.selectedFriendId && isAcceptedFriend(friend))
            ? currentState.selectedFriendId
            : apiFriends.find(isAcceptedFriend)?.id ?? null
      }));
    } catch {
      // Local friends remain visible when the API is unavailable.
    }
  },
  loadStudentSchedule: async (studentId, semester) => {
    const state = get();
    const isCurrentStudent = studentId === state.currentStudent.id;

    try {
      const apiSchedule = isCurrentStudent
        ? await ApiService.fetchMySchedule(state.currentStudent.email, semester)
        : await ApiService.fetchStudentSchedule(state.currentStudent.email, studentId, semester);
      const schedule = withScheduleIdentity(apiSchedule, studentId, semester);

      set((currentState) => {
        const studentSchedules = mergeStudentSemesterSchedule(
          currentState.studentSchedules,
          studentId,
          semester,
          schedule
        );
        const scheduleUpdatedAt = {
          ...currentState.scheduleUpdatedAt,
          [studentSemesterKey(studentId, semester)]: new Date().toISOString()
        };

        return {
          studentSchedules,
          scheduleUpdatedAt,
          currentUserSchedule: isCurrentStudent
            ? replaceSemesterSchedule(currentState.currentUserSchedule, semester, schedule)
            : currentState.currentUserSchedule,
          friends: currentState.friends.map((friend) => {
            const friendStudentId = friend.studentId ?? friend.id;
            if (friendStudentId !== studentId) return friend;

            return {
              ...friend,
              schedule: replaceSemesterSchedule(friend.schedule, semester, schedule)
            };
          })
        };
      });

      return schedule;
    } catch {
      const snapshot = get();
      const cached = getCachedStudentSchedule(snapshot.studentSchedules, studentId, semester);
      if (cached.length > 0) return cached;

      const friend = snapshot.friends.find((item) => (item.studentId ?? item.id) === studentId);
      const fallback = friend?.schedule.filter((item) => getItemSemesterKey(item) === semester) ?? [];

      return isCurrentStudent
        ? snapshot.currentUserSchedule.filter((item) => getItemSemesterKey(item) === semester)
        : fallback;
    }
  },
  getFriendSchedule: async (friendId, semester) => {
    const friend = get().friends.find((item) => item.id === friendId || item.studentId === friendId);
    if (!friend || !isAcceptedFriend(friend)) return [];

    return get().loadStudentSchedule(friend.studentId ?? friend.id, semester);
  },
  loadAcceptedFriendSchedules: async (semester) => {
    const state = get();
    const acceptedFriends = getAcceptedSchoolFriends(state.friends, state.currentStudent.school);

    await Promise.all(
      acceptedFriends.map((friend) =>
        get().getFriendSchedule(friend.id, semester).catch(() => [])
      )
    );
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
    const newFriend = knownFriend ?? {
      ...createFriendFromStudent(student),
      status: "pending" as const,
      direction: "outgoing" as const,
      school,
      major: student.program,
      classGroup: student.class_group
    };
    const nextStudents = existingStudent ? state.students : [...state.students, student];
    const nextFriends = [...state.friends, newFriend];
    const assignment = rebuildCommunityState(nextStudents, state.courses);

    set({
      students: nextStudents,
      friends: nextFriends,
      selectedFriendId: newFriend.id,
      communities: assignment.communities,
      communityMembers: assignment.members,
      friendNotice: "Найзын хүсэлтийг илгээж байна."
    });

    void ApiService.requestFriend(state.currentStudent.email, normalizedEmail)
      .then(async () => {
        const friends = await ApiService.fetchFriends(state.currentStudent.email).catch(() => get().friends);
        set((currentState) => ({
          friends: mergeFriendSchedules(friends, currentState.friends, currentState.studentSchedules),
          friendNotice: "Найзын хүсэлт серверт илгээгдлээ."
        }));
      })
      .catch(() => {
        // Local friend fallback stays available while backend accounts are still being created.
      });
  },
  acceptFriendRequest: (friendshipId) => {
    const state = get();

    void ApiService.acceptFriend(state.currentStudent.email, friendshipId)
      .then(async () => {
        const friends = await ApiService.fetchFriends(state.currentStudent.email).catch(() => get().friends);
        set((currentState) => ({
          friends: mergeFriendSchedules(friends, currentState.friends, currentState.studentSchedules),
          friendNotice: "Найзын хүсэлтийг зөвшөөрлөө."
        }));
      })
      .catch((error) => {
        set({
          friendNotice: error instanceof Error ? error.message : "Найзын хүсэлт зөвшөөрөхөд алдаа гарлаа."
        });
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
    const selectedTerm = semesterKey(course);
    const identifiedNewItems = withScheduleIdentity(newItems, state.currentStudent.id, selectedTerm);
    const enrollmentCourseId = getEnrollmentCourseId(course);
    const nextCurrentStudent = {
      ...state.currentStudent,
      enrolledCourseIds: unique([...state.currentStudent.enrolledCourseIds, enrollmentCourseId])
    };
    const nextStudents = state.students.map((student) =>
      student.id === state.currentStudent.id ? nextCurrentStudent : student
    );
    const assignment = rebuildCommunityState(nextStudents, state.courses);

    const nextCurrentUserSchedule = [...state.currentUserSchedule, ...identifiedNewItems];

    set({
      currentUserSchedule: nextCurrentUserSchedule,
      studentSchedules: mergeStudentSchedulesFromFlatSchedule(
        state.studentSchedules,
        state.currentStudent.id,
        nextCurrentUserSchedule
      ),
      scheduleUpdatedAt: {
        ...state.scheduleUpdatedAt,
        [studentSemesterKey(state.currentStudent.id, selectedTerm)]: new Date().toISOString()
      },
      currentStudent: nextCurrentStudent,
      students: nextStudents,
      communities: assignment.communities,
      communityMembers: assignment.members,
      scheduleNotice:
        newItems.length > 1
          ? "Лекц болон семинар хуваарьт хамт нэмэгдлээ."
          : "Хичээл хуваарьт нэмэгдлээ."
    });

    void ApiService.enroll(state.currentStudent.email, course.sourceScheduleId ?? course.id, true)
      .then(() => get().loadStudentSchedule(state.currentStudent.id, selectedTerm))
      .catch(() => {
        // The UI keeps the local plan if the shared database is offline.
      });
  },
  removeScheduleItem: (itemId) =>
    set((state) => {
      const removedItem = state.currentUserSchedule.find((item) => item.id === itemId);
      const removedSemester = removedItem ? getItemSemesterKey(removedItem) : state.selectedSemester;
      const nextSchedule = state.currentUserSchedule.filter((item) => item.id !== itemId);
      const nextSemesterSchedule = nextSchedule.filter((item) => getItemSemesterKey(item) === removedSemester);
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
        studentSchedules: mergeStudentSemesterSchedule(
          state.studentSchedules,
          state.currentStudent.id,
          removedSemester,
          nextSemesterSchedule
        ),
        scheduleUpdatedAt: {
          ...state.scheduleUpdatedAt,
          [studentSemesterKey(state.currentStudent.id, removedSemester)]: new Date().toISOString()
        },
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

    const removedSemester = course ? semesterKey(course) : state.selectedSemester;
    const nextSemesterSchedule = nextSchedule.filter((item) => getItemSemesterKey(item) === removedSemester);
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
      studentSchedules: mergeStudentSemesterSchedule(
        state.studentSchedules,
        state.currentStudent.id,
        removedSemester,
        nextSemesterSchedule
      ),
      scheduleUpdatedAt: {
        ...state.scheduleUpdatedAt,
        [studentSemesterKey(state.currentStudent.id, removedSemester)]: new Date().toISOString()
      },
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

    const selectedTerm = semesterKey(course);
    const newItem = withScheduleIdentity(
      [createScheduleItemFromCourse(course, day, startMinutes, duration)],
      get().currentStudent.id,
      selectedTerm
    )[0];
    const enrollmentCourseId = getEnrollmentCourseId(course);

    set((state) => {
      const nextCurrentUserSchedule = [...state.currentUserSchedule, newItem];

      return {
        currentUserSchedule: nextCurrentUserSchedule,
        studentSchedules: mergeStudentSchedulesFromFlatSchedule(
          state.studentSchedules,
          state.currentStudent.id,
          nextCurrentUserSchedule
        ),
        scheduleUpdatedAt: {
          ...state.scheduleUpdatedAt,
          [studentSemesterKey(state.currentStudent.id, selectedTerm)]: new Date().toISOString()
        },
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
      };
    });

    set((state) => {
      const assignment = rebuildCommunityState(state.students, state.courses);

      return {
        communities: assignment.communities,
        communityMembers: assignment.members
      };
    });
  },
  moveScheduleItem: (itemId, day, startMinutes) =>
    set((state) => {
      const affectedItem = state.currentUserSchedule.find((item) => item.id === itemId);
      const affectedSemester = affectedItem ? getItemSemesterKey(affectedItem) : state.selectedSemester;
      const nextSchedule = state.currentUserSchedule.map((item) => {
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
      });
      const nextSemesterSchedule = nextSchedule.filter((item) => getItemSemesterKey(item) === affectedSemester);

      return {
        currentUserSchedule: nextSchedule,
        studentSchedules: mergeStudentSemesterSchedule(
          state.studentSchedules,
          state.currentStudent.id,
          affectedSemester,
          nextSemesterSchedule
        ),
        scheduleUpdatedAt: {
          ...state.scheduleUpdatedAt,
          [studentSemesterKey(state.currentStudent.id, affectedSemester)]: new Date().toISOString()
        }
      };
    }),
  resizeScheduleItem: (itemId, endMinutes) =>
    set((state) => {
      const affectedItem = state.currentUserSchedule.find((item) => item.id === itemId);
      const affectedSemester = affectedItem ? getItemSemesterKey(affectedItem) : state.selectedSemester;
      const nextSchedule = state.currentUserSchedule.map((item) => {
        if (item.id !== itemId) return item;

        const snappedEnd = snapToSlot(endMinutes);
        const minimumEnd = item.startMinutes + MIN_BLOCK_DURATION;

        return {
          ...item,
          endMinutes: clamp(snappedEnd, minimumEnd, DAY_END_MINUTES)
        };
      });
      const nextSemesterSchedule = nextSchedule.filter((item) => getItemSemesterKey(item) === affectedSemester);

      return {
        currentUserSchedule: nextSchedule,
        studentSchedules: mergeStudentSemesterSchedule(
          state.studentSchedules,
          state.currentStudent.id,
          affectedSemester,
          nextSemesterSchedule
        ),
        scheduleUpdatedAt: {
          ...state.scheduleUpdatedAt,
          [studentSemesterKey(state.currentStudent.id, affectedSemester)]: new Date().toISOString()
        }
      };
    }),
  sendCommunityMessage: (body) => {
    const trimmedBody = body.trim();
    if (!trimmedBody) return;

    const state = get();
    if (!state.selectedCommunityId) return;
    if (
      !CommunityService.canAccessCommunity(
        state.selectedCommunityId,
        state.currentStudent,
        state.communities,
        state.communityMembers
      )
    ) {
      return;
    }

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

    void ApiService.sendCommunityMessage(state.currentStudent.email, state.selectedCommunityId, trimmedBody).catch(() => {
      // Local chat remains available when no shared backend is configured.
    });
  },
  loadCourseReviews: async (courseId) => {
    const state = get();
    if (state.courseReviewsLoaded[courseId]) return;

    try {
      const reviews = await ApiService.fetchCourseReviews(courseId);
      set((currentState) => ({
        courseReviews: {
          ...currentState.courseReviews,
          [courseId]: reviews
        },
        courseReviewsLoaded: {
          ...currentState.courseReviewsLoaded,
          [courseId]: true
        }
      }));
    } catch {
      set((currentState) => ({
        courseReviewsLoaded: {
          ...currentState.courseReviewsLoaded,
          [courseId]: true
        }
      }));
    }
  },
  addCourseReview: (courseId, rating, comment) => {
    const trimmed = comment.trim();
    const boundedRating = clamp(Math.round(rating), 1, 5);
    if (!trimmed) return;

    const state = get();
    const localReview: CourseReview = {
      id: createCourseReviewId(),
      course_id: courseId,
      rating: boundedRating,
      comment: trimmed,
      created_at: new Date().toISOString()
    };

    set((currentState) => ({
      courseReviews: {
        ...currentState.courseReviews,
        [courseId]: [localReview, ...(currentState.courseReviews[courseId] ?? [])]
      },
      courseReviewsLoaded: {
        ...currentState.courseReviewsLoaded,
        [courseId]: true
      }
    }));

    void ApiService.submitCourseReview(state.currentStudent.email, courseId, boundedRating, trimmed)
      .then((review) => {
        set((currentState) => ({
          courseReviews: {
            ...currentState.courseReviews,
            [courseId]: (currentState.courseReviews[courseId] ?? []).map((item) =>
              item.id === localReview.id ? review : item
            )
          }
        }));
      })
      .catch(() => {
        // Anonymous course review remains available locally when the API is offline.
      });
  },
  addBoardPost: (content) => {
    const trimmed = content.trim();
    const state = get();
    if (!trimmed || !state.selectedCommunityId) return;
    if (
      !CommunityService.canAccessCommunity(
        state.selectedCommunityId,
        state.currentStudent,
        state.communities,
        state.communityMembers
      )
    ) {
      return;
    }

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
  useScheduleStore((state) => {
    const friend = state.friends.find((item) => item.id === state.selectedFriendId);

    return friend && friendBelongsToSchool(friend, state.currentStudent.school) && isAcceptedFriend(friend) ? friend : null;
  });

export const useSelectedCommunity = () =>
  useScheduleStore((state) => {
    if (!state.selectedCommunityId) return null;

    return CommunityService.canAccessCommunity(
      state.selectedCommunityId,
      state.currentStudent,
      state.communities,
      state.communityMembers
    )
      ? state.communities.find((community) => community.id === state.selectedCommunityId) ?? null
      : null;
  });

export const createDatabaseSnapshot = (state: ScheduleState): AppDatabaseSnapshot => ({
  currentStudent: state.currentStudent,
  students: state.students,
  currentUserSchedule: state.currentUserSchedule,
  studentSchedules: state.studentSchedules,
  scheduleUpdatedAt: state.scheduleUpdatedAt,
  friends: state.friends,
  selectedFriendId: state.selectedFriendId,
  selectedCommunityId: state.selectedCommunityId,
  comparisonMode: state.comparisonMode,
  communityMessages: state.communityMessages,
  courseReviews: state.courseReviews,
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
