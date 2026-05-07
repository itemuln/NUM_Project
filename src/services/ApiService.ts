import { CommunityService } from "@/services/CommunityService";
import type { Course, CourseKind, CourseReview, DayKey, Friend, ScheduleItem } from "@/types";

interface ApiLoginInput {
  email: string;
  mode: "login" | "signup";
  name?: string;
  major: string;
  classGroup: string;
  password?: string;
  provider?: "password" | "google" | "microsoft";
}

interface ApiTerm {
  id: string;
  academicYear: string;
  semester?: string;
  season?: string;
  label: string;
}

interface ApiLoginResponse {
  student?: ApiStudent;
  terms?: ApiTerm[];
}

interface ApiStudent {
  id: string;
  email: string;
  name: string;
  major: string;
  classGroup: string;
}

interface ApiFriendship {
  id: string;
  status: "pending" | "accepted" | "rejected";
  requesterId: string;
  receiverId: string;
  requester: ApiStudent;
  receiver: ApiStudent;
}

interface ApiTeacherRating {
  teacherName: string;
  rating: number;
  reviewCount: number;
  source: string;
}

interface ApiCourseReview {
  id: string;
  courseId: string;
  rating: number;
  comment: string;
  createdAt: string;
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

interface ApiEnrollment {
  id: string;
  timetableId: string;
  termId: string;
  termLabel: string;
  courseId: string;
  scheduleId: string;
  courseName: string;
  teacherName: string;
  code: string;
  credit: number;
  day: string;
  startTime: string;
  endTime: string;
  type: CourseKind;
  room: string;
  building: string;
  semester: string;
  year: string;
}

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

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
    throw new ApiRequestError(payload?.error ?? "API request failed", response.status);
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

function semesterKeyFromParts(year?: string, semester?: string) {
  return `${year ?? "2025-2026"} · ${semester ?? "Намрын улирал"}`;
}

function parseSemesterKey(value: string) {
  const [yearPart, semesterPart] = value.split("·").map((part) => part.trim());

  return {
    year: yearPart || "2025-2026",
    semester: semesterPart || "Намрын улирал"
  };
}

function scheduleQuery(semesterKey: string) {
  const params = new URLSearchParams(parseSemesterKey(semesterKey));

  return params.toString();
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

function mapCourseReview(review: ApiCourseReview): CourseReview {
  return {
    id: review.id,
    course_id: review.courseId,
    rating: review.rating,
    comment: review.comment,
    created_at: review.createdAt
  };
}

function mapFriendship(friendship: ApiFriendship, currentStudentEmail: string): Friend {
  const currentEmail = currentStudentEmail.toLowerCase();
  const isRequester = friendship.requester.email.toLowerCase() === currentEmail;
  const otherStudent = isRequester ? friendship.receiver : friendship.requester;

  return {
    id: `friend-${otherStudent.id}`,
    studentId: otherStudent.id,
    friendshipId: friendship.id,
    status: friendship.status,
    direction: isRequester ? "outgoing" : "incoming",
    name: otherStudent.name,
    email: otherStudent.email,
    group: otherStudent.classGroup,
    school: CommunityService.detectSchoolFromEmail(otherStudent.email),
    major: otherStudent.major,
    classGroup: otherStudent.classGroup,
    accent: "#14b8a6",
    schedule: []
  };
}

function mapEnrollment(enrollment: ApiEnrollment, studentId?: string): ScheduleItem {
  return {
    id: enrollment.id,
    studentId,
    courseId: enrollment.scheduleId,
    scheduleId: enrollment.scheduleId,
    sourceScheduleId: enrollment.scheduleId,
    communityCourseId: enrollment.courseId,
    semesterKey: enrollment.termLabel || semesterKeyFromParts(enrollment.year, enrollment.semester),
    year: enrollment.year,
    semester: enrollment.semester,
    courseName: enrollment.courseName,
    teacher: enrollment.teacherName,
    room: enrollment.room,
    building: enrollment.building,
    day: enrollment.day as DayKey,
    startMinutes: parseTime(enrollment.startTime),
    endMinutes: parseTime(enrollment.endTime),
    kind: mapScheduleType(enrollment.type)
  };
}

export const ApiService = {
  login(input: ApiLoginInput) {
    return apiFetch<ApiLoginResponse>("/auth/login", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(input)
    });
  },

  async fetchTerms(studentEmail: string) {
    const response = await apiFetch<{ terms: ApiTerm[] }>("/terms", {
      headers: headers(studentEmail)
    });

    return response.terms;
  },

  async fetchCourses(studentEmail: string) {
    const response = await apiFetch<{ courses: ApiCourse[]; ratings: ApiTeacherRating[] }>("/courses", {
      headers: headers(studentEmail)
    });

    return mapCourses(response.courses, response.ratings);
  },

  enroll(studentEmail: string, scheduleId: string, force = false) {
    return apiFetch<{ enrollments: ApiEnrollment[] }>("/enroll", {
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
    return apiFetch<{ friendship: ApiFriendship; alreadyExists?: boolean }>("/friends/request", {
      method: "POST",
      headers: headers(studentEmail),
      body: JSON.stringify({ email: friendEmail })
    });
  },

  async fetchFriends(studentEmail: string) {
    const response = await apiFetch<{ friendships: ApiFriendship[] }>("/friends", {
      headers: headers(studentEmail)
    });

    return response.friendships.map((friendship) => mapFriendship(friendship, studentEmail));
  },

  async fetchMySchedule(studentEmail: string, semesterKey: string) {
    const response = await apiFetch<{ schedule: ApiEnrollment[] }>(`/schedule/me?${scheduleQuery(semesterKey)}`, {
      headers: headers(studentEmail)
    });

    return response.schedule.map((enrollment) => mapEnrollment(enrollment));
  },

  async fetchStudentSchedule(studentEmail: string, studentId: string, semesterKey: string) {
    const response = await apiFetch<{ schedule: ApiEnrollment[] }>(
      `/schedule/${encodeURIComponent(studentId)}?${scheduleQuery(semesterKey)}`,
      {
        headers: headers(studentEmail)
      }
    );

    return response.schedule.map((enrollment) => mapEnrollment(enrollment, studentId));
  },

  async acceptFriend(studentEmail: string, friendshipId: string) {
    const response = await apiFetch<{ friendship: ApiFriendship }>("/friends/accept", {
      method: "POST",
      headers: headers(studentEmail),
      body: JSON.stringify({ friendshipId })
    });

    return mapFriendship(response.friendship, studentEmail);
  },

  async fetchCourseReviews(courseId: string) {
    const response = await apiFetch<{ reviews: ApiCourseReview[] }>(`/courses/${courseId}/reviews`);

    return response.reviews.map(mapCourseReview);
  },

  async submitCourseReview(studentEmail: string, courseId: string, rating: number, comment: string) {
    const response = await apiFetch<{ review: ApiCourseReview }>(`/courses/${courseId}/reviews`, {
      method: "POST",
      headers: headers(studentEmail),
      body: JSON.stringify({ rating, comment })
    });

    return mapCourseReview(response.review);
  },

  sendCommunityMessage(studentEmail: string, communityId: string, content: string) {
    return apiFetch(`/communities/${communityId}/messages`, {
      method: "POST",
      headers: headers(studentEmail),
      body: JSON.stringify({ content })
    });
  }
};
