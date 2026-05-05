import type { Course, DayDefinition, Friend, Group, ScheduleItem, Student } from "@/types";

export const DAY_START_MINUTES = 8 * 60;
export const DAY_END_MINUTES = 20 * 60;
export const SLOT_MINUTES = 10;
export const HOUR_HEIGHT = 76;
export const MIN_BLOCK_DURATION = 30;

export const days: DayDefinition[] = [
  { key: "monday", label: "Даваа", shortLabel: "Да", mongolianLabel: "Даваа" },
  { key: "tuesday", label: "Мягмар", shortLabel: "Мя", mongolianLabel: "Мягмар" },
  { key: "wednesday", label: "Лхагва", shortLabel: "Лх", mongolianLabel: "Лхагва" },
  { key: "thursday", label: "Пүрэв", shortLabel: "Пү", mongolianLabel: "Пүрэв" },
  { key: "friday", label: "Баасан", shortLabel: "Ба", mongolianLabel: "Баасан" },
  { key: "saturday", label: "Бямба", shortLabel: "Бя", mongolianLabel: "Бямба" },
  { key: "sunday", label: "Ням", shortLabel: "Ня", mongolianLabel: "Ням" }
];

export const courses: Course[] = [
  {
    id: "course-foreign-journalism",
    code: "JOUR-302",
    name: "Гадаадын сэтгүүл зүй",
    teacher: "Б.Наранбаатар",
    rating: 4.6,
    reviewCount: 42,
    kind: "lecture",
    room: "Хичээлийн байр 2 · 128",
    credits: 3,
    preferredDuration: 90,
    department: "Сэтгүүл зүй",
    year: "2025-2026",
    semester: "Намрын улирал"
  },
  {
    id: "course-pr-theory",
    code: "PR-221",
    name: "Нийгмийн харилцааны онол (PR)",
    teacher: "Д.Идэржаргал",
    rating: 4.8,
    reviewCount: 61,
    kind: "lecture",
    room: "Хичээлийн байр 2 · 219",
    credits: 3,
    preferredDuration: 90,
    department: "Нийгмийн ухаан",
    year: "2025-2026",
    semester: "Намрын улирал"
  },
  {
    id: "course-policy-analysis",
    code: "POLI-410",
    name: "Улс төрийн бодлогын анализ",
    teacher: "Д.Уртнасан",
    rating: 4.4,
    reviewCount: 35,
    kind: "seminar",
    room: "Хичээлийн байр 5 · 409",
    credits: 3,
    preferredDuration: 90,
    department: "Улс төр судлал",
    year: "2025-2026",
    semester: "Намрын улирал"
  },
  {
    id: "course-anthropology",
    code: "ANTH-214",
    name: "Монголын нийгэм, соёлын антропологи",
    teacher: "Г.Пүрэвдорж",
    rating: 4.2,
    reviewCount: 19,
    kind: "seminar",
    room: "Ховд 1-р байр · 405",
    credits: 3,
    preferredDuration: 90,
    department: "Антропологи",
    year: "2025-2026",
    semester: "Намрын улирал"
  },
  {
    id: "course-social-ethics",
    code: "SOWK-330",
    name: "Нийгмийн ажлын ёс зүй",
    teacher: "Я.Жанар",
    rating: 4.7,
    reviewCount: 27,
    kind: "seminar",
    room: "Ховд 2-р байр · 205",
    credits: 2,
    preferredDuration: 90,
    department: "Нийгмийн ажил",
    year: "2025-2026",
    semester: "Намрын улирал"
  },
  {
    id: "course-social-policy",
    code: "SOCI-418",
    name: "Нийгмийн бодлого ба төлөвлөлт",
    teacher: "С.Өлзийжаргал",
    rating: 4.5,
    reviewCount: 31,
    kind: "seminar",
    room: "Ховд 2-р байр · 205",
    credits: 2,
    preferredDuration: 90,
    department: "Социологи",
    year: "2025-2026",
    semester: "Намрын улирал"
  },
  {
    id: "course-translation-practice",
    code: "TRPR202",
    name: "Орчуулгын дадлага-3",
    teacher: "А.Батцэцэг",
    rating: 4.1,
    reviewCount: 23,
    kind: "seminar",
    room: "Хичээлийн байр 4 · 303",
    credits: 3,
    preferredDuration: 80,
    department: "Орчуулга",
    year: "2025-2026",
    semester: "Намрын улирал"
  }
];

