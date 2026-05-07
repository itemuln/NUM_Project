import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AuthProvider, ScheduleType, TermSeason } from "@prisma/client";
import { prisma } from "../server/db.js";
import { assignStudentCommunities } from "../server/services/communityService.js";
import { addCourseWithPairing } from "../server/services/scheduleService.js";
import { ensureKnownUniversities } from "../server/services/universityService.js";

interface CatalogCourse {
  id: string;
  sourceScheduleId?: string;
  communityCourseId?: string;
  code: string;
  name: string;
  teacher: string;
  rating: number;
  reviewCount: number;
  kind: "lecture" | "seminar" | "lab";
  room: string;
  credits: number;
  department: string;
  year?: string;
  semester?: string;
  day?: string;
  startMinutes?: number;
  endMinutes?: number;
  building?: string;
}

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const catalogPath = join(__dirname, "../public/data/course-catalog.json");

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function toScheduleType(kind: CatalogCourse["kind"]) {
  if (kind === "lab") return ScheduleType.lab;
  if (kind === "seminar") return ScheduleType.seminar;
  return ScheduleType.lecture;
}

function detectSeason(semester?: string) {
  return semester?.toLowerCase().includes("хав") || semester?.toLowerCase().includes("spring")
    ? TermSeason.spring
    : TermSeason.fall;
}

function termLabel(academicYear: string, season: TermSeason) {
  return `${academicYear} · ${season === TermSeason.spring ? "Хаврын улирал" : "Намрын улирал"}`;
}

function termId(universityId: string, academicYear: string, season: TermSeason) {
  return `term-${universityId}-${academicYear}-${season}`;
}

async function ensureAcademicTerms(universityId: string) {
  const years = ["2025-2026", "2026-2027", "2027-2028"];
  const terms = years.flatMap((academicYear) => [
    {
      id: termId(universityId, academicYear, TermSeason.fall),
      universityId,
      academicYear,
      season: TermSeason.fall,
      label: termLabel(academicYear, TermSeason.fall)
    },
    {
      id: termId(universityId, academicYear, TermSeason.spring),
      universityId,
      academicYear,
      season: TermSeason.spring,
      label: termLabel(academicYear, TermSeason.spring)
    }
  ]);

  await prisma.academicTerm.createMany({
    data: terms,
    skipDuplicates: true
  });

  return terms;
}

async function seedUniversities() {
  await ensureKnownUniversities();
  const universities = await prisma.university.findMany();
  await Promise.all(universities.map((university) => ensureAcademicTerms(university.id)));

  return prisma.university.findUniqueOrThrow({
    where: { domain: "stud.num.edu.mn" }
  });
}

