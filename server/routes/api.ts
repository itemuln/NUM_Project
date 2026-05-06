import { Router, type NextFunction, type Request, type Response } from "express";
import { FriendshipStatus, type Student } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError } from "../errors.js";
import { assignStudentCommunities, canAccessCommunity, getStudentCommunities } from "../services/communityService.js";
import { addCourseWithPairing, getCommonFreeTime, getStudentSchedule } from "../services/scheduleService.js";
import { ensureKnownUniversities, ensureUniversityForEmail } from "../services/universityService.js";

const router = Router();

type AsyncRoute = (request: Request, response: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (handler: AsyncRoute) => (request: Request, response: Response, next: NextFunction) => {
  handler(request, response, next).catch(next);
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function routeParam(request: Request, name: string) {
  const value = request.params[name];
  return Array.isArray(value) ? value[0] : value;
}

async function findStudentFromRequest(request: Request) {
  const studentId = request.header("x-student-id");
  const email = request.header("x-student-email");

  if (studentId) {
    return prisma.student.findUnique({
      where: { id: studentId },
      include: { university: true }
    });
  }

  if (email) {
    return prisma.student.findUnique({
      where: { email: normalizeEmail(email) },
      include: { university: true }
    });
  }

  return null;
}

async function requireStudent(request: Request) {
  const student = await findStudentFromRequest(request);

  if (!student) {
    throw new ApiError(401, "Нэвтэрсэн оюутан олдсонгүй.");
  }

  return student;
}

function ensureSameUniversity(currentStudent: Student, targetStudent: Student) {
  if (currentStudent.universityId !== targetStudent.universityId) {
    throw new ApiError(403, "Одоогоор зөвхөн нэг сургуулийн оюутнууд хоорондоо холбогдоно.");
  }
}

function formatEnrollment(enrollment: Awaited<ReturnType<typeof getStudentSchedule>>[number]) {
  return {
    id: enrollment.id,
    courseId: enrollment.courseId,
    scheduleId: enrollment.scheduleId,
    courseName: enrollment.course.name,
    teacherName: enrollment.course.teacherName,
    code: enrollment.course.code,
    credit: enrollment.course.credit,
    day: enrollment.schedule.day,
    startTime: enrollment.schedule.startTime,
    endTime: enrollment.schedule.endTime,
    type: enrollment.schedule.type,
    room: enrollment.schedule.room,
    building: enrollment.schedule.building,
    semester: enrollment.schedule.semester,
    year: enrollment.schedule.year
  };
}

router.get(
  "/health",
  asyncHandler(async (_request, response) => {
    response.json({ ok: true });
  })
);

router.post(
  "/auth/login",
  asyncHandler(async (request, response) => {
    const email = normalizeEmail(String(request.body.email ?? ""));

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Оюутны имэйл хаяг буруу байна.");
    }

    await ensureKnownUniversities();
    const university = await ensureUniversityForEmail(email);
    const student = await prisma.student.upsert({
      where: { email },
      update: {
        name: String(request.body.name ?? "").trim() || email.split("@")[0],
        universityId: university.id,
        major: String(request.body.major ?? "").trim() || "Тодорхойгүй хөтөлбөр",
        classGroup: String(request.body.classGroup ?? "").trim() || "Тодорхойгүй"
      },
      create: {
        email,
        name: String(request.body.name ?? "").trim() || email.split("@")[0],
        universityId: university.id,
        major: String(request.body.major ?? "").trim() || "Тодорхойгүй хөтөлбөр",
        classGroup: String(request.body.classGroup ?? "").trim() || "Тодорхойгүй"
      },
      include: {
        university: true
      }
    });

    await assignStudentCommunities(student.id);
    const communities = await getStudentCommunities(student.id);

    response.json({ student, university, communities });
  })
);

router.get(
  "/me",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const communities = await getStudentCommunities(student.id);

    response.json({ student, university: student.university, communities });
  })
);

router.put(
  "/me/profile",
  asyncHandler(async (request, response) => {
    const currentStudent = await requireStudent(request);
    const nextEmail = request.body.email ? normalizeEmail(String(request.body.email)) : currentStudent.email;
    const university = await ensureUniversityForEmail(nextEmail);
    const student = await prisma.student.update({
      where: { id: currentStudent.id },
      data: {
        email: nextEmail,
        universityId: university.id,
        name: String(request.body.name ?? currentStudent.name).trim() || currentStudent.name,
        major: String(request.body.major ?? currentStudent.major).trim() || currentStudent.major,
        classGroup: String(request.body.classGroup ?? currentStudent.classGroup).trim() || currentStudent.classGroup
      },
      include: {
        university: true
      }
    });

    await assignStudentCommunities(student.id);
    response.json({ student, university: student.university, communities: await getStudentCommunities(student.id) });
  })
);

