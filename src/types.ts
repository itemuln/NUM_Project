export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type CourseKind = "lecture" | "seminar";

export type ScheduleOwner = "me" | "friend";

export type CommunityType = "school" | "class" | "course";

export type SearchResultType = "course" | "community" | "user";

export type AppPage = "dashboard" | "courses" | "communities" | "friends" | "benefits" | "news";

export type ThemeMode = "dark" | "light";

export type RightContextType = "community" | "friend" | "course";

export interface DayDefinition {
  key: DayKey;
  label: string;
  shortLabel: string;
  mongolianLabel: string;
}

export interface Course {
  id: string;
  sourceScheduleId?: string;
  communityCourseId?: string;
  code: string;
  name: string;
  teacher: string;
  rating: number;
  reviewCount: number;
  kind: CourseKind;
  room: string;
  credits: number;
  preferredDuration: number;
  department: string;
  year?: string;
  semester?: string;
  day?: DayKey;
  startMinutes?: number;
  endMinutes?: number;
  capacity?: number;
  enrolledCount?: number;
  building?: string;
}

export interface School {
  id: string;
  name: string;
  domains: string[];
}

export interface Student {
  id: string;
  name: string;
  email: string;
  school: string;
  program: string;
  year: string;
  class_group: string;
  enrolledCourseIds: string[];
  isOnline: boolean;
}

export interface Community {
  id: string;
  name: string;
  type: CommunityType;
  reference_id?: string;
  memberCount: number;
}

export interface CommunityMember {
  community_id: string;
  student_id: string;
}

export interface ScheduleItem {
  id: string;
  courseId: string;
  sourceScheduleId?: string;
  communityCourseId?: string;
  courseName: string;
  teacher: string;
  room: string;
  day: DayKey;
  startMinutes: number;
  endMinutes: number;
  kind: CourseKind;
}

export interface Friend {
  id: string;
  studentId?: string;
  name: string;
  email: string;
  group: string;
  accent: string;
  schedule: ScheduleItem[];
}

export interface Group {
  id: string;
  name: string;
  memberCount: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  body: string;
  sentAt: string;
}

export interface CommunityChatMessage {
  id: string;
  sender_id: string;
  community_id: string;
  content: string;
  created_at: string;
}

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  referenceId: string;
}

export interface SchoolEvent {
  id: string;
  school: string;
  title: string;
  date: string;
  location: string;
}

export type NewsFeedCategory = "event" | "news" | "announcement" | "hackathon" | "olympiad";

export interface NewsFeedItem {
  id: string;
  title: string;
  summary: string;
  category: NewsFeedCategory;
  source: string;
  url: string;
  publishedAt: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  organizer?: string;
  imageUrl?: string;
}

export interface BoardPost {
  id: string;
  community_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface MarketplaceItem {
  id: string;
  seller_id: string;
  anonymousSeller: string;
  title: string;
  price: string;
  condition: string;
  location: string;
  description: string;
  created_at: string;
}

export type BuyRequestStatus = "sent" | "accepted" | "declined";

export interface BuyRequest {
  id: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  message: string;
  status: BuyRequestStatus;
  created_at: string;
}

export interface AppDatabaseSnapshot {
  currentStudent: Student;
  students: Student[];
  currentUserSchedule: ScheduleItem[];
  friends: Friend[];
  selectedFriendId: string | null;
  selectedCommunityId: string | null;
  comparisonMode: boolean;
  communityMessages: Record<string, CommunityChatMessage[]>;
  selectedSemester: string;
  activePage?: AppPage;
  selectedCourseId?: string | null;
  isOnboarded?: boolean;
  boardPosts?: BoardPost[];
  theme?: ThemeMode;
  marketplaceItems?: MarketplaceItem[];
  buyRequests?: BuyRequest[];
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
  rightPanelWidth?: number;
}
