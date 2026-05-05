import type { Community, CommunityMember, CommunityType, Course, Student } from "@/types";

interface StudentIdentityInput {
  id: string;
  email: string;
  name: string;
  program: string;
  year?: string;
  classGroup: string;
  enrolledCourseIds: string[];
  isOnline?: boolean;
}

interface AssignmentResult {
  communities: Community[];
  members: CommunityMember[];
}

const schoolDomains: Record<string, string[]> = {
  MUIS: ["stud.num.edu.mn", "num.edu.mn"],
  UFE: ["ufe.edu.mn"],
  MULS: ["muls.edu.mn"],
  HUM: ["humanities.mn"],
  ETUGEN: ["etugen.edu.mn"]
};

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const unique = <T>(items: T[]) => Array.from(new Set(items));

function communityId(type: CommunityType, referenceId: string, school?: string) {
  return `community-${type}-${school ? `${normalize(school)}-` : ""}${normalize(referenceId)}`;
}

function detectSchoolFromEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const school = Object.entries(schoolDomains).find(([, domains]) =>
    domains.some((knownDomain) => domain === knownDomain || domain.endsWith(`.${knownDomain}`))
  );

  return school?.[0] ?? "Тодорхойгүй сургууль";
}

function ensureCommunity(
  communities: Map<string, Community>,
  type: CommunityType,
  name: string,
  referenceId: string,
  school?: string
) {
  const id = communityId(type, referenceId, school);
  const existingCommunity = communities.get(id);

  if (existingCommunity) return existingCommunity;

  const community: Community = {
    id,
    name,
    type,
    reference_id: referenceId,
    school,
    memberCount: 0
  };

  communities.set(id, community);
  return community;
}

function addMember(members: Map<string, CommunityMember>, communityIdValue: string, studentId: string) {
  const key = `${communityIdValue}:${studentId}`;

  if (members.has(key)) return;

  members.set(key, {
    community_id: communityIdValue,
    student_id: studentId
  });
}

function withMemberCounts(communities: Community[], members: CommunityMember[]) {
  return communities.map((community) => ({
    ...community,
    memberCount: members.filter((member) => member.community_id === community.id).length
  }));
}

function getStudentCommunityIds(studentId: string, members: CommunityMember[]) {
  return new Set(
    members
      .filter((member) => member.student_id === studentId)
      .map((member) => member.community_id)
  );
}

export const CommunityService = {
  detectSchoolFromEmail,

  detectStudentIdentity(input: StudentIdentityInput): Student {
    return {
      id: input.id,
      email: input.email,
      name: input.name,
      school: detectSchoolFromEmail(input.email),
      program: input.program,
      year: input.year ?? "2-р курс",
      class_group: input.classGroup,
      enrolledCourseIds: unique(input.enrolledCourseIds),
      isOnline: input.isOnline ?? true
    };
  },

  buildCommunities(students: Student[], courses: Course[]): AssignmentResult {
    const communities = new Map<string, Community>();
    const members = new Map<string, CommunityMember>();
    const courseById = new Map<string, Course>();

    courses.forEach((course) => {
      courseById.set(course.id, course);
      if (course.communityCourseId) {
        courseById.set(course.communityCourseId, course);
      }
    });

    students.forEach((student) => {
      const schoolCommunity = ensureCommunity(
        communities,
        "school",
        `${student.school} оюутнууд`,
        student.school,
        student.school
      );
      addMember(members, schoolCommunity.id, student.id);

      const className = student.program
        ? `${student.program} - ${student.class_group}`
        : student.class_group;
      const classCommunity = ensureCommunity(communities, "class", className, student.class_group, student.school);
      addMember(members, classCommunity.id, student.id);

      unique(student.enrolledCourseIds).forEach((courseId) => {
        const course = courseById.get(courseId);
        if (!course) return;

        const referenceId = course.communityCourseId ?? course.id;
        const courseCommunity = ensureCommunity(communities, "course", course.name, referenceId, student.school);
        addMember(members, courseCommunity.id, student.id);
      });
    });

    const memberList = Array.from(members.values());

    return {
      communities: withMemberCounts(Array.from(communities.values()), memberList),
      members: memberList
    };
  },

  groupCommunities(communities: Community[]) {
    return {
      school: communities.filter((community) => community.type === "school"),
      class: communities.filter((community) => community.type === "class"),
      course: communities.filter((community) => community.type === "course")
    };
  },

  getVisibleCommunities(student: Student, communities: Community[], members: CommunityMember[]) {
    const communityIds = getStudentCommunityIds(student.id, members);

    return communities.filter(
      (community) => communityIds.has(community.id) && (!community.school || community.school === student.school)
    );
  },

  canAccessCommunity(communityIdValue: string, student: Student, communities: Community[], members: CommunityMember[]) {
    const community = communities.find((item) => item.id === communityIdValue);
    if (!community || (community.school && community.school !== student.school)) return false;

    return members.some(
      (member) => member.community_id === communityIdValue && member.student_id === student.id
    );
  },

  getCommunityMembers(communityIdValue: string, members: CommunityMember[], students: Student[]) {
    const memberIds = new Set(
      members
        .filter((member) => member.community_id === communityIdValue)
        .map((member) => member.student_id)
    );

    return students.filter((student) => memberIds.has(student.id));
  }
};