async function seedCatalog(universityId: string) {
  await ensureAcademicTerms(universityId);
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogCourse[];
  const courses = new Map<string, CatalogCourse>();

  catalog.forEach((catalogCourse) => {
    courses.set(catalogCourse.communityCourseId ?? catalogCourse.id, catalogCourse);
  });

  await prisma.course.createMany({
    data: Array.from(courses.entries()).map(([courseId, catalogCourse]) => ({
      id: courseId,
      code: catalogCourse.code,
      name: catalogCourse.name,
      teacherName: catalogCourse.teacher,
      credit: Number(catalogCourse.credits) || 3,
      universityId,
      termId: termId(
        universityId,
        catalogCourse.year ?? "2025-2026",
        detectSeason(catalogCourse.semester)
      ),
      semester: catalogCourse.semester ?? "Намрын улирал",
      year: catalogCourse.year ?? "2025-2026"
    })),
    skipDuplicates: true
  });

  const seenScheduleKeys = new Set<string>();
  const schedules: Array<{
    id: string;
    courseId: string;
    termId: string;
    day: string;
    startTime: string;
    endTime: string;
    type: ScheduleType;
    room: string;
    building: string;
    semester: string;
    year: string;
  }> = [];

  for (const catalogCourse of catalog) {
    if (!catalogCourse.day || catalogCourse.startMinutes === undefined || catalogCourse.endMinutes === undefined) {
      continue;
    }

    const scheduleKey = [
      catalogCourse.communityCourseId ?? catalogCourse.id,
      catalogCourse.day,
      catalogCourse.startMinutes,
      catalogCourse.endMinutes,
      catalogCourse.kind,
      catalogCourse.room,
      catalogCourse.semester ?? "Намрын улирал",
      catalogCourse.year ?? "2025-2026"
    ].join("|");

    if (seenScheduleKeys.has(scheduleKey)) {
      continue;
    }
    seenScheduleKeys.add(scheduleKey);

    schedules.push({
      id: catalogCourse.sourceScheduleId ?? catalogCourse.id,
      courseId: catalogCourse.communityCourseId ?? catalogCourse.id,
      termId: termId(
        universityId,
        catalogCourse.year ?? "2025-2026",
        detectSeason(catalogCourse.semester)
      ),
      day: catalogCourse.day,
      startTime: minutesToTime(catalogCourse.startMinutes),
      endTime: minutesToTime(catalogCourse.endMinutes),
      type: toScheduleType(catalogCourse.kind),
      room: catalogCourse.room,
      building: catalogCourse.building ?? catalogCourse.room.split("·")[0]?.trim() ?? "Тодорхойгүй",
      semester: catalogCourse.semester ?? "Намрын улирал",
      year: catalogCourse.year ?? "2025-2026"
    });
  }

  await prisma.schedule.createMany({
    data: schedules,
    skipDuplicates: true
  });

  const ratings = new Map<string, { totalRating: number; reviewCount: number; rows: number }>();
  catalog.forEach((catalogCourse) => {
    const existing = ratings.get(catalogCourse.teacher) ?? { totalRating: 0, reviewCount: 0, rows: 0 };
    existing.totalRating += Number(catalogCourse.rating) || 4.2;
    existing.reviewCount += Number(catalogCourse.reviewCount) || 1;
    existing.rows += 1;
    ratings.set(catalogCourse.teacher, existing);
  });

  await prisma.teacherRating.createMany({
    data: Array.from(ratings.entries()).map(([teacherName, rating]) => ({
      teacherName,
      rating: Number((rating.totalRating / rating.rows).toFixed(1)),
      reviewCount: rating.reviewCount,
      source: "bagsh.space"
    })),
    skipDuplicates: true
  });
}

async function seedStudents(universityId: string) {
  const students = [
    {
      id: "student-main-test",
      email: "23b1num2119@stud.num.edu.mn",
      name: "Тест оюутан",
      major: "Information Systems",
      classGroup: "IS-2B"
    },
    {
      id: "student-anu-test",
      email: "anu@stud.num.edu.mn",
      name: "Ану",
      major: "Information Systems",
      classGroup: "IS-2B"
    },
    {
      id: "student-temuulen-test",
      email: "temuulen@stud.num.edu.mn",
      name: "Тэмүүлэн",
      major: "Computer Science",
      classGroup: "CS-2B"
    }
  ];

  for (const student of students) {
    await prisma.student.upsert({
      where: { email: student.email },
      update: {
        id: student.id,
        name: student.name,
        universityId,
        major: student.major,
        classGroup: student.classGroup
      },
      create: {
        ...student,
        universityId
      }
    });
  }

  const ufe = await prisma.university.findUniqueOrThrow({ where: { domain: "ufe.edu.mn" } });
  await ensureAcademicTerms(ufe.id);
  await prisma.student.upsert({
    where: { email: "b23fa1631@ufe.edu.mn" },
    update: {
      name: "UFE тест",
      universityId: ufe.id,
      major: "Finance",
      classGroup: "FIN-2A"
    },
    create: {
      id: "student-ufe-test",
      email: "b23fa1631@ufe.edu.mn",
      name: "UFE тест",
      universityId: ufe.id,
      major: "Finance",
      classGroup: "FIN-2A"
    }
  });

  return {
    main: students[0].id,
    anu: students[1].id,
    temuulen: students[2].id
  };
}

async function seedAuthAccounts(studentIds: { main: string; anu: string; temuulen: string }) {
  const students = await prisma.student.findMany({
    where: {
      id: {
        in: [...Object.values(studentIds), "student-ufe-test"]
      }
    }
  });

  await prisma.authAccount.createMany({
    data: students.map((student) => ({
      id: `auth-password-${student.id}`,
      studentId: student.id,
      provider: AuthProvider.password,
      providerUserId: student.email.toLowerCase()
    })),
    skipDuplicates: true
  });
}