router.get(
  "/courses",
  asyncHandler(async (request, response) => {
    const currentStudent = await findStudentFromRequest(request);
    const where = {
      ...(currentStudent ? { universityId: currentStudent.universityId } : {}),
      ...(request.query.semester ? { semester: String(request.query.semester) } : {}),
      ...(request.query.year ? { year: String(request.query.year) } : {})
    };
    const courses = await prisma.course.findMany({
      where,
      include: {
        schedules: {
          orderBy: [{ day: "asc" }, { startTime: "asc" }]
        }
      },
      orderBy: [{ code: "asc" }, { name: "asc" }]
    });

    const teacherNames = Array.from(new Set(courses.map((course) => course.teacherName)));
    const ratings = await prisma.teacherRating.findMany({
      where: {
        teacherName: {
          in: teacherNames
        }
      }
    });

    response.json({ courses, ratings });
  })
);

router.get(
  "/courses/search",
  asyncHandler(async (request, response) => {
    const currentStudent = await findStudentFromRequest(request);
    const query = String(request.query.q ?? "").trim();
    const courses = await prisma.course.findMany({
      where: {
        ...(currentStudent ? { universityId: currentStudent.universityId } : {}),
        ...(query
          ? {
              OR: [
                { code: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { teacherName: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        schedules: {
          orderBy: [{ day: "asc" }, { startTime: "asc" }]
        }
      },
      take: 80,
      orderBy: [{ code: "asc" }, { name: "asc" }]
    });

    const ratings = await prisma.teacherRating.findMany({
      where: {
        teacherName: {
          in: Array.from(new Set(courses.map((course) => course.teacherName)))
        }
      }
    });

    response.json({ courses, ratings });
  })
);

router.get(
  "/courses/:id",
  asyncHandler(async (request, response) => {
    const course = await prisma.course.findUnique({
      where: { id: routeParam(request, "id") },
      include: {
        schedules: {
          orderBy: [{ day: "asc" }, { startTime: "asc" }]
        }
      }
    });

    if (!course) throw new ApiError(404, "Хичээл олдсонгүй.");
    response.json({ course });
  })
);

router.get(
  "/schedule/me",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const schedule = await getStudentSchedule(student.id);

    response.json({ schedule: schedule.map(formatEnrollment) });
  })
);

router.get(
  "/schedule/:studentId",
  asyncHandler(async (request, response) => {
    const currentStudent = await requireStudent(request);
    const targetStudent = await prisma.student.findUniqueOrThrow({
      where: { id: routeParam(request, "studentId") }
    });
    ensureSameUniversity(currentStudent, targetStudent);

    const schedule = await getStudentSchedule(targetStudent.id);
    response.json({ student: targetStudent, schedule: schedule.map(formatEnrollment) });
  })
);

router.post(
  "/enroll",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const scheduleId = String(request.body.scheduleId ?? "");
    const result = await addCourseWithPairing(student.id, scheduleId, {
      allowConflicts: Boolean(request.body.force)
    });

    response.status(201).json({
      ...result,
      enrollments: result.enrollments.map(formatEnrollment)
    });
  })
);

router.delete(
  "/enroll/:id",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: routeParam(request, "id") }
    });

    if (!enrollment || enrollment.studentId !== student.id) {
      throw new ApiError(404, "Хуваарийн сонголт олдсонгүй.");
    }

    await prisma.enrollment.delete({ where: { id: enrollment.id } });
    await assignStudentCommunities(student.id);
    response.status(204).send();
  })
);

router.post(
  "/friends/request",
  asyncHandler(async (request, response) => {
    const requester = await requireStudent(request);
    const receiverEmail = request.body.email ? normalizeEmail(String(request.body.email)) : null;
    const receiverId = request.body.receiverId ? String(request.body.receiverId) : null;
    const receiver = receiverId
      ? await prisma.student.findUnique({ where: { id: receiverId } })
      : receiverEmail
        ? await prisma.student.findUnique({ where: { email: receiverEmail } })
        : null;

    if (!receiver) {
      throw new ApiError(404, "Найзаар нэмэх оюутан олдсонгүй. Эхлээд тухайн оюутан системд нэвтэрсэн байх хэрэгтэй.");
    }
    if (receiver.id === requester.id) {
      throw new ApiError(400, "Өөрийгөө найзаар нэмэх боломжгүй.");
    }
    ensureSameUniversity(requester, receiver);

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: requester.id, receiverId: receiver.id },
          { requesterId: receiver.id, receiverId: requester.id }
        ]
      }
    });

    if (existing) {
      throw new ApiError(409, "Энэ найзын хүсэлт аль хэдийн үүссэн байна.", existing);
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId: requester.id,
        receiverId: receiver.id,
        status: FriendshipStatus.pending
      },
      include: {
        requester: true,
        receiver: true
      }
    });

    response.status(201).json({ friendship });
  })
);

