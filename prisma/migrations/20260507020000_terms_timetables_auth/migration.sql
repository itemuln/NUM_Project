-- CreateEnum
CREATE TYPE "TermSeason" AS ENUM ('spring', 'fall');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('password', 'google', 'microsoft');

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "season" "TermSeason" NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timetable" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- Create current and future academic terms for every university.
INSERT INTO "AcademicTerm" ("id", "universityId", "academicYear", "season", "label")
SELECT
  'term-' || u.id || '-2025-2026-fall',
  u.id,
  '2025-2026',
  'fall'::"TermSeason",
  '2025-2026 · Намрын улирал'
FROM "University" u
ON CONFLICT DO NOTHING;

INSERT INTO "AcademicTerm" ("id", "universityId", "academicYear", "season", "label")
SELECT
  'term-' || u.id || '-2025-2026-spring',
  u.id,
  '2025-2026',
  'spring'::"TermSeason",
  '2025-2026 · Хаврын улирал'
FROM "University" u
ON CONFLICT DO NOTHING;

INSERT INTO "AcademicTerm" ("id", "universityId", "academicYear", "season", "label")
SELECT
  'term-' || u.id || '-2026-2027-fall',
  u.id,
  '2026-2027',
  'fall'::"TermSeason",
  '2026-2027 · Намрын улирал'
FROM "University" u
ON CONFLICT DO NOTHING;

INSERT INTO "AcademicTerm" ("id", "universityId", "academicYear", "season", "label")
SELECT
  'term-' || u.id || '-2026-2027-spring',
  u.id,
  '2026-2027',
  'spring'::"TermSeason",
  '2026-2027 · Хаврын улирал'
FROM "University" u
ON CONFLICT DO NOTHING;

INSERT INTO "AcademicTerm" ("id", "universityId", "academicYear", "season", "label")
SELECT
  'term-' || u.id || '-2027-2028-fall',
  u.id,
  '2027-2028',
  'fall'::"TermSeason",
  '2027-2028 · Намрын улирал'
FROM "University" u
ON CONFLICT DO NOTHING;

INSERT INTO "AcademicTerm" ("id", "universityId", "academicYear", "season", "label")
SELECT
  'term-' || u.id || '-2027-2028-spring',
  u.id,
  '2027-2028',
  'spring'::"TermSeason",
  '2027-2028 · Хаврын улирал'
FROM "University" u
ON CONFLICT DO NOTHING;

-- Add nullable columns first, backfill, then make them required.
ALTER TABLE "Course" ADD COLUMN "termId" TEXT;
ALTER TABLE "Schedule" ADD COLUMN "termId" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN "timetableId" TEXT;

UPDATE "Course" c
SET "termId" = t.id
FROM "AcademicTerm" t
WHERE t."universityId" = c."universityId"
  AND t."academicYear" = c.year
  AND t.season = CASE
    WHEN lower(c.semester) LIKE '%хав%' OR lower(c.semester) LIKE '%spring%' THEN 'spring'::"TermSeason"
    ELSE 'fall'::"TermSeason"
  END;

UPDATE "Schedule" s
SET "termId" = c."termId"
FROM "Course" c
WHERE c.id = s."courseId";

INSERT INTO "Timetable" ("id", "studentId", "termId", "name", "isActive", "isShared", "shareToken")
SELECT DISTINCT
  'timetable-' || e."studentId" || '-' || s."termId",
  e."studentId",
  s."termId",
  t.label,
  true,
  true,
  'share-' || e."studentId" || '-' || s."termId"
FROM "Enrollment" e
JOIN "Schedule" s ON s.id = e."scheduleId"
JOIN "AcademicTerm" t ON t.id = s."termId"
WHERE s."termId" IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE "Enrollment" e
SET "timetableId" = tt.id
FROM "Schedule" s
JOIN "Timetable" tt ON tt."termId" = s."termId"
WHERE s.id = e."scheduleId"
  AND tt."studentId" = e."studentId";

INSERT INTO "AuthAccount" ("id", "studentId", "provider", "providerUserId")
SELECT
  'auth-password-' || s.id,
  s.id,
  'password'::"AuthProvider",
  lower(s.email)
FROM "Student" s
ON CONFLICT DO NOTHING;

ALTER TABLE "Course" ALTER COLUMN "termId" SET NOT NULL;
ALTER TABLE "Schedule" ALTER COLUMN "termId" SET NOT NULL;
ALTER TABLE "Enrollment" ALTER COLUMN "timetableId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTerm_universityId_academicYear_season_key" ON "AcademicTerm"("universityId", "academicYear", "season");
CREATE INDEX "AcademicTerm_universityId_idx" ON "AcademicTerm"("universityId");
CREATE UNIQUE INDEX "Timetable_shareToken_key" ON "Timetable"("shareToken");
CREATE UNIQUE INDEX "Timetable_studentId_termId_name_key" ON "Timetable"("studentId", "termId", "name");
CREATE INDEX "Timetable_studentId_idx" ON "Timetable"("studentId");
CREATE INDEX "Timetable_termId_idx" ON "Timetable"("termId");
CREATE UNIQUE INDEX "AuthAccount_provider_providerUserId_key" ON "AuthAccount"("provider", "providerUserId");
CREATE UNIQUE INDEX "AuthAccount_studentId_provider_key" ON "AuthAccount"("studentId", "provider");
CREATE INDEX "AuthAccount_studentId_idx" ON "AuthAccount"("studentId");
CREATE INDEX "Course_termId_idx" ON "Course"("termId");
CREATE INDEX "Schedule_termId_idx" ON "Schedule"("termId");
CREATE INDEX "Enrollment_timetableId_idx" ON "Enrollment"("timetableId");
CREATE UNIQUE INDEX "Enrollment_timetableId_scheduleId_key" ON "Enrollment"("timetableId", "scheduleId");

-- AddForeignKey
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
