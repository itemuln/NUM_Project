import { CommunityType } from "@prisma/client";
import { prisma } from "../db.js";

async function upsertCommunity(input: {
  name: string;
  type: CommunityType;
  universityId: string;
  referenceId: string;
}) {
  return prisma.community.upsert({
    where: {
      universityId_type_referenceId: {
        universityId: input.universityId,
        type: input.type,
        referenceId: input.referenceId
      }
    },
    update: { name: input.name },
    create: input
  });
}

async function addMember(communityId: string, studentId: string) {
  return prisma.communityMember.upsert({
    where: {
      communityId_studentId: {
        communityId,
        studentId
      }
    },
    update: {},
    create: {
      communityId,
      studentId
    }
  });
}

export async function assignStudentCommunities(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      university: true,
      enrollments: {
        include: {
          course: true
        }
      }
    }
  });

  const desiredCommunityIds = new Set<string>();
  const schoolCommunity = await upsertCommunity({
    name: `${student.university.name} оюутнууд`,
    type: CommunityType.school,
    universityId: student.universityId,
    referenceId: student.university.domain
  });
  desiredCommunityIds.add(schoolCommunity.id);
  await addMember(schoolCommunity.id, student.id);

  const classReference = `${student.major}:${student.classGroup}`;
  const classCommunity = await upsertCommunity({
    name: student.classGroup ? `${student.major} · ${student.classGroup}` : student.major,
    type: CommunityType.major,
    universityId: student.universityId,
    referenceId: classReference
  });
  desiredCommunityIds.add(classCommunity.id);
  await addMember(classCommunity.id, student.id);

  const courses = new Map(student.enrollments.map((enrollment) => [enrollment.courseId, enrollment.course]));

  await Promise.all(
    Array.from(courses.values()).map(async (course) => {
      const courseCommunity = await upsertCommunity({
        name: course.name,
        type: CommunityType.course,
        universityId: student.universityId,
        referenceId: course.id
      });

      desiredCommunityIds.add(courseCommunity.id);
      await addMember(courseCommunity.id, student.id);
    })
  );

  await prisma.communityMember.deleteMany({
    where: {
      studentId: student.id,
      community: {
        universityId: student.universityId,
        type: {
          in: [CommunityType.school, CommunityType.major, CommunityType.course]
        },
        id: {
          notIn: Array.from(desiredCommunityIds)
        }
      }
    }
  });
}

export async function canAccessCommunity(studentId: string, communityId: string) {
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_studentId: {
        communityId,
        studentId
      }
    },
    include: {
      community: true
    }
  });

  return Boolean(membership);
}

export async function getStudentCommunities(studentId: string) {
  return prisma.community.findMany({
    where: {
      members: {
        some: {
          studentId
        }
      }
    },
    include: {
      _count: {
        select: {
          members: true
        }
      }
    },
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });
}
