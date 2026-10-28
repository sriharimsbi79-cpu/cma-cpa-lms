export type Role = 'student' | 'faculty' | 'admin' | 'super_admin';
export type CourseKind = 'cma_part' | 'cpa_core' | 'cpa_discipline' | 'skill';
export type TestKind = 'chapter_test' | 'full_mock' | 'practice_set';
export type PublishStatus = 'draft' | 'in_review' | 'published' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AccessStatus = 'active' | 'ending' | 'expired';
export type QuestionType =
  | 'mcq'
  | 'tbs_journal_entry'
  | 'tbs_numeric'
  | 'tbs_dropdown'
  | 'tbs_drag_drop'
  | 'tbs_research'
  | 'tbs_document_review'
  | 'cbq';

export const isStaffRole = (r?: Role | null) => r === 'faculty' || r === 'admin' || r === 'super_admin';
export const isAdminRole = (r?: Role | null) => r === 'admin' || r === 'super_admin';

// ---------- Student ----------
export interface CatalogCourse {
  programId: string;
  programSlug: string;
  programName: string;
  programShort: string;
  programPosition: number;
  courseId: string;
  code: string;
  name: string;
  fullName: string | null;
  kind: CourseKind;
  coursePosition: number;
  examFormat: string | null;
  enrolled: boolean;
  validUntil: string | null;
  daysLeft: number | null;
  chaptersTotal: number;
  chaptersDone: number;
  progress: number;
}

export interface Resume {
  courseId: string;
  courseLabel: string;
  chapterId: string;
  chapterPosition: number;
  chapterTitle: string;
  lastActivityAt: string | null;
  videosTotal: number;
  videosDone: number;
  ebooksTotal: number;
  ebooksDone: number;
  testsTotal: number;
  testsDone: number;
  progress: number;
  nextVideo: { id: string; title: string; position: number; durationSeconds: number | null; resumeAt: number } | null;
}

export interface ChapterRow {
  id: string;
  position: number;
  title: string;
  videosTotal: number;
  videosDone: number;
  ebooksTotal: number;
  ebooksDone: number;
  testsTotal: number;
  testsDone: number;
  bestTest: number | null;
  progress: number;
  complete: boolean;
  recommended: boolean;
}

export interface RecentResult {
  attemptId: string;
  testId: string;
  title: string;
  kind: TestKind;
  courseLabel: string;
  chapterId: string | null;
  submittedAt: string | null;
  percent: number | null;
}

export interface FocusArea {
  label: string;
  courseLabel: string;
  chapterLabel: string | null;
  percent: number;
  answered: number;
}

export interface VideoItem {
  id: string;
  position: number;
  title: string;
  durationSeconds: number | null;
  completed: boolean;
  lastPosition: number;
  providerVideoId: string | null;
}

export interface EbookItem {
  id: string;
  title: string;
  pageCount: number | null;
  storagePath: string;
  lastPage: number;
  completed: boolean;
}

export interface ChapterTest {
  id: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  format: string;
  attempts: number;
  bestPercent: number | null;
  inProgressAttemptId: string | null;
  maxAttempts: number | null;
}

export interface ChapterDetail {
  id: string;
  position: number;
  title: string;
  courseId: string;
  courseLabel: string;
  progress: number;
  videosTotal: number;
  videosDone: number;
  videos: VideoItem[];
  ebook: EbookItem | null;
  test: ChapterTest | null;
}

export interface MockTest {
  testId: string;
  courseId: string;
  courseLabel: string;
  courseShort: string;
  examFormat: string | null;
  kind: TestKind;
  title: string;
  durationMinutes: number;
  questionCount: number;
  attempts: number;
  lastPercent: number | null;
  lastSubmittedAt: string | null;
  lastTimeSpent: number | null;
  lastAttemptId: string | null;
  inProgressAttemptId: string | null;
  practiceDone: number;
  maxAttempts: number | null;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  role: Role;
  createdAt: string;
  targetExamDate: string | null;
  targetCourseId: string | null;
  targetCourseLabel: string | null;
  isBlocked: boolean;
}

export interface AccessGroup {
  program: string;
  courses: string;
  validUntil: string;
  daysLeft: number;
  status: AccessStatus;
  enrollmentIds: string[];
}

export interface Device {
  id: string;
  deviceId: string;
  deviceName: string | null;
  platform: string | null;
  lastActiveAt: string;
}

export interface Payment {
  id: string;
  packageName: string;
  amountInr: number | null;
  paidAt: string | null;
  invoiceNumber: string | null;
}

export interface Account {
  profile: Profile;
  access: AccessGroup[];
  devices: Device[];
  maxDevices: number;
  payments: Payment[];
}

