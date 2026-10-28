// Turns database function results (snake_case) into the shapes the screens use.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { num, numOrNull } from './format';
import type {
  Account,
  AccessGroup,
  Activity,
  AdminChapter,
  AppNotification,
  CatalogCourse,
  ChapterDetail,
  ChapterRow,
  DashboardStats,
  EndingSoonRow,
  FocusArea,
  MockTest,
  QuestionCounts,
  QuestionRecord,
  QuestionRow,
  RecentResult,
  Resume,
  StudentDetail,
  StudentRow,
  TreeProgram,
} from './types';

type Row = Record<string, any>;
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);

export const mapCatalog = (r: Row): CatalogCourse => ({
  programId: r.program_id,
  programSlug: r.program_slug,
  programName: r.program_name,
  programShort: r.program_short,
  programPosition: num(r.program_position),
  courseId: r.course_id,
  code: r.course_code,
  name: r.course_name,
  fullName: r.full_name ?? null,
  kind: r.kind,
  coursePosition: num(r.course_position),
  examFormat: r.exam_format ?? null,
  enrolled: !!r.enrolled,
  validUntil: r.valid_until ?? null,
  daysLeft: numOrNull(r.days_left),
  chaptersTotal: num(r.chapters_total),
  chaptersDone: num(r.chapters_done),
  progress: num(r.progress_percent),
});

export const mapResume = (r: Row | null): Resume | null =>
  !r
    ? null
    : {
        courseId: r.course_id,
        courseLabel: r.course_label,
        chapterId: r.chapter_id,
        chapterPosition: num(r.chapter_position),
        chapterTitle: r.chapter_title,
        lastActivityAt: r.last_activity_at ?? null,
        videosTotal: num(r.videos_total),
        videosDone: num(r.videos_done),
        ebooksTotal: num(r.ebooks_total),
        ebooksDone: num(r.ebooks_done),
        testsTotal: num(r.tests_total),
        testsDone: num(r.tests_done),
        progress: num(r.progress_percent),
        nextVideo: r.next_video
          ? {
              id: r.next_video.id,
              title: r.next_video.title,
              position: num(r.next_video.position),
              durationSeconds: numOrNull(r.next_video.duration_seconds),
              resumeAt: num(r.next_video.resume_at),
            }
          : null,
      };

export const mapChapterRow = (r: Row): ChapterRow => ({
  id: r.chapter_id,
  position: num(r.chapter_position),
  title: r.title,
  videosTotal: num(r.videos_total),
  videosDone: num(r.videos_done),
  ebooksTotal: num(r.ebooks_total),
  ebooksDone: num(r.ebooks_done),
  testsTotal: num(r.tests_total),
  testsDone: num(r.tests_done),
  bestTest: numOrNull(r.best_test_percent),
  progress: num(r.progress_percent),
  complete: !!r.is_complete,
  recommended: !!r.is_recommended,
});

export const mapRecentResult = (r: Row): RecentResult => ({
  attemptId: r.attempt_id,
  testId: r.test_id,
  title: r.test_title,
  kind: r.test_kind,
  courseLabel: r.course_label,
  chapterId: r.chapter_id ?? null,
  submittedAt: r.submitted_at ?? null,
  percent: numOrNull(r.percent),
});

export const mapFocusArea = (r: Row): FocusArea => ({
  label: r.label,
  courseLabel: r.course_label,
  chapterLabel: r.chapter_label ?? null,
  percent: num(r.percent),
  answered: num(r.answered),
});

export const mapChapter = (r: Row): ChapterDetail => ({
  id: r.id,
  position: num(r.position),
  title: r.title,
  courseId: r.course_id,
  courseLabel: r.course_label,
  progress: num(r.progress_percent),
  videosTotal: num(r.videos_total),
  videosDone: num(r.videos_done),
  videos: arr(r.videos).map((v) => ({
    id: v.id,
    position: num(v.position),
    title: v.title,
    durationSeconds: numOrNull(v.duration_seconds),
    completed: !!v.completed,
    lastPosition: num(v.last_position_seconds),
    providerVideoId: v.provider_video_id ?? null,
  })),
  ebook: r.ebook
    ? {
        id: r.ebook.id,
        title: r.ebook.title,
        pageCount: numOrNull(r.ebook.page_count),
        storagePath: r.ebook.storage_path,
        lastPage: num(r.ebook.last_page, 1),
        completed: !!r.ebook.completed,
      }
    : null,
  test: r.test
    ? {
        id: r.test.id,
        title: r.test.title,
        durationMinutes: num(r.test.duration_minutes),
        questionCount: num(r.test.question_count),
        format: r.test.format ?? '',
        attempts: num(r.test.attempts),
        bestPercent: numOrNull(r.test.best_percent),
        inProgressAttemptId: r.test.in_progress_attempt_id ?? null,
        maxAttempts: numOrNull(r.test.max_attempts),
      }
    : null,
});

