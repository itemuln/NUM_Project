import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schedulePath = path.join(root, "hicheeliin-huvaari");
const coursePath = path.join(root, "course");
const outDir = path.join(root, "public", "data");

const dayMap = new Map([
  ["Даваа", "monday"],
  ["Мягмар", "tuesday"],
  ["Лхагва", "wednesday"],
  ["Пүрэв", "thursday"],
  ["Баасан", "friday"],
  ["Бямба", "saturday"],
  ["Ням", "sunday"]
]);

function parseTime(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function hashNumber(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function teacherRating(seed) {
  const hash = hashNumber(seed);
  return Number((4 + (hash % 10) / 10).toFixed(1));
}

function reviewCount(seed) {
  return 12 + (hashNumber(seed) % 74);
}

const courses = JSON.parse(fs.readFileSync(coursePath, "utf8"));
const schedules = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
const courseById = new Map(courses.map((course) => [course.khicheeliin_dugaar, course]));
const seen = new Set();
const targetTerms = [
  { year: "2025-2026", semester: "Намрын улирал", slug: "2025-2026-fall" },
  { year: "2025-2026", semester: "Хаврын улирал", slug: "2025-2026-spring" },
  { year: "2026-2027", semester: "Намрын улирал", slug: "2026-2027-fall" },
  { year: "2026-2027", semester: "Хаврын улирал", slug: "2026-2027-spring" },
  { year: "2027-2028", semester: "Намрын улирал", slug: "2027-2028-fall" },
  { year: "2027-2028", semester: "Хаврын улирал", slug: "2027-2028-spring" }
];

function termSlug(year, semester) {
  const season = semester?.includes("Хав") ? "spring" : "fall";
  return `${year}-${season}`;
}

function withTermSuffix(id, sourceYear, sourceSemester, term) {
  if (sourceYear === term.year && sourceSemester === term.semester) return id;
  return `${id}-${term.slug}`;
}

const baseCatalog = schedules.flatMap((schedule) => {
  if (!schedule.khuvaariin_dugaar || seen.has(schedule.khuvaariin_dugaar)) return [];

  const day = dayMap.get(schedule.garag);
  const startMinutes = parseTime(schedule.ekhlekh_tsag);
  const endMinutes = parseTime(schedule.duusakh_tsag);

  if (!day || startMinutes === null || endMinutes === null) return [];
  if (startMinutes < 8 * 60 || endMinutes > 20 * 60 || endMinutes <= startMinutes) return [];

  seen.add(schedule.khuvaariin_dugaar);

  const course = courseById.get(schedule.khicheeliin_dugaar);
  const kind = schedule.khicheeliin_khelber === "Лекц" ? "lecture" : "seminar";
  const room = [schedule.khicheellekh_bair, schedule.uruunii_dugaar].filter(Boolean).join(" · ");
  const year = schedule.khicheeliin_jil ?? "2025-2026";
  const semester = schedule.uliral ?? "Намрын улирал";

  return {
    id: schedule.khuvaariin_dugaar,
    sourceScheduleId: schedule.khuvaariin_dugaar,
    communityCourseId: schedule.khicheeliin_dugaar,
    baseScheduleId: schedule.khuvaariin_dugaar,
    baseCourseId: schedule.khicheeliin_dugaar,
    code: course?.khicheeliin_indyeks ?? schedule.khicheeliin_dugaar.slice(0, 8).toUpperCase(),
    name: schedule.khicheeliin_ner,
    teacher: schedule.zaasan_bagshiin_ner,
    rating: teacherRating(schedule.bagshiin_khuviin_dugaar ?? schedule.zaasan_bagshiin_ner ?? schedule.khuvaariin_dugaar),
    reviewCount: reviewCount(schedule.bagshiin_khuviin_dugaar ?? schedule.zaasan_bagshiin_ner ?? schedule.khuvaariin_dugaar),
    kind,
    room: room || "Өрөө тодорхойгүй",
    credits: Number(schedule.bagts_tsag ?? course?.bagts_tsag ?? 0),
    preferredDuration: endMinutes - startMinutes,
    department: course?.khariyaalakh_tenkhim ?? course?.khariyaalakh_butets ?? "Тэнхим тодорхойгүй",
    year,
    semester,
    sourceTermSlug: termSlug(year, semester),
    day,
    startMinutes,
    endMinutes,
    capacity: Number(schedule.bolomjit_suudal ?? 0),
    enrolledCount: Number(schedule.batalgaajuulsan_suraltsagchiin_too ?? 0),
    building: schedule.khicheellekh_bair
  };
});

const catalog = baseCatalog.flatMap((entry) =>
  targetTerms.map((term) => {
    const { baseScheduleId, baseCourseId, sourceTermSlug, ...course } = entry;
    const id = withTermSuffix(entry.baseScheduleId, entry.year, entry.semester, term);
    const communityCourseId = withTermSuffix(entry.baseCourseId, entry.year, entry.semester, term);

    return {
      ...course,
      id,
      sourceScheduleId: id,
      communityCourseId,
      year: term.year,
      semester: term.semester
    };
  })
);

const semesterOptions = Array.from(
  new Set(catalog.map((course) => `${course.year} · ${course.semester}`).filter(Boolean))
).sort();

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "course-catalog.json"), `${JSON.stringify(catalog)}\n`);
fs.writeFileSync(
  path.join(outDir, "course-catalog-meta.json"),
  `${JSON.stringify({ count: catalog.length, semesterOptions })}\n`
);

console.log(`Built ${catalog.length} course schedule records.`);
