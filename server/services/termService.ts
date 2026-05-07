import { TermSeason, type AcademicTerm } from "@prisma/client";
import { prisma } from "../db.js";

const plannedYears = ["2025-2026", "2026-2027", "2027-2028"];

export function seasonFromSemester(semester?: string | null) {
  return semester?.toLowerCase().includes("хав") || semester?.toLowerCase().includes("spring")
    ? TermSeason.spring
    : TermSeason.fall;
}

export function termLabel(academicYear: string, season: TermSeason) {
  return `${academicYear} · ${season === TermSeason.spring ? "Хаврын улирал" : "Намрын улирал"}`;
}

function stableTermId(universityId: string, academicYear: string, season: TermSeason) {
  return `term-${universityId}-${academicYear}-${season}`;
}

export async function ensureUniversityTerms(universityId: string) {
  await prisma.academicTerm.createMany({
    data: plannedYears.flatMap((academicYear) => [
      {
        id: stableTermId(universityId, academicYear, TermSeason.fall),
        universityId,
        academicYear,
        season: TermSeason.fall,
        label: termLabel(academicYear, TermSeason.fall)
      },
      {
        id: stableTermId(universityId, academicYear, TermSeason.spring),
        universityId,
        academicYear,
        season: TermSeason.spring,
        label: termLabel(academicYear, TermSeason.spring)
      }
    ]),
    skipDuplicates: true
  });
}

export async function findTermBySchedule(scheduleId: string) {
  const schedule = await prisma.schedule.findUniqueOrThrow({
    where: { id: scheduleId },
    include: { term: true }
  });

  return schedule.term;
}

export async function resolveTerm(input: {
  universityId: string;
  termId?: string | null;
  semester?: string | null;
  year?: string | null;
}) {
  await ensureUniversityTerms(input.universityId);

  if (input.termId) {
    return prisma.academicTerm.findFirstOrThrow({
      where: {
        id: input.termId,
        universityId: input.universityId
      }
    });
  }

  if (input.year || input.semester) {
    return prisma.academicTerm.findUniqueOrThrow({
      where: {
        universityId_academicYear_season: {
          universityId: input.universityId,
          academicYear: input.year ?? "2025-2026",
          season: seasonFromSemester(input.semester)
        }
      }
    });
  }

  return prisma.academicTerm.findFirstOrThrow({
    where: { universityId: input.universityId },
    orderBy: [{ academicYear: "asc" }, { season: "desc" }]
  });
}

export async function getOrCreateTimetable(studentId: string, term: AcademicTerm) {
  return prisma.timetable.upsert({
    where: {
      studentId_termId_name: {
        studentId,
        termId: term.id,
        name: term.label
      }
    },
    update: {
      isActive: true
    },
    create: {
      id: `timetable-${studentId}-${term.id}`,
      studentId,
      termId: term.id,
      name: term.label,
      isActive: true,
      isShared: true,
      shareToken: `share-${studentId}-${term.id}`
    },
    include: {
      term: true
    }
  });
}
