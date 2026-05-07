import { Router, type NextFunction, type Request, type Response } from "express";
import { AuthProvider, FriendshipStatus, type Student } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError } from "../errors.js";
import { hashPassword, verifyPassword } from "../services/authService.js";
import { assignStudentCommunities, canAccessCommunity, getStudentCommunities } from "../services/communityService.js";
import {
  addCourseWithPairing,
  getCommonFreeTime,
  getStudentSchedule,
  getStudentTermTimetable
} from "../services/scheduleService.js";
import { ensureUniversityTerms, getOrCreateTimetable, resolveTerm } from "../services/termService.js";
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
    timetableId: enrollment.timetableId,
    termId: enrollment.timetable.termId,
    termLabel: enrollment.timetable.term.label,
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

function formatCourseReview(review: {
  id: string;
  courseId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}) {
  return {
    id: review.id,
    courseId: review.courseId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString()
  };
}

function parseProvider(value: unknown) {
  if (value === "google") return AuthProvider.google;
  if (value === "microsoft" || value === "teams") return AuthProvider.microsoft;
  return AuthProvider.password;
}

function parseAuthMode(value: unknown) {
  return value === "login" ? "login" : "signup";
}

async function areFriends(studentId: string, otherStudentId: string) {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: FriendshipStatus.accepted,
      OR: [
        { requesterId: studentId, receiverId: otherStudentId },
        { requesterId: otherStudentId, receiverId: studentId }
      ]
    }
  });

  return Boolean(friendship);
}

async function getOrCreateAndShareTimetable(studentId: string, termId: string) {
  const term = await prisma.academicTerm.findUniqueOrThrow({ where: { id: termId } });
  const timetable = await getOrCreateTimetable(studentId, term);

  return prisma.timetable.update({
    where: { id: timetable.id },
    data: { isShared: true },
    include: { term: true }
  });
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
    const provider = parseProvider(request.body.provider);
    const authMode = parseAuthMode(request.body.mode);
    const password = String(request.body.password ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Оюутны имэйл хаяг буруу байна.");
    }
    if (provider === AuthProvider.password && password.length < 6) {
      throw new ApiError(400, "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.");
    }

    await ensureKnownUniversities();
    const university = await ensureUniversityForEmail(email);
    await ensureUniversityTerms(university.id);
    const providerUserId = provider === AuthProvider.password ? email : String(request.body.providerUserId ?? email);
    const authAccount = await prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId
        }
      },
      include: {
        student: {
          include: {
            university: true
          }
        }
      }
    });

    if (authMode === "login") {
      if (!authAccount) {
        throw new ApiError(404, "Account олдсонгүй. Эхлээд бүртгүүлнэ үү.");
      }
      if (authAccount.student.universityId !== university.id) {
        throw new ApiError(403, "Энэ account өөр сургуулийн домэйнтэй байна.");
      }
      if (provider === AuthProvider.password && !verifyPassword(password, authAccount.passwordHash)) {
        throw new ApiError(401, "Нууц үг буруу байна.");
      }

      const student = authAccount.student;
      await assignStudentCommunities(student.id);
      const communities = await getStudentCommunities(student.id);
      const terms = await prisma.academicTerm.findMany({
        where: { universityId: student.universityId },
        orderBy: [{ academicYear: "asc" }, { season: "desc" }]
      });
      const activeTimetable = await getStudentTermTimetable({
        studentId: student.id,
        universityId: student.universityId
      });

      response.json({ student, university: student.university, communities, terms, activeTimetable });
      return;
    }

    if (authAccount) {
      throw new ApiError(409, "Энэ provider дээр account бүртгэлтэй байна. Нэвтрэх хэсгээр орно уу.");
    }

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

    await prisma.authAccount.create({
      data: {
        studentId: student.id,
        provider,
        providerUserId,
        passwordHash: provider === AuthProvider.password ? hashPassword(password) : null
      }
    });

    await assignStudentCommunities(student.id);
    const communities = await getStudentCommunities(student.id);
    const terms = await prisma.academicTerm.findMany({
      where: { universityId: student.universityId },
      orderBy: [{ academicYear: "asc" }, { season: "desc" }]
    });
    const activeTimetable = await getStudentTermTimetable({
      studentId: student.id,
      universityId: student.universityId
    });

    response.json({ student, university, communities, terms, activeTimetable });
  })
);

router.get(
  "/me",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const communities = await getStudentCommunities(student.id);
    const terms = await prisma.academicTerm.findMany({
      where: { universityId: student.universityId },
      orderBy: [{ academicYear: "asc" }, { season: "desc" }]
    });

    response.json({ student, university: student.university, communities, terms });
  })
);