export interface TestInfo {
  id: string;
  title: string;
  kind: TestKind;
  courseId: string;
  courseLabel: string;
  chapterId: string | null;
  durationMinutes: number;
  description: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

// ---------- Admin ----------
export interface DashboardStats {
  activeStudents: number;
  newEnrollmentsThisMonth: number;
  newEnrollmentsByProgram: { program: string; count: number }[];
  revenueThisMonthInr: number | null;
  endingSoon: number;
  enrollmentsByCourse: { courseId: string; program: string; course: string; active: number }[];
  videosReady: number;
  videosProcessing: number;
  ebooks: number;
  questionsByType: Record<string, number>;
  questionsInReview: number;
  openDoubts: number;
}

export interface Activity {
  id: number;
  action: string;
  createdAt: string;
  actorName: string | null;
  actorRole: Role | null;
  subjectName: string | null;
  title: string | null;
  code: string | null;
  courseLabel: string | null;
  chapterLabel: string | null;
  details: Record<string, unknown>;
}

export interface EndingSoonRow {
  userId: string;
  fullName: string;
  phone: string | null;
  program: string;
  validUntil: string;
  totalCount: number;
}

export interface TreeChapter {
  id: string;
  position: number;
  title: string;
  isPublished: boolean;
  videosTotal: number;
  videosProcessing: number;
}
export interface TreeCourse {
  id: string;
  code: string;
  name: string;
  fullName: string | null;
  kind: CourseKind;
  isPublished: boolean;
  chapters: TreeChapter[];
}
export interface TreeProgram {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  courses: TreeCourse[];
}

export interface AdminVideo {
  id: string;
  position: number;
  title: string;
  durationSeconds: number | null;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  processingPercent: number;
  isPublished: boolean;
  thumbnailUrl: string | null;
}

export interface AdminEbook {
  id: string;
  title: string;
  storagePath: string;
  pageCount: number | null;
  fileSizeBytes: number | null;
  blockDownload: boolean;
  watermark: boolean;
  allowAnnotations: boolean;
  isPublished: boolean;
  createdAt: string;
}

export interface AdminTestSettings {
  id: string;
  title: string;
  durationMinutes: number;
  maxAttempts: number | null;
  selectionMode: 'fixed' | 'random';
  randomConfig: { counts?: Record<string, number>; chapter_ids?: string[] };
  showAnswersAfterSubmit: boolean;
  status: PublishStatus;
  questionCount: number;
  description: string | null;
}

export interface AdminChapter {
  id: string;
  courseId: string;
  position: number;
  title: string;
  description: string | null;
  isPublished: boolean;
  courseLabel: string;
  videos: AdminVideo[];
  ebook: AdminEbook | null;
  test: AdminTestSettings | null;
}

export interface QuestionCounts {
  all: number;
  mcq: number;
  tbs: number;
  cbq: number;
  inReview: number;
}

export interface QuestionRow {
  id: string;
  code: string;
  stem: string;
  type: QuestionType;
  difficulty: Difficulty;
  status: PublishStatus;
  topic: string | null;
  courseLabel: string;
  chapterLabel: string | null;
  percentCorrect: number | null;
  timesAnswered: number;
  totalCount: number;
}

export interface QuestionFilters {
  type: 'all' | 'mcq' | 'tbs' | 'cbq';
  courseId: string;
  chapterId: string;
  difficulty: '' | Difficulty;
  status: '' | PublishStatus;
  search: string;
  page: number;
}

export interface QuestionRecord {
  id: string | null;
  code: string | null;
  courseId: string;
  chapterId: string | null;
  type: QuestionType;
  difficulty: Difficulty;
  topic: string;
  stem: string;
  content: Record<string, unknown>;
  points: number;
  partialCredit: boolean;
  timeGuideMinutes: number | null;
  status: PublishStatus;
  reviewerId: string | null;
  answerKey: Record<string, unknown> | null;
  explanation: string;
  exhibits: { id: string; title: string; storagePath: string | null; description: string | null }[];
  testIds: string[];
}

export interface StudentRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  courses: string | null;
  validUntil: string | null;
  status: AccessStatus | 'none';
  progress: number;
  lastActiveAt: string | null;
  createdAt: string;
  isBlocked: boolean;
  totalCount: number;
}

export interface StudentDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  isBlocked: boolean;
  access: AccessGroup[];
  devicesInUse: number;
  maxDevices: number;
  blockedAttemptsToday: number;
}

export interface SimpleTest {
  id: string;
  title: string;
  kind: TestKind;
  chapterId: string | null;
}

export interface StaffMember {
  id: string;
  fullName: string;
  role: Role;
}