export const mySchedule: ScheduleItem[] = [
  {
    id: "my-foreign-journalism",
    courseId: "course-foreign-journalism",
    courseName: "Гадаадын сэтгүүл зүй",
    teacher: "Б.Наранбаатар",
    room: "Хичээлийн байр 2 · 128",
    day: "monday",
    startMinutes: 9 * 60 + 20,
    endMinutes: 10 * 60 + 50,
    kind: "lecture"
  },
  {
    id: "my-pr-lecture",
    courseId: "course-pr-theory",
    courseName: "Нийгмийн харилцааны онол (PR)",
    teacher: "Д.Идэржаргал",
    room: "Хичээлийн байр 2 · 219",
    day: "tuesday",
    startMinutes: 9 * 60 + 20,
    endMinutes: 10 * 60 + 50,
    kind: "lecture"
  },
  {
    id: "my-pr-seminar",
    courseId: "course-pr-theory",
    courseName: "Нийгмийн харилцааны онол (PR)",
    teacher: "Д.Идэржаргал",
    room: "Хичээлийн байр 2 · 200",
    day: "tuesday",
    startMinutes: 12 * 60 + 40,
    endMinutes: 14 * 60 + 10,
    kind: "seminar"
  },
  {
    id: "my-social-ethics",
    courseId: "course-social-ethics",
    courseName: "Нийгмийн ажлын ёс зүй",
    teacher: "Я.Жанар",
    room: "Ховд 2-р байр · 205",
    day: "wednesday",
    startMinutes: 17 * 60 + 40,
    endMinutes: 19 * 60 + 10,
    kind: "seminar"
  },
  {
    id: "my-policy-analysis",
    courseId: "course-policy-analysis",
    courseName: "Улс төрийн бодлогын анализ",
    teacher: "Д.Уртнасан",
    room: "Хичээлийн байр 5 · 202",
    day: "friday",
    startMinutes: 11 * 60,
    endMinutes: 12 * 60 + 30,
    kind: "lecture"
  }
];

const friendScheduleA: ScheduleItem[] = [
  {
    id: "friend-a-media-law",
    courseId: "friend-media-law",
    courseName: "Медиа эрх зүй",
    teacher: "О.Мөнхсайхан",
    room: "Хичээлийн байр 2 · 130",
    day: "monday",
    startMinutes: 10 * 60,
    endMinutes: 11 * 60 + 30,
    kind: "lecture"
  },
  {
    id: "friend-a-social-policy",
    courseId: "course-social-policy",
    courseName: "Нийгмийн бодлого ба төлөвлөлт",
    teacher: "С.Өлзийжаргал",
    room: "Ховд 2-р байр · 205",
    day: "tuesday",
    startMinutes: 14 * 60 + 10,
    endMinutes: 15 * 60 + 40,
    kind: "seminar"
  },
  {
    id: "friend-a-translation",
    courseId: "course-translation-practice",
    courseName: "Орчуулгын дадлага-3",
    teacher: "А.Батцэцэг",
    room: "Хичээлийн байр 4 · 303",
    day: "wednesday",
    startMinutes: 15 * 60 + 40,
    endMinutes: 17 * 60 + 10,
    kind: "seminar"
  },
  {
    id: "friend-a-policy",
    courseId: "course-policy-analysis",
    courseName: "Улс төрийн бодлогын анализ",
    teacher: "Д.Уртнасан",
    room: "Хичээлийн байр 5 · 409",
    day: "friday",
    startMinutes: 12 * 60 + 40,
    endMinutes: 14 * 60 + 10,
    kind: "seminar"
  }
];