router.get(
  "/terms",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    await ensureUniversityTerms(student.universityId);
    const terms = await prisma.academicTerm.findMany({
      where: { universityId: student.universityId },
      orderBy: [{ academicYear: "asc" }, { season: "desc" }]
    });

    response.json({ terms });
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
      ...(request.query.termId ? { termId: String(request.query.termId) } : {}),
      ...(request.query.semester ? { semester: String(request.query.semester) } : {}),
      ...(request.query.year ? { year: String(request.query.year) } : {})
    };
    const courses = await prisma.course.findMany({
      where,
      include: {
        schedules: {
          where: request.query.termId ? { termId: String(request.query.termId) } : undefined,
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
        ...(request.query.termId ? { termId: String(request.query.termId) } : {}),
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
          where: request.query.termId ? { termId: String(request.query.termId) } : undefined,
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
  "/courses/:id/reviews",
  asyncHandler(async (request, response) => {
    const course = await prisma.course.findUnique({
      where: { id: routeParam(request, "id") }
    });

    if (!course) throw new ApiError(404, "Хичээл олдсонгүй.");

    const reviews = await prisma.courseReview.findMany({
      where: { courseId: course.id },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    response.json({ reviews: reviews.map(formatCourseReview) });
  })
);

router.post(
  "/courses/:id/reviews",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const course = await prisma.course.findUnique({
      where: { id: routeParam(request, "id") }
    });

    if (!course) throw new ApiError(404, "Хичээл олдсонгүй.");
    if (course.universityId !== student.universityId) {
      throw new ApiError(403, "Өөр сургуулийн хичээлд review үлдээх боломжгүй.");
    }

    const rating = Number(request.body.rating);
    const comment = String(request.body.comment ?? "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ApiError(400, "Үнэлгээ 1-5 хооронд байх ёстой.");
    }
    if (!comment) {
      throw new ApiError(400, "Сэтгэгдэл хоосон байна.");
    }

    const review = await prisma.courseReview.create({
      data: {
        courseId: course.id,
        studentId: null,
        rating,
        comment
      }
    });

    response.status(201).json({ review: formatCourseReview(review) });
  })
);

router.get(
  "/schedule/me",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const term = await resolveTerm({
      universityId: student.universityId,
      termId: request.query.termId ? String(request.query.termId) : null,
      semester: request.query.semester ? String(request.query.semester) : null,
      year: request.query.year ? String(request.query.year) : null
    });
    const { timetable } = await getStudentTermTimetable({
      studentId: student.id,
      universityId: student.universityId,
      termId: term.id
    });
    const schedule = await getStudentSchedule(student.id, term.id);

    response.json({ term, timetable, schedule: schedule.map(formatEnrollment) });
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
    if (targetStudent.id !== currentStudent.id && !(await areFriends(currentStudent.id, targetStudent.id))) {
      throw new ApiError(403, "Энэ оюутны хуваарийг харахын тулд найз байх шаардлагатай.");
    }

    const term = await resolveTerm({
      universityId: currentStudent.universityId,
      termId: request.query.termId ? String(request.query.termId) : null,
      semester: request.query.semester ? String(request.query.semester) : null,
      year: request.query.year ? String(request.query.year) : null
    });
    const timetable = await prisma.timetable.findFirst({
      where: {
        studentId: targetStudent.id,
        termId: term.id,
        OR: [{ isShared: true }, { studentId: currentStudent.id }]
      }
    });

    if (!timetable) {
      throw new ApiError(403, "Энэ улирлын хуваарь share хийгдээгүй байна.");
    }

    const schedule = await getStudentSchedule(targetStudent.id, term.id);
    response.json({ student: targetStudent, term, timetable, schedule: schedule.map(formatEnrollment) });
  })
);

router.get(
  "/timetables/me",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const term = await resolveTerm({
      universityId: student.universityId,
      termId: request.query.termId ? String(request.query.termId) : null,
      semester: request.query.semester ? String(request.query.semester) : null,
      year: request.query.year ? String(request.query.year) : null
    });
    const timetable = await getStudentTermTimetable({
      studentId: student.id,
      universityId: student.universityId,
      termId: term.id
    });

    response.json({
      term: timetable.term,
      timetable: timetable.timetable,
      schedule: timetable.enrollments.map(formatEnrollment)
    });
  })
);

router.post(
  "/timetables/share",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const term = await resolveTerm({
      universityId: student.universityId,
      termId: request.body.termId ? String(request.body.termId) : null,
      semester: request.body.semester ? String(request.body.semester) : null,
      year: request.body.year ? String(request.body.year) : null
    });
    const timetable = await getOrCreateAndShareTimetable(student.id, term.id);

    response.json({
      timetable,
      shareUrl: `${request.protocol}://${request.get("host")}/api/timetables/share/${timetable.shareToken}`
    });
  })
);