router.post(
  "/friends/accept",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const friendshipId = String(request.body.friendshipId ?? "");
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId }
    });

    if (!friendship || friendship.receiverId !== student.id) {
      throw new ApiError(404, "Хүлээн авах найзын хүсэлт олдсонгүй.");
    }

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: FriendshipStatus.accepted },
      include: {
        requester: true,
        receiver: true
      }
    });

    response.json({ friendship: updated });
  })
);

router.get(
  "/friends",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: student.id }, { receiverId: student.id }]
      },
      include: {
        requester: true,
        receiver: true
      },
      orderBy: { createdAt: "desc" }
    });

    response.json({ friendships });
  })
);

router.get(
  "/communities",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    response.json({ communities: await getStudentCommunities(student.id) });
  })
);

router.get(
  "/communities/:id",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const communityId = routeParam(request, "id");
    if (!(await canAccessCommunity(student.id, communityId))) {
      throw new ApiError(403, "Энэ community харах эрхгүй байна.");
    }

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        _count: {
          select: { members: true }
        }
      }
    });

    response.json({ community });
  })
);

router.get(
  "/communities/:id/members",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const communityId = routeParam(request, "id");
    if (!(await canAccessCommunity(student.id, communityId))) {
      throw new ApiError(403, "Энэ community харах эрхгүй байна.");
    }

    const members = await prisma.communityMember.findMany({
      where: { communityId },
      include: {
        student: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    response.json({ members: members.map((member) => member.student) });
  })
);

router.get(
  "/communities/:id/messages",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const communityId = routeParam(request, "id");
    if (!(await canAccessCommunity(student.id, communityId))) {
      throw new ApiError(403, "Энэ community чат харах эрхгүй байна.");
    }

    const messages = await prisma.message.findMany({
      where: { communityId },
      include: {
        sender: true
      },
      orderBy: { createdAt: "asc" },
      take: 100
    });

    response.json({ messages });
  })
);

router.post(
  "/communities/:id/messages",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const content = String(request.body.content ?? "").trim();
    if (!content) throw new ApiError(400, "Мессеж хоосон байна.");
    const communityId = routeParam(request, "id");
    if (!(await canAccessCommunity(student.id, communityId))) {
      throw new ApiError(403, "Энэ community чат руу бичих эрхгүй байна.");
    }

    const message = await prisma.message.create({
      data: {
        communityId,
        senderId: student.id,
        content
      },
      include: {
        sender: true
      }
    });

    response.status(201).json({ message });
  })
);

router.get(
  "/compare",
  asyncHandler(async (request, response) => {
    const currentStudent = await requireStudent(request);
    const studentIds = String(request.query.students ?? "")
      .split(",")
      .map((studentId) => studentId.trim())
      .filter(Boolean);

    if (studentIds.length < 2) {
      throw new ApiError(400, "Харьцуулахын тулд дор хаяж 2 оюутан сонгоно.");
    }

    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds }
      }
    });

    if (students.length !== studentIds.length) {
      throw new ApiError(404, "Харьцуулах оюутан олдсонгүй.");
    }
    students.forEach((student) => ensureSameUniversity(currentStudent, student));

    const schedules = await Promise.all(
      students.map(async (student) => ({
        student,
        schedule: (await getStudentSchedule(student.id)).map(formatEnrollment)
      }))
    );

    response.json({
      students,
      schedules,
      commonFreeTime: await getCommonFreeTime(studentIds)
    });
  })
);

router.get(
  "/teachers/rating",
  asyncHandler(async (request, response) => {
    const name = String(request.query.name ?? "").trim();
    if (!name) throw new ApiError(400, "Багшийн нэр шаардлагатай.");

    const rating = await prisma.teacherRating.findFirst({
      where: {
        teacherName: {
          contains: name,
          mode: "insensitive"
        }
      },
      orderBy: {
        reviewCount: "desc"
      }
    });

    response.json({ rating });
  })
);

export { router as apiRouter };