async function enrollSeedSchedules(studentIds: { main: string; anu: string; temuulen: string }) {
  const poliLecture = await prisma.schedule.findFirst({
    where: { course: { code: "POLI315" }, type: ScheduleType.lecture }
  });
  const prLecture = await prisma.schedule.findFirst({
    where: { course: { code: { contains: "PR" } }, type: ScheduleType.lecture }
  });
  const socialSeminar = await prisma.schedule.findFirst({
    where: { course: { name: { contains: "Нийгмийн" } }, type: ScheduleType.seminar }
  });

  const tryEnroll = async (studentId: string, scheduleId?: string) => {
    if (!scheduleId) return;

    try {
      await addCourseWithPairing(studentId, scheduleId, { allowConflicts: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes("аль хэдийн")) return;
      throw error;
    }
  };

  await tryEnroll(studentIds.main, poliLecture?.id);
  await tryEnroll(studentIds.anu, prLecture?.id);
  await tryEnroll(studentIds.temuulen, socialSeminar?.id);
}

async function seedFriendships(studentIds: { main: string; anu: string; temuulen: string }) {
  await prisma.friendship.upsert({
    where: {
      requesterId_receiverId: {
        requesterId: studentIds.main,
        receiverId: studentIds.anu
      }
    },
    update: { status: "accepted" },
    create: {
      requesterId: studentIds.main,
      receiverId: studentIds.anu,
      status: "accepted"
    }
  });

  await prisma.friendship.upsert({
    where: {
      requesterId_receiverId: {
        requesterId: studentIds.temuulen,
        receiverId: studentIds.main
      }
    },
    update: { status: "pending" },
    create: {
      requesterId: studentIds.temuulen,
      receiverId: studentIds.main,
      status: "pending"
    }
  });
}

async function seedMessages(studentIds: { main: string; anu: string; temuulen: string }) {
  await Promise.all(Object.values(studentIds).map((studentId) => assignStudentCommunities(studentId)));
  const mainCommunities = await prisma.communityMember.findMany({
    where: { studentId: studentIds.main },
    include: { community: true }
  });
  const classCommunity = mainCommunities.find((member) => member.community.type === "major")?.community;
  const schoolCommunity = mainCommunities.find((member) => member.community.type === "school")?.community;

  if (schoolCommunity) {
    await prisma.message.upsert({
      where: { id: "seed-message-school-1" },
      update: {
        content: "Намрын улирлын төлөвлөгөөгөө энэ систем дээр туршаад харьцуулж болно."
      },
      create: {
        id: "seed-message-school-1",
        communityId: schoolCommunity.id,
        senderId: studentIds.anu,
        content: "Намрын улирлын төлөвлөгөөгөө энэ систем дээр туршаад харьцуулж болно."
      }
    });
  }

  if (classCommunity) {
    await prisma.message.upsert({
      where: { id: "seed-message-class-1" },
      update: {
        content: "IS-2B-ийнхэн лекц/семинараа хамт нэмээд сул цагаа шалгаарай."
      },
      create: {
        id: "seed-message-class-1",
        communityId: classCommunity.id,
        senderId: studentIds.main,
        content: "IS-2B-ийнхэн лекц/семинараа хамт нэмээд сул цагаа шалгаарай."
      }
    });
  }
}

async function seedCourseReviews(studentIds: { main: string; anu: string; temuulen: string }) {
  const courses = await prisma.course.findMany({
    where: {
      OR: [{ code: "POLI315" }, { code: { contains: "PR" } }]
    },
    take: 4
  });

  await Promise.all(
    courses.map((course, index) =>
      prisma.courseReview.upsert({
        where: { id: `seed-course-review-${course.id}` },
        update: {
          rating: index % 2 === 0 ? 5 : 4,
          comment:
            index % 2 === 0
              ? "Хуваарь төлөвлөхөд тохиромжтой, ачаалал нь ойлгомжтой байсан."
              : "Семинар дээр идэвхтэй оролцвол оноо авах боломж сайн."
        },
        create: {
          id: `seed-course-review-${course.id}`,
          courseId: course.id,
          studentId: null,
          rating: index % 2 === 0 ? 5 : 4,
          comment:
            index % 2 === 0
              ? "Хуваарь төлөвлөхөд тохиромжтой, ачаалал нь ойлгомжтой байсан."
              : "Семинар дээр идэвхтэй оролцвол оноо авах боломж сайн."
        }
      })
    )
  );
}

async function main() {
  const muis = await seedUniversities();
  await ensureAcademicTerms(muis.id);
  await seedCatalog(muis.id);
  const studentIds = await seedStudents(muis.id);
  await seedAuthAccounts(studentIds);
  await enrollSeedSchedules(studentIds);
  await seedFriendships(studentIds);
  await seedMessages(studentIds);
  await seedCourseReviews(studentIds);
}

main()
  .then(async () => {
    console.log("Database seeded.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