router.get(
  "/timetables/share/:token",
  asyncHandler(async (request, response) => {
    const timetable = await prisma.timetable.findUnique({
      where: { shareToken: routeParam(request, "token") },
      include: {
        student: true,
        term: true
      }
    });

    if (!timetable || !timetable.isShared) {
      throw new ApiError(404, "Share хийсэн хуваарь олдсонгүй.");
    }

    const schedule = await getStudentSchedule(timetable.studentId, timetable.termId);
    response.json({ timetable, student: timetable.student, term: timetable.term, schedule: schedule.map(formatEnrollment) });
  })
);

router.post(
  "/enroll",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const scheduleId = String(request.body.scheduleId ?? "");
    const result = await addCourseWithPairing(student.id, scheduleId, {
      allowConflicts: Boolean(request.body.force),
      timetableId: request.body.timetableId ? String(request.body.timetableId) : undefined,
      termId: request.body.termId ? String(request.body.termId) : undefined
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
    let receiver = receiverId
      ? await prisma.student.findUnique({ where: { id: receiverId } })
      : receiverEmail
        ? await prisma.student.findUnique({ where: { email: receiverEmail } })
        : null;

    if (!receiver && receiverEmail) {
      const receiverUniversity = await ensureUniversityForEmail(receiverEmail);
      if (receiverUniversity.id !== requester.universityId) {
        throw new ApiError(403, "Одоогоор зөвхөн нэг сургуулийн оюутныг найзаар нэмнэ.");
      }

      await ensureUniversityTerms(receiverUniversity.id);
      receiver = await prisma.student.create({
        data: {
          email: receiverEmail,
          name: receiverEmail.split("@")[0],
          universityId: receiverUniversity.id,
          major: "Тодорхойгүй хөтөлбөр",
          classGroup: "Тодорхойгүй"
        }
      });
      await prisma.authAccount.create({
        data: {
          studentId: receiver.id,
          provider: AuthProvider.password,
          providerUserId: receiverEmail
        }
      });
      await assignStudentCommunities(receiver.id);
    }

    if (!receiver) {
      throw new ApiError(404, "Найзаар нэмэх оюутан олдсонгүй.");
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
      const friendship =
        existing.status === FriendshipStatus.rejected
          ? await prisma.friendship.update({
              where: { id: existing.id },
              data: { status: FriendshipStatus.pending },
              include: { requester: true, receiver: true }
            })
          : await prisma.friendship.findUniqueOrThrow({
              where: { id: existing.id },
              include: { requester: true, receiver: true }
            });

      response.json({ friendship, alreadyExists: true });
      return;
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
  "/friends/:id/timetable",
  asyncHandler(async (request, response) => {
    const student = await requireStudent(request);
    const friendId = routeParam(request, "id");
    const friend = await prisma.student.findUniqueOrThrow({ where: { id: friendId } });
    ensureSameUniversity(student, friend);
    if (!(await areFriends(student.id, friend.id))) {
      throw new ApiError(403, "Энэ хуваарийг харахын тулд найз байх шаардлагатай.");
    }

    const term = await resolveTerm({
      universityId: student.universityId,
      termId: request.query.termId ? String(request.query.termId) : null,
      semester: request.query.semester ? String(request.query.semester) : null,
      year: request.query.year ? String(request.query.year) : null
    });
    const timetable = await prisma.timetable.findFirst({
      where: {
        studentId: friend.id,
        termId: term.id,
        isShared: true
      }
    });

    if (!timetable) throw new ApiError(404, "Найзын энэ улирлын share хийсэн хуваарь алга.");

    const schedule = await getStudentSchedule(friend.id, term.id);
    response.json({ friend, term, timetable, schedule: schedule.map(formatEnrollment) });
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
    const term = await resolveTerm({
      universityId: currentStudent.universityId,
      termId: request.query.termId ? String(request.query.termId) : null,
      semester: request.query.semester ? String(request.query.semester) : null,
      year: request.query.year ? String(request.query.year) : null
    });

    await Promise.all(
      students
        .filter((student) => student.id !== currentStudent.id)
        .map(async (student) => {
          if (!(await areFriends(currentStudent.id, student.id))) {
            throw new ApiError(403, "Зөвхөн найзуудын share хийсэн ижил улирлын хуваарийг харьцуулна.");
          }
        })
    );

    const schedules = await Promise.all(
      students.map(async (student) => ({
        student,
        schedule: (await getStudentSchedule(student.id, term.id)).map(formatEnrollment)
      }))
    );

    response.json({
      term,
      students,
      schedules,
      commonFreeTime: await getCommonFreeTime(studentIds, term.id)
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
