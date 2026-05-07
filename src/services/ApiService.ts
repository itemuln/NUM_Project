import type { Course, CourseKind, DayKey } from "@/types";

interface ApiLoginInput {
  email: string;
  name?: string;
  major: string;
  classGroup: string;
  password?: string;
  provider?: "password" | "google" | "microsoft";
}

interface ApiTeacherRating {
  teacherName: string;
  rating: number;
  reviewCount: number;
  source: string;
}

interface ApiSchedule {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  type: CourseKind;
  room: string;
  building: string;
  semester: string;
  year: string;
}

interface ApiCourse {
  id: string;
  code: string;
  name: string;
  teacherName: string;
  credit: number;
  semester: string;
  year: string;
  schedules: ApiSchedule[];
}

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

function headers(studentEmail?: string) {
  return {
    "Content-Type": "application/json",
    ...(studentEmail ? { "x-student-email": studentEmail } : {})
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "API request failed");
  }

  return payload as T;
}

function parseTime(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function mapScheduleType(value: string): CourseKind {
  if (value === "lab") return "lab";
  if (value === "seminar") return "seminar";
  return "lecture";
}

function mapCourses(courses: ApiCourse[], ratings: ApiTeacherRating[]): Course[] {
  const ratingByTeacher = new Map(ratings.map((rating) => [rating.teacherName, rating]));

  return courses.flatMap((course) => {
    const rating = ratingByTeacher.get(course.teacherName);

    return course.schedules.map((schedule) => ({
      id: schedule.id,
      sourceScheduleId: schedule.id,
      communityCourseId: course.id,
      code: course.code,
      name: course.name,
      teacher: course.teacherName,
      rating: rating?.rating ?? 4.2,
      reviewCount: rating?.reviewCount ?? 0,
      kind: mapScheduleType(schedule.type),
      room: schedule.room,
      credits: course.credit,
      preferredDuration: parseTime(schedule.endTime) - parseTime(schedule.startTime),
      department: "Тэнхим тодорхойгүй",
      year: schedule.year,
      semester: schedule.semester,
      day: schedule.day as DayKey,
      startMinutes: parseTime(schedule.startTime),
      endMinutes: parseTime(schedule.endTime),
      building: schedule.building
    }));
  });
}

export const ApiService = {
  login(input: ApiLoginInput) {
    return apiFetch("/auth/login", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(input)
    });
  },

  async fetchCourses(studentEmail: string) {
    const response = await apiFetch<{ courses: ApiCourse[]; ratings: ApiTeacherRating[] }>("/courses", {
      headers: headers(studentEmail)
    });

    return mapCourses(response.courses, response.ratings);
  },

  enroll(studentEmail: string, scheduleId: string, force = false) {
    return apiFetch("/enroll", {
      method: "POST",
      headers: headers(studentEmail),
      body: JSON.stringify({ scheduleId, force })
    });
  },

  removeEnrollment(studentEmail: string, enrollmentId: string) {
    return apiFetch(`/enroll/${enrollmentId}`, {
      method: "DELETE",
      headers: headers(studentEmail)
    });
  },

  requestFriend(studentEmail: string, friendEmail: string) {
    return apiFetch("/friends/request", {
      method: "POST",
      headers: headers(studentEmail),
      body: JSON.stringify({ email: friendEmail })
    });
  },

  sendCommunityMessage(studentEmail: string, communityId: string, content: string) {
    return apiFetch(`/communities/${communityId}/messages`, {
      method: "POST",
      headers: headers(studentEmail),
      body: JSON.stringify({ content })
    });
  }
};
