import { ScheduleType, type Schedule } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError } from "../errors.js";
import { assignStudentCommunities } from "./communityService.js";
import { findTermBySchedule, getOrCreateTimetable, resolveTerm } from "./termService.js";

const dayStartMinutes = 8 * 60;
const dayEndMinutes = 20 * 60;
const minFreeBlockMinutes = 30;
const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface TimeInterval {
  id?: string;
  day: string;
  startTime: string;
  endTime: string;
}

export function timeToMinutes(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function detectConflict(scheduleA: TimeInterval, scheduleB: TimeInterval) {
  if (scheduleA.day !== scheduleB.day) return false;

  return (
    timeToMinutes(scheduleA.startTime) < timeToMinutes(scheduleB.endTime) &&
    timeToMinutes(scheduleB.startTime) < timeToMinutes(scheduleA.endTime)
  );
}

export async function getStudentSchedule(studentId: string, termId?: string | null) {
  return prisma.enrollment.findMany({
    where: {
      studentId,
      ...(termId
        ? {
            timetable: {
              termId
            }
          }
        : {})
    },
    include: {
      timetable: {
        include: {
          term: true
        }
      },
      course: true,
      schedule: {
        include: {
          course: true,
          term: true
        }
      }
    },
    orderBy: [
      {
        schedule: {
          day: "asc"
        }
      },
      {
        schedule: {
          startTime: "asc"
        }
      }
    ]
  });
}

function findConflicts(schedulesToAdd: Schedule[], existingSchedules: Schedule[]) {
  const existingConflicts = schedulesToAdd.flatMap((schedule) =>
    existingSchedules
      .filter((existingSchedule) => detectConflict(schedule, existingSchedule))
      .map((existingSchedule) => ({
        scheduleId: schedule.id,
        conflictWithScheduleId: existingSchedule.id,
        day: schedule.day,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      }))
  );

  const newScheduleConflicts = schedulesToAdd.flatMap((schedule, index) =>
    schedulesToAdd.slice(index + 1).filter((nextSchedule) => detectConflict(schedule, nextSchedule)).map((nextSchedule) => ({
      scheduleId: schedule.id,
      conflictWithScheduleId: nextSchedule.id,
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    }))
  );

  return [...existingConflicts, ...newScheduleConflicts];
}

function sortPairCandidates(candidate: Schedule, existingSchedules: Schedule[]) {
  return existingSchedules.some((existingSchedule) => detectConflict(candidate, existingSchedule)) ? 1 : 0;
}

export async function addCourseWithPairing(
  studentId: string,
  scheduleId: string,
  options: { allowConflicts?: boolean; timetableId?: string; termId?: string } = {}
) {
  const selectedSchedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { course: true }
  });

  if (!selectedSchedule) {
    throw new ApiError(404, "Хуваарийн цаг олдсонгүй.");
  }

  const term = options.termId
    ? await prisma.academicTerm.findUniqueOrThrow({ where: { id: options.termId } })
    : await findTermBySchedule(scheduleId);
  const timetable = options.timetableId
    ? await prisma.timetable.findFirstOrThrow({
        where: {
          id: options.timetableId,
          studentId,
          termId: term.id
        },
        include: { term: true }
      })
    : await getOrCreateTimetable(studentId, term);

  if (selectedSchedule.termId !== term.id) {
    throw new ApiError(400, "Энэ хичээлийн цаг сонгосон улиралд харьяалагдахгүй байна.");
  }

  const duplicate = await prisma.enrollment.findFirst({
    where: {
      timetableId: timetable.id,
      scheduleId
    }
  });

  if (duplicate) {
    throw new ApiError(409, "Энэ цаг таны хуваарьт аль хэдийн байна.");
  }

  const currentEnrollments = await getStudentSchedule(studentId, term.id);
  const existingSchedules = currentEnrollments.map((enrollment) => enrollment.schedule);
  const existingScheduleIds = new Set(existingSchedules.map((schedule) => schedule.id));
  const schedulesToAdd: Schedule[] = [selectedSchedule];
  const targetPairType =
    selectedSchedule.type === ScheduleType.lecture
      ? ScheduleType.seminar
      : selectedSchedule.type === ScheduleType.seminar
        ? ScheduleType.lecture
        : null;

  if (targetPairType) {
    const pairCandidates = await prisma.schedule.findMany({
      where: {
        id: { not: selectedSchedule.id },
        courseId: selectedSchedule.courseId,
        termId: term.id,
        type: targetPairType
      }
    });

    const companion = pairCandidates
      .filter((candidate) => !existingScheduleIds.has(candidate.id))
      .sort((first, second) => {
        const conflictScore = sortPairCandidates(first, existingSchedules) - sortPairCandidates(second, existingSchedules);
        if (conflictScore !== 0) return conflictScore;
        if (first.day !== second.day) return first.day.localeCompare(second.day);
        return timeToMinutes(first.startTime) - timeToMinutes(second.startTime);
      })[0];

    if (companion) {
      schedulesToAdd.push(companion);
    }
  }

  const conflicts = findConflicts(schedulesToAdd, existingSchedules);
  if (conflicts.length > 0 && !options.allowConflicts) {
    throw new ApiError(409, "Хуваарь давхцаж байна. Баталгаажуулбал нэмэх боломжтой.", {
      requiresConfirmation: true,
      conflicts
    });
  }

  const enrollments = await prisma.$transaction(
    schedulesToAdd.map((schedule) =>
      prisma.enrollment.upsert({
        where: {
          studentId_scheduleId: {
            studentId,
            scheduleId: schedule.id
          }
        },
        update: {},
        create: {
          studentId,
          timetableId: timetable.id,
          courseId: schedule.courseId,
          scheduleId: schedule.id
        },
        include: {
          timetable: {
            include: {
              term: true
            }
          },
          course: true,
          schedule: {
            include: {
              course: true,
              term: true
            }
          }
        }
      })
    )
  );

  await assignStudentCommunities(studentId);

  return {
    enrollments,
    timetable,
    term,
    addedScheduleIds: schedulesToAdd.map((schedule) => schedule.id),
    paired: schedulesToAdd.length > 1,
    conflicts
  };
}