export const mapMockTest = (r: Row): MockTest => ({
  testId: r.test_id,
  courseId: r.course_id,
  courseLabel: r.course_label,
  courseShort: r.course_short_label,
  examFormat: r.exam_format ?? null,
  kind: r.kind,
  title: r.title,
  durationMinutes: num(r.duration_minutes),
  questionCount: num(r.question_count),
  attempts: num(r.attempts_count),
  lastPercent: numOrNull(r.last_percent),
  lastSubmittedAt: r.last_submitted_at ?? null,
  lastTimeSpent: numOrNull(r.last_time_spent_seconds),
  lastAttemptId: r.last_attempt_id ?? null,
  inProgressAttemptId: r.in_progress_attempt_id ?? null,
  practiceDone: num(r.practice_done),
  maxAttempts: numOrNull(r.max_attempts),
});

export const mapAccess = (a: Row): AccessGroup => ({
  program: a.program,
  courses: a.courses,
  validUntil: a.valid_until,
  daysLeft: num(a.days_left),
  status: a.status,
  enrollmentIds: Array.isArray(a.enrollment_ids) ? a.enrollment_ids : [],
});

export const mapAccount = (r: Row): Account => ({
  profile: {
    id: r.profile?.id,
    fullName: r.profile?.full_name ?? '',
    email: r.profile?.email ?? null,
    phone: r.profile?.phone ?? null,
    phoneVerified: !!r.profile?.phone_verified,
    role: r.profile?.role ?? 'student',
    createdAt: r.profile?.created_at,
    targetExamDate: r.profile?.target_exam_date ?? null,
    targetCourseId: r.profile?.target_course_id ?? null,
    targetCourseLabel: r.profile?.target_course_label ?? null,
    isBlocked: !!r.profile?.is_blocked,
  },
  access: arr(r.access).map(mapAccess),
  devices: arr(r.devices).map((d) => ({
    id: d.id,
    deviceId: d.device_id,
    deviceName: d.device_name ?? null,
    platform: d.platform ?? null,
    lastActiveAt: d.last_active_at,
  })),
  maxDevices: num(r.max_devices, 2),
  payments: arr(r.payments).map((p) => ({
    id: p.id,
    packageName: p.package_name,
    amountInr: numOrNull(p.amount_inr),
    paidAt: p.paid_at ?? null,
    invoiceNumber: p.invoice_number ?? null,
  })),
});

export const mapNotification = (r: Row): AppNotification => ({
  id: r.id,
  title: r.title,
  body: r.body ?? null,
  link: r.link ?? null,
  createdAt: r.created_at,
  readAt: r.read_at ?? null,
});

// ---------- Admin ----------
export const mapDashboard = (r: Row): DashboardStats => ({
  activeStudents: num(r.active_students),
  newEnrollmentsThisMonth: num(r.new_enrollments_this_month),
  newEnrollmentsByProgram: arr(r.new_enrollments_by_program).map((x) => ({ program: x.program, count: num(x.count) })),
  revenueThisMonthInr: numOrNull(r.revenue_this_month_inr),
  endingSoon: num(r.ending_in_15_days),
  enrollmentsByCourse: arr(r.enrollments_by_course).map((x) => ({
    courseId: x.course_id,
    program: x.program,
    course: x.course,
    active: num(x.active),
  })),
  videosReady: num(r.videos_ready),
  videosProcessing: num(r.videos_processing),
  ebooks: num(r.ebooks),
  questionsByType: Object.fromEntries(Object.entries(r.questions_by_type ?? {}).map(([k, v]) => [k, num(v)])),
  questionsInReview: num(r.questions_in_review),
  openDoubts: num(r.open_doubts),
});

export const mapActivity = (r: Row): Activity => ({
  id: num(r.id),
  action: r.action,
  createdAt: r.created_at,
  actorName: r.actor_name ?? null,
  actorRole: r.actor_role ?? null,
  subjectName: r.subject_name ?? null,
  title: r.title ?? null,
  code: r.code ?? null,
  courseLabel: r.course_label ?? null,
  chapterLabel: r.chapter_label ?? null,
  details: r.details ?? {},
});

export const mapEndingSoon = (r: Row): EndingSoonRow => ({
  userId: r.user_id,
  fullName: r.full_name,
  phone: r.phone ?? null,
  program: r.program,
  validUntil: r.valid_until,
  totalCount: num(r.total_count),
});

export const mapTree = (r: Row[]): TreeProgram[] =>
  arr(r).map((p) => ({
    id: p.id,
    name: p.name,
    shortName: p.short_name ?? null,
    slug: p.slug,
    courses: arr(p.courses).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      fullName: c.full_name ?? null,
      kind: c.kind,
      isPublished: !!c.is_published,
      chapters: arr(c.chapters).map((ch) => ({
        id: ch.id,
        position: num(ch.position),
        title: ch.title,
        isPublished: !!ch.is_published,
        videosTotal: num(ch.videos_total),
        videosProcessing: num(ch.videos_processing),
      })),
    })),
  }));