const friendScheduleB: ScheduleItem[] = [
  {
    id: "friend-b-anthropology",
    courseId: "course-anthropology",
    courseName: "Монголын нийгэм, соёлын антропологи",
    teacher: "Г.Пүрэвдорж",
    room: "Ховд 1-р байр · 405",
    day: "tuesday",
    startMinutes: 9 * 60 + 20,
    endMinutes: 10 * 60 + 50,
    kind: "seminar"
  },
  {
    id: "friend-b-economics",
    courseId: "friend-economics",
    courseName: "Хөгжлийн эдийн засаг",
    teacher: "Ц.Одгэрэл",
    room: "Хичээлийн байр 5 · 305",
    day: "thursday",
    startMinutes: 11 * 60,
    endMinutes: 12 * 60 + 30,
    kind: "lecture"
  },
  {
    id: "friend-b-research",
    courseId: "friend-research",
    courseName: "Судалгааны арга зүй",
    teacher: "Б.Мөнхбат",
    room: "Хичээлийн байр 2 · 214",
    day: "friday",
    startMinutes: 10 * 60 + 30,
    endMinutes: 12 * 60,
    kind: "seminar"
  }
];

export const friends: Friend[] = [
  {
    id: "friend-anu",
    studentId: "student-anu",
    name: "Ану",
    email: "anu@stud.num.edu.mn",
    group: "PR-3A",
    accent: "#14b8a6",
    schedule: friendScheduleA
  },
  {
    id: "friend-temuulen",
    studentId: "student-temuulen",
    name: "Тэмүүлэн",
    email: "temuulen@stud.num.edu.mn",
    group: "SOCI-2B",
    accent: "#6366f1",
    schedule: friendScheduleB
  }
];

export const groups: Group[] = [
  { id: "group-pr", name: "PR-3A", memberCount: 28 },
  { id: "group-sociology", name: "SOCI-2B", memberCount: 22 },
  { id: "group-open-electives", name: "Сонгон судлах хичээл", memberCount: 46 }
];

export const currentUserEmail = "student@stud.num.edu.mn";

export const students: Student[] = [
  {
    id: "student-current",
    name: "Та",
    email: currentUserEmail,
    school: "MUIS",
    program: "Олон нийтийн харилцаа",
    year: "3-р курс",
    class_group: "PR-3A",
    enrolledCourseIds: Array.from(new Set(mySchedule.map((item) => item.courseId))),
    isOnline: true
  },
  {
    id: "student-anu",
    name: "Ану",
    email: "anu@stud.num.edu.mn",
    school: "MUIS",
    program: "Олон нийтийн харилцаа",
    year: "3-р курс",
    class_group: "PR-3A",
    enrolledCourseIds: Array.from(new Set(friendScheduleA.map((item) => item.courseId))),
    isOnline: true
  },
  {
    id: "student-temuulen",
    name: "Тэмүүлэн",
    email: "temuulen@stud.num.edu.mn",
    school: "MUIS",
    program: "Социологи",
    year: "2-р курс",
    class_group: "SOCI-2B",
    enrolledCourseIds: Array.from(new Set(friendScheduleB.map((item) => item.courseId))),
    isOnline: false
  },
  {
    id: "student-saruul",
    name: "Саруул",
    email: "saruul@stud.num.edu.mn",
    school: "MUIS",
    program: "Нийгмийн ажил",
    year: "3-р курс",
    class_group: "SOWK-3A",
    enrolledCourseIds: ["course-social-ethics", "course-social-policy", "course-policy-analysis"],
    isOnline: true
  },
  {
    id: "student-bilguun",
    name: "Билгүүн",
    email: "bilguun@stud.num.edu.mn",
    school: "MUIS",
    program: "Орчуулга",
    year: "2-р курс",
    class_group: "TRPR-2A",
    enrolledCourseIds: ["course-translation-practice", "course-pr-theory"],
    isOnline: false
  }
];