export async function getCommonFreeTime(studentIds: string[], termId?: string | null) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: {
        in: studentIds
      },
      ...(termId
        ? {
            timetable: {
              termId
            }
          }
        : {})
    },
    include: {
      schedule: true
    }
  });

  const busyByDay = new Map<string, Array<{ start: number; end: number }>>();

  weekDays.forEach((day) => busyByDay.set(day, []));
  enrollments.forEach((enrollment) => {
    const intervals = busyByDay.get(enrollment.schedule.day) ?? [];
    intervals.push({
      start: timeToMinutes(enrollment.schedule.startTime),
      end: timeToMinutes(enrollment.schedule.endTime)
    });
    busyByDay.set(enrollment.schedule.day, intervals);
  });

  return weekDays.flatMap((day) => {
    const intervals = (busyByDay.get(day) ?? []).sort((first, second) => first.start - second.start);
    const merged = intervals.reduce<Array<{ start: number; end: number }>>((accumulator, interval) => {
      const previous = accumulator[accumulator.length - 1];
      if (!previous || interval.start > previous.end) {
        accumulator.push({ ...interval });
        return accumulator;
      }

      previous.end = Math.max(previous.end, interval.end);
      return accumulator;
    }, []);

    const freeBlocks: Array<{ day: string; startTime: string; endTime: string }> = [];
    let cursor = dayStartMinutes;

    merged.forEach((interval) => {
      if (interval.start - cursor >= minFreeBlockMinutes) {
        freeBlocks.push({
          day,
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(interval.start)
        });
      }
      cursor = Math.max(cursor, interval.end);
    });

    if (dayEndMinutes - cursor >= minFreeBlockMinutes) {
      freeBlocks.push({
        day,
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(dayEndMinutes)
      });
    }

    return freeBlocks;
  });
}

export async function getStudentTermTimetable(input: {
  studentId: string;
  universityId: string;
  termId?: string | null;
  semester?: string | null;
  year?: string | null;
}) {
  const term = await resolveTerm(input);
  const timetable = await getOrCreateTimetable(input.studentId, term);
  const enrollments = await getStudentSchedule(input.studentId, term.id);

  return {
    term,
    timetable,
    enrollments
  };
}