export const mapAdminChapter = (r: Row): AdminChapter => ({
  id: r.id,
  courseId: r.course_id,
  position: num(r.position),
  title: r.title,
  description: r.description ?? null,
  isPublished: !!r.is_published,
  courseLabel: r.course_label,
  videos: arr(r.videos).map((v) => ({
    id: v.id,
    position: num(v.position),
    title: v.title,
    durationSeconds: numOrNull(v.duration_seconds),
    status: v.status,
    processingPercent: num(v.processing_percent),
    isPublished: !!v.is_published,
    thumbnailUrl: v.thumbnail_url ?? null,
  })),
  ebook: r.ebook
    ? {
        id: r.ebook.id,
        title: r.ebook.title,
        storagePath: r.ebook.storage_path,
        pageCount: numOrNull(r.ebook.page_count),
        fileSizeBytes: numOrNull(r.ebook.file_size_bytes),
        blockDownload: !!r.ebook.block_download,
        watermark: !!r.ebook.watermark,
        allowAnnotations: !!r.ebook.allow_annotations,
        isPublished: !!r.ebook.is_published,
        createdAt: r.ebook.created_at,
      }
    : null,
  test: r.test
    ? {
        id: r.test.id,
        title: r.test.title,
        durationMinutes: num(r.test.duration_minutes),
        maxAttempts: numOrNull(r.test.max_attempts),
        selectionMode: r.test.selection_mode,
        randomConfig: r.test.random_config ?? {},
        showAnswersAfterSubmit: !!r.test.show_answers_after_submit,
        status: r.test.status,
        questionCount: num(r.test.question_count),
        description: r.test.description ?? null,
      }
    : null,
});

export const mapQuestionCounts = (r: Row): QuestionCounts => ({
  all: num(r.all),
  mcq: num(r.mcq),
  tbs: num(r.tbs),
  cbq: num(r.cbq),
  inReview: num(r.in_review),
});

export const mapQuestionRow = (r: Row): QuestionRow => ({
  id: r.id,
  code: r.code,
  stem: r.stem,
  type: r.type,
  difficulty: r.difficulty,
  status: r.status,
  topic: r.topic ?? null,
  courseLabel: r.course_label,
  chapterLabel: r.chapter_label ?? null,
  percentCorrect: numOrNull(r.percent_correct),
  timesAnswered: num(r.times_answered),
  totalCount: num(r.total_count),
});

export const mapQuestionRecord = (r: Row): QuestionRecord => ({
  id: r.id,
  code: r.code ?? null,
  courseId: r.course_id,
  chapterId: r.chapter_id ?? null,
  type: r.type,
  difficulty: r.difficulty,
  topic: r.topic ?? '',
  stem: r.stem ?? '',
  content: r.content ?? {},
  points: num(r.points, 1),
  partialCredit: r.partial_credit !== false,
  timeGuideMinutes: numOrNull(r.time_guide_minutes),
  status: r.status,
  reviewerId: r.reviewer_id ?? null,
  answerKey: r.answer_key ?? null,
  explanation: r.explanation ?? '',
  exhibits: arr(r.exhibits).map((e) => ({
    id: e.id,
    title: e.title,
    storagePath: e.storage_path ?? null,
    description: e.description ?? null,
  })),
  testIds: Array.isArray(r.test_ids) ? r.test_ids : [],
});

/** Shape admin_save_question() expects */
export const questionPayload = (q: QuestionRecord) => ({
  id: q.id,
  course_id: q.courseId,
  chapter_id: q.chapterId,
  type: q.type,
  difficulty: q.difficulty,
  topic: q.topic,
  stem: q.stem,
  content: q.content,
  points: q.points,
  partial_credit: q.partialCredit,
  time_guide_minutes: q.timeGuideMinutes,
  status: q.status,
  reviewer_id: q.reviewerId,
  answer_key: q.answerKey,
  explanation: q.explanation,
  test_ids: q.testIds,
});

export const mapStudentRow = (r: Row): StudentRow => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email ?? null,
  phone: r.phone ?? null,
  courses: r.courses ?? null,
  validUntil: r.valid_until ?? null,
  status: r.status,
  progress: num(r.progress_percent),
  lastActiveAt: r.last_active_at ?? null,
  createdAt: r.created_at,
  isBlocked: !!r.is_blocked,
  totalCount: num(r.total_count),
});

export const mapStudent = (r: Row): StudentDetail => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email ?? null,
  phone: r.phone ?? null,
  createdAt: r.created_at,
  isBlocked: !!r.is_blocked,
  access: arr(r.access).map(mapAccess),
  devicesInUse: num(r.devices_in_use),
  maxDevices: num(r.max_devices, 2),
  blockedAttemptsToday: num(r.blocked_attempts_today),
});
