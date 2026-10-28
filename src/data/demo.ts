// Sample data used when no Supabase keys are set (demo mode).
// Mirrors the screens in the design canvas. Dates are relative to today.
import { addDays } from '@/lib/format';
import type {
  Account,
  Activity,
  AdminChapter,
  AdminVideo,
  AppNotification,
  CatalogCourse,
  ChapterDetail,
  ChapterRow,
  CourseKind,
  DashboardStats,
  EndingSoonRow,
  FocusArea,
  MockTest,
  QuestionCounts,
  QuestionRecord,
  QuestionRow,
  RecentResult,
  Resume,
  SimpleTest,
  StaffMember,
  StudentDetail,
  StudentRow,
  TreeProgram,
  VideoItem,
} from '@/lib/types';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const todayAt = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

// ---------- Catalog ----------
interface DemoCourse {
  slug: string;
  program: 'cma' | 'cpa' | 'skills';
  code: string;
  name: string;
  fullName: string;
  kind: CourseKind;
  examFormat: string | null;
  days: number | null; // access days left, null = not enrolled
  chapters: string[];
  done: number; // complete chapters
  progress: number;
  /** chapter (1-based) the student is in the middle of */
  current?: { position: number; videosDone: number };
}

const PROGRAMS = {
  cma: { id: 'cma-usa', slug: 'cma-usa', name: 'CMA USA', short: 'CMA', position: 1 },
  cpa: { id: 'cpa-usa', slug: 'cpa-usa', name: 'CPA USA', short: 'CPA', position: 2 },
  skills: { id: 'technical-skills', slug: 'technical-skills', name: 'Technical skills', short: 'Skills', position: 3 },
};

const CMA_FORMAT = '100 MCQs + 2 case-based questions · 4 hours';

const COURSES: DemoCourse[] = [
  {
    slug: 'cma-part-1', program: 'cma', code: 'P1', name: 'Part 1', kind: 'cma_part', examFormat: CMA_FORMAT,
    fullName: 'Financial Planning, Performance and Analytics', days: 227, done: 2, progress: 48,
    chapters: ['External Financial Reporting Decisions', 'Planning, Budgeting and Forecasting', 'Performance Management', 'Cost Management', 'Internal Controls', 'Technology and Analytics'],
    current: { position: 3, videosDone: 6 },
  },
  {
    slug: 'cma-part-2', program: 'cma', code: 'P2', name: 'Part 2', kind: 'cma_part', examFormat: CMA_FORMAT,
    fullName: 'Strategic Financial Management', days: 227, done: 0, progress: 12,
    chapters: ['Financial Statement Analysis', 'Corporate Finance', 'Decision Analysis', 'Risk Management', 'Investment Decisions', 'Professional Ethics'],
    current: { position: 1, videosDone: 5 },
  },
  {
    slug: 'cpa-far', program: 'cpa', code: 'FAR', name: 'FAR', kind: 'cpa_core', examFormat: '50 MCQs + 7 TBS · 4 hours, 5 testlets',
    fullName: 'Financial Accounting and Reporting', days: 12, done: 4, progress: 30,
    chapters: ['Conceptual Framework and Standard Setting', 'Financial Statements', 'Cash and Receivables', 'Revenue Recognition', 'Inventory', 'Property, Plant and Equipment', 'Intangible Assets', 'Bonds and Long-term Debt', 'Leases', 'Equity', 'Income Taxes', 'Governmental Accounting', 'Not-for-Profit Accounting'],
    current: { position: 5, videosDone: 2 },
  },
  {
    slug: 'cpa-aud', program: 'cpa', code: 'AUD', name: 'AUD', kind: 'cpa_core', examFormat: '78 MCQs + 7 TBS · 4 hours, 5 testlets',
    fullName: 'Auditing and Attestation', days: 12, done: 0, progress: 0,
    chapters: ['Ethics and Independence', 'Engagement Acceptance', 'Understanding the Entity', 'Risk Assessment', 'Internal Control', 'Audit Evidence', 'Audit Sampling', 'Forming Conclusions', 'Audit Reports', 'Other Engagements'],
  },
  {
    slug: 'cpa-reg', program: 'cpa', code: 'REG', name: 'REG', kind: 'cpa_core', examFormat: '72 MCQs + 8 TBS · 4 hours, 5 testlets',
    fullName: 'Taxation and Regulation', days: 12, done: 0, progress: 0,
    chapters: ['Ethics and Professional Responsibility', 'Business Law', 'Federal Tax Procedures', 'Individual Tax: Income', 'Individual Tax: Deductions and Credits', 'Property Transactions', 'C Corporations', 'S Corporations', 'Partnerships', 'Trusts and Estates'],
  },
  {
    slug: 'cpa-bar', program: 'cpa', code: 'BAR', name: 'BAR', kind: 'cpa_discipline', examFormat: '50 MCQs + 7 TBS · 4 hours, 5 testlets',
    fullName: 'Business Analysis and Reporting', days: 12, done: 0, progress: 0,
    chapters: ['Financial Statement Analysis', 'Cost Accounting', 'Budgeting and Forecasting', 'Business Combinations', 'Derivatives and Hedging', 'Leases for Lessors', 'Advanced Revenue Recognition', 'Governmental Reporting'],
  },
  {
    slug: 'cpa-isc', program: 'cpa', code: 'ISC', name: 'ISC', kind: 'cpa_discipline', examFormat: '82 MCQs + 6 TBS · 4 hours, 5 testlets',
    fullName: 'Information Systems and Controls', days: null, done: 0, progress: 0,
    chapters: ['Information Systems', 'Data Management', 'Security and Privacy', 'SOC Engagements', 'IT General Controls', 'Business Resilience'],
  },
  {
    slug: 'cpa-tcp', program: 'cpa', code: 'TCP', name: 'TCP', kind: 'cpa_discipline', examFormat: '68 MCQs + 7 TBS · 4 hours, 5 testlets',
    fullName: 'Tax Compliance and Planning', days: null, done: 0, progress: 0,
    chapters: ['Individual Tax Planning', 'Entity Tax Planning', 'Property Transactions', 'Gift Tax', 'Personal Financial Planning'],
  },
  {
    slug: 'advanced-excel', program: 'skills', code: 'EXCEL', name: 'Advanced Excel', kind: 'skill', examFormat: null,
    fullName: 'Advanced Excel for finance', days: 245, done: 8, progress: 80,
    chapters: ['Excel essentials', 'Formulas and functions', 'Lookup functions', 'Cleaning data', 'PivotTables', 'Charts', 'Financial functions', 'What-if analysis', 'Power Query', 'Dashboards'],
    current: { position: 9, videosDone: 1 },
  },
  {
    slug: 'power-bi', program: 'skills', code: 'PBI', name: 'Power BI', kind: 'skill', examFormat: null,
    fullName: 'Power BI dashboards', days: null, done: 0, progress: 0,
    chapters: ['Getting started', 'Loading data', 'Data modelling', 'DAX basics', 'Visuals', 'Publishing'],
  },
];

const VIDEO_COUNTS = [9, 10, 8, 9, 7, 9, 8, 9, 10, 8, 9, 7, 8];

export function catalog(): CatalogCourse[] {
  return COURSES.map((c, i) => {
    const p = PROGRAMS[c.program];
    return {
      programId: p.id,
      programSlug: p.slug,
      programName: p.name,
      programShort: p.short,
      programPosition: p.position,
      courseId: c.slug,
      code: c.code,
      name: c.name,
      fullName: c.fullName,
      kind: c.kind,
      coursePosition: i,
      examFormat: c.examFormat,
      enrolled: c.days !== null,
      validUntil: c.days === null ? null : addDays(c.days),
      daysLeft: c.days,
      chaptersTotal: c.chapters.length,
      chaptersDone: c.done,
      progress: c.progress,
    };
  });
}

export function courseLabel(slug: string): string {
  const c = COURSES.find((x) => x.slug === slug);
  if (!c) return '';
  return c.kind === 'skill' ? c.name : `${PROGRAMS[c.program].name} · ${c.name}`;
}

export function courseShort(slug: string): string {
  const c = COURSES.find((x) => x.slug === slug);
  if (!c) return '';
  return c.kind === 'skill' ? c.name : `${PROGRAMS[c.program].short} ${c.name}`;
}

const TEST_SCORES: Record<string, number> = { 'cma-part-1-ch1': 78, 'cma-part-1-ch2': 80, 'cpa-far-ch1': 74, 'cpa-far-ch2': 69, 'cpa-far-ch3': 71, 'cpa-far-ch4': 63 };

export function courseChapters(courseId: string): ChapterRow[] {
  const c = COURSES.find((x) => x.slug === courseId);
  if (!c) return [];
  return c.chapters.map((title, i) => {
    const position = i + 1;
    const id = `${c.slug}-ch${position}`;
    const videosTotal = VIDEO_COUNTS[i % VIDEO_COUNTS.length];
    const complete = position <= c.done;
    const current = c.current?.position === position;
    const videosDone = complete ? videosTotal : current ? c.current!.videosDone : 0;
    const itemsTotal = videosTotal + 2;
    const itemsDone = videosDone + (complete ? 2 : 0);
    return {
      id,
      position,
      title,
      videosTotal,
      videosDone,
      ebooksTotal: 1,
      ebooksDone: complete ? 1 : 0,
      testsTotal: 1,
      testsDone: complete ? 1 : 0,
      bestTest: complete ? TEST_SCORES[id] ?? 75 : null,
      progress: Math.round((100 * itemsDone) / itemsTotal),
      complete,
      recommended: false,
    };
  }).map((row, _i, rows) => {
    const firstOpen = rows.find((r) => !r.complete);
    return { ...row, recommended: firstOpen?.id === row.id };
  });
}

const CH3_VIDEOS: [string, number][] = [
  ['3.1 Cost and variance measures', 750],
  ['3.2 Static and flexible budgets', 910],
  ['3.3 Direct material variances', 1085],
  ['3.4 Direct labor variances', 860],
  ['3.5 Overhead variances', 1200],
  ['3.6 Sales variances', 825],
  ['3.7 Responsibility centers', 964],
  ['3.8 Performance measures and balanced scorecard', 1140],
];

export function chapter(chapterId: string): ChapterDetail | null {
  const m = chapterId.match(/^(.*)-ch(\d+)$/);
  if (!m) return null;
  const [, courseId, posText] = m;
  const row = courseChapters(courseId).find((r) => r.position === Number(posText));
  if (!row) return null;
  const isCh3 = chapterId === 'cma-part-1-ch3';
  const videos: VideoItem[] = isCh3
    ? CH3_VIDEOS.map(([title, dur], i) => ({
        id: `${chapterId}-v${i + 1}`,
        position: i + 1,
        title,
        durationSeconds: dur,
        completed: i < 6,
        lastPosition: i === 6 ? 372 : 0,
        providerVideoId: null,
      }))
    : Array.from({ length: row.videosTotal }, (_, i) => ({
        id: `${chapterId}-v${i + 1}`,
        position: i + 1,
        title: `${row.position}.${i + 1} ${i === 0 ? 'Introduction' : `Lesson ${i + 1}`}`,
        durationSeconds: 600 + ((i * 137) % 600),
        completed: i < row.videosDone,
        lastPosition: 0,
        providerVideoId: null,
      }));
  const c = COURSES.find((x) => x.slug === courseId)!;
  const isCma = c.program === 'cma';
  return {
    id: chapterId,
    position: row.position,
    title: row.title,
    courseId,
    courseLabel: courseLabel(courseId),
    progress: row.progress,
    videosTotal: row.videosTotal,
    videosDone: row.videosDone,
    videos,
    ebook: {
      id: `${chapterId}-ebook`,
      title: `Chapter ${row.position} notes`,
      pageCount: isCh3 ? 46 : 30 + row.position * 2,
      storagePath: '',
      lastPage: 1,
      completed: row.ebooksDone > 0,
    },
    test: {
      id: `${chapterId}-test`,
      title: `${row.title} test`,
      durationMinutes: 60,
      questionCount: isCma ? 41 : 36,
      format: isCma ? '40 MCQs + 1 CBQ' : '30 MCQs + 6 TBS',
      attempts: row.testsDone,
      bestPercent: row.bestTest,
      inProgressAttemptId: null,
      maxAttempts: null,
    },
  };
}

export function resume(): Resume {
  const ch = chapter('cma-part-1-ch3')!;
  const row = courseChapters('cma-part-1').find((r) => r.id === ch.id)!;
  return {
    courseId: 'cma-part-1',
    courseLabel: 'CMA USA · Part 1',
    chapterId: ch.id,
    chapterPosition: 3,
    chapterTitle: ch.title,
    lastActivityAt: todayAt(11, 40),
    videosTotal: 8,
    videosDone: 6,
    ebooksTotal: 1,
    ebooksDone: 0,
    testsTotal: 1,
    testsDone: 0,
    progress: row.progress,
    nextVideo: { id: ch.videos[6].id, title: ch.videos[6].title, position: 7, durationSeconds: 964, resumeAt: 372 },
  };
}

export function recentResults(): RecentResult[] {
  return [
    { attemptId: 'a1', testId: 'cma-part-1-mock-1', title: 'Full mock 1', kind: 'full_mock', courseLabel: 'CMA Part 1', chapterId: null, submittedAt: addDays(-7), percent: 70 },
    { attemptId: 'a2', testId: 'cma-part-1-ch2-test', title: 'Chapter 2 test', kind: 'chapter_test', courseLabel: 'CMA Part 1', chapterId: 'cma-part-1-ch2', submittedAt: addDays(-10), percent: 80 },
    { attemptId: 'a3', testId: 'cpa-far-mock-1', title: 'Full mock 1', kind: 'full_mock', courseLabel: 'CPA FAR', chapterId: null, submittedAt: addDays(-16), percent: 65 },
  ];
}

export function focusAreas(): FocusArea[] {
  return [
    { label: 'Sales variances', courseLabel: 'CMA Part 1', chapterLabel: 'Chapter 3', percent: 54, answered: 24 },
    { label: 'Leases', courseLabel: 'CPA FAR', chapterLabel: 'Chapter 9', percent: 58, answered: 19 },
    { label: 'Revenue recognition', courseLabel: 'CPA FAR', chapterLabel: 'Chapter 4', percent: 63, answered: 31 },
  ];
}

function mock(courseId: string, kind: MockTest['kind'], title: string, n: number, extra: Partial<MockTest> = {}): MockTest {
  const c = catalog().find((x) => x.courseId === courseId)!;
  return {
    testId: `${courseId}-${kind}-${n}`,
    courseId,
    courseLabel: courseLabel(courseId),
    courseShort: courseShort(courseId),
    examFormat: c.examFormat,
    kind,
    title,
    durationMinutes: kind === 'full_mock' ? 240 : 120,
    questionCount: kind === 'full_mock' ? (courseId.startsWith('cma') ? 102 : 57) : courseId.startsWith('cma') ? 10 : 20,
    attempts: 0,
    lastPercent: null,
    lastSubmittedAt: null,
    lastTimeSpent: null,
    lastAttemptId: null,
    inProgressAttemptId: null,
    practiceDone: 0,
    maxAttempts: null,
    ...extra,
  };
}

export function mockTests(): MockTest[] {
  return [
    mock('cma-part-1', 'full_mock', 'Full mock 1', 1, { attempts: 1, lastPercent: 70, lastSubmittedAt: addDays(-7), lastTimeSpent: 3 * 3600 + 52 * 60, lastAttemptId: 'a1' }),
    mock('cma-part-1', 'full_mock', 'Full mock 2', 2),
    mock('cma-part-1', 'practice_set', 'CBQ practice set', 3, { practiceDone: 4 }),
    mock('cma-part-2', 'full_mock', 'Full mock 1', 1),
    mock('cma-part-2', 'full_mock', 'Full mock 2', 2),
    mock('cma-part-2', 'practice_set', 'CBQ practice set', 3),
    mock('cpa-far', 'full_mock', 'Full mock 1', 1, { attempts: 1, lastPercent: 65, lastSubmittedAt: addDays(-16), lastTimeSpent: 3 * 3600 + 58 * 60, lastAttemptId: 'a3' }),
    mock('cpa-far', 'full_mock', 'Full mock 2', 2),
    mock('cpa-far', 'practice_set', 'TBS practice set', 3, { practiceDone: 6 }),
  ];
}

export function account(): Account {
  return {
    profile: {
      id: 'demo-student',
      fullName: 'Ananya Reddy',
      email: 'ananya.reddy@example.com',
      phone: '+91 98XXX XX210',
      phoneVerified: true,
      role: 'student',
      createdAt: '2026-05-09T10:00:00Z',
      targetExamDate: addDays(72).slice(0, 10),
      targetCourseId: 'cma-part-1',
      targetCourseLabel: 'CMA Part 1',
      isBlocked: false,
    },
    access: [
      { program: 'CPA USA', courses: 'FAR, AUD, REG, BAR', validUntil: addDays(12), daysLeft: 12, status: 'ending', enrollmentIds: ['e-far', 'e-aud', 'e-reg', 'e-bar'] },
      { program: 'CMA USA', courses: 'Part 1, Part 2', validUntil: addDays(227), daysLeft: 227, status: 'active', enrollmentIds: ['e-p1', 'e-p2'] },
      { program: 'Advanced Excel', courses: 'Technical skills', validUntil: addDays(245), daysLeft: 245, status: 'active', enrollmentIds: ['e-xl'] },
    ],
    devices: [
      { id: 'd1', deviceId: 'this-device', deviceName: 'Chrome on Windows', platform: 'web', lastActiveAt: new Date().toISOString() },
      { id: 'd2', deviceId: 'android-1', deviceName: 'Android app', platform: 'android', lastActiveAt: addDays(-1) },
    ],
    maxDevices: 2,
    payments: [
      { id: 'p3', packageName: 'Advanced Excel', amountInr: null, paidAt: '2026-06-30T10:00:00Z', invoiceNumber: 'INV-2026-0142' },
      { id: 'p2', packageName: 'CMA USA · Part 1 + Part 2', amountInr: null, paidAt: '2026-06-12T10:00:00Z', invoiceNumber: 'INV-2026-0118' },
      { id: 'p1', packageName: 'CPA USA · 4 sections', amountInr: null, paidAt: '2026-05-09T10:00:00Z', invoiceNumber: 'INV-2026-0071' },
    ],
  };
}

export function notifications(): AppNotification[] {
  return [
    { id: 'n1', title: 'Your CPA USA access ends in 12 days', body: 'Renew now so your classes and mock tests are not interrupted.', link: '/profile', createdAt: hoursAgo(5), readAt: null },
    { id: 'n2', title: 'New videos in CMA Part 1 · Chapter 4', body: '3 new videos on cost management were added.', link: '/courses/cma-part-1', createdAt: hoursAgo(28), readAt: null },
  ];
}

// ---------- Admin ----------
export function dashboardStats(): DashboardStats {
  return {
    activeStudents: 1248,
    newEnrollmentsThisMonth: 86,
    newEnrollmentsByProgram: [
      { program: 'CMA', count: 49 },
      { program: 'CPA', count: 28 },
      { program: 'Skills', count: 9 },
    ],
    revenueThisMonthInr: null,
    endingSoon: 37,
    enrollmentsByCourse: [
      { courseId: 'cma-part-1', program: 'CMA USA', course: 'CMA Part 1', active: 512 },
      { courseId: 'cma-part-2', program: 'CMA USA', course: 'CMA Part 2', active: 388 },
      { courseId: 'cpa-far', program: 'CPA USA', course: 'CPA FAR', active: 214 },
      { courseId: 'cpa-aud', program: 'CPA USA', course: 'CPA AUD', active: 96 },
      { courseId: 'cpa-reg', program: 'CPA USA', course: 'CPA REG', active: 88 },
      { courseId: 'cpa-bar', program: 'CPA USA', course: 'CPA BAR', active: 61 },
      { courseId: 'advanced-excel', program: 'Technical skills', course: 'Advanced Excel', active: 143 },
      { courseId: 'power-bi', program: 'Technical skills', course: 'Power BI', active: 52 },
    ],
    videosReady: 412,
    videosProcessing: 6,
    ebooks: 38,
    questionsByType: { mcq: 4820, tbs: 186, cbq: 92 },
    questionsInReview: 14,
    openDoubts: 9,
  };
}

export function recentActivity(): Activity[] {
  const base = { subjectName: null, title: null, code: null, courseLabel: null, chapterLabel: null } as const;
  return [
    { ...base, id: 4, action: 'video_uploaded', createdAt: new Date(Date.now() - 20 * 60_000).toISOString(), actorName: 'Prakash', actorRole: 'faculty', courseLabel: 'CMA Part 1', chapterLabel: 'Chapter 4', details: { count: 3, processing: 1 } },
    { ...base, id: 3, action: 'question_created', createdAt: hoursAgo(1), actorName: 'Lakshmi', actorRole: 'faculty', courseLabel: 'CPA FAR', chapterLabel: 'Chapter 9', details: { count: 12, kind: 'TBS', topic: 'Leases', status: 'in_review' } },
    { ...base, id: 2, action: 'enrolled', createdAt: hoursAgo(2), actorName: 'Rahul Varma', actorRole: 'student', subjectName: 'Rahul Varma', courseLabel: 'CMA USA (Part 1 + Part 2)', details: { via: 'Razorpay' } },
    { ...base, id: 1, action: 'device_blocked', createdAt: hoursAgo(3), actorName: 'Arjun Mehta', actorRole: 'student', details: { device_name: 'iPhone' } },
  ];
}

export function endingSoon(): EndingSoonRow[] {
  return [
    { userId: 's3', fullName: 'Sneha Patel', phone: '+91 97XXX XX093', program: 'CPA USA', validUntil: addDays(6), totalCount: 37 },
    { userId: 's1', fullName: 'Ananya Reddy', phone: '+91 98XXX XX210', program: 'CPA USA', validUntil: addDays(12), totalCount: 37 },
    { userId: 's8', fullName: 'Vikram Singh', phone: '+91 91XXX XX552', program: 'CMA USA', validUntil: addDays(13), totalCount: 37 },
    { userId: 's9', fullName: 'Meera Iyer', phone: '+91 95XXX XX806', program: 'Power BI', validUntil: addDays(15), totalCount: 37 },
  ];
}

export function courseTree(): TreeProgram[] {
  const byProgram = (key: DemoCourse['program']) =>
    COURSES.filter((c) => c.program === key).map((c) => ({
      id: c.slug,
      code: c.code,
      name: c.name,
      fullName: c.fullName,
      kind: c.kind,
      isPublished: true,
      chapters: c.chapters.map((title, i) => ({
        id: `${c.slug}-ch${i + 1}`,
        position: i + 1,
        title,
        isPublished: !(c.slug === 'cma-part-1' && i === 5),
        videosTotal: VIDEO_COUNTS[i % VIDEO_COUNTS.length],
        videosProcessing: c.slug === 'cma-part-1' && i === 3 ? 1 : 0,
      })),
    }));
  return [
    { id: 'cma-usa', name: 'CMA USA', shortName: 'CMA', slug: 'cma-usa', courses: byProgram('cma') },
    { id: 'cpa-usa', name: 'CPA USA', shortName: 'CPA', slug: 'cpa-usa', courses: byProgram('cpa') },
    { id: 'technical-skills', name: 'Technical skills', shortName: 'Skills', slug: 'technical-skills', courses: byProgram('skills') },
  ];
}

export function adminChapter(chapterId: string): AdminChapter | null {
  const ch = chapter(chapterId);
  if (!ch) return null;
  const tree = courseTree().flatMap((p) => p.courses).flatMap((c) => c.chapters);
  const t = tree.find((x) => x.id === chapterId);
  const videos: AdminVideo[] = ch.videos.map((v) => ({
    id: v.id,
    position: v.position,
    title: v.title,
    durationSeconds: v.durationSeconds,
    status: 'ready',
    processingPercent: 100,
    isPublished: true,
    thumbnailUrl: null,
  }));
  if (chapterId === 'cma-part-1-ch3') {
    videos.push({ id: `${chapterId}-v9`, position: 9, title: '3.9 Chapter summary', durationSeconds: null, status: 'processing', processingPercent: 64, isPublished: false, thumbnailUrl: null });
  }
  return {
    id: ch.id,
    courseId: ch.courseId,
    position: ch.position,
    title: ch.title,
    description: null,
    isPublished: t?.isPublished ?? true,
    courseLabel: ch.courseLabel,
    videos,
    ebook: {
      id: `${chapterId}-ebook`,
      title: `Ch${ch.position}_${ch.title.replace(/[^A-Za-z]+/g, '_')}_Notes.pdf`,
      storagePath: '',
      pageCount: ch.ebook?.pageCount ?? 40,
      fileSizeBytes: 8_600_000,
      blockDownload: true,
      watermark: true,
      allowAnnotations: true,
      isPublished: true,
      createdAt: '2026-10-02T09:00:00Z',
    },
    test: {
      id: `${chapterId}-test`,
      title: ch.test!.title,
      durationMinutes: 60,
      maxAttempts: null,
      selectionMode: 'random',
      randomConfig: { counts: chapterId.startsWith('cma') ? { mcq: 40, cbq: 1 } : { mcq: 30, tbs_numeric: 6 } },
      showAnswersAfterSubmit: true,
      status: 'published',
      questionCount: ch.test!.questionCount,
      description: ch.test!.format,
    },
  };
}

export function questionCounts(): QuestionCounts {
  return { all: 5098, mcq: 4820, tbs: 186, cbq: 92, inReview: 14 };
}

export function questions(): QuestionRow[] {
  const r = (id: string, code: string, stem: string, type: QuestionRow['type'], courseLabel: string, chapterLabel: string, difficulty: QuestionRow['difficulty'], pctCorrect: number | null, status: QuestionRow['status']): QuestionRow => ({
    id, code, stem, type, difficulty, status, topic: null, courseLabel, chapterLabel,
    percentCorrect: pctCorrect, timesAnswered: pctCorrect === null ? 0 : 120, totalCount: 5098,
  });
  return [
    r('q1', 'Q-10421', 'A company uses a flexible budget. Calculate the sales volume variance from the data given.', 'mcq', 'CMA Part 1', 'Ch 3 · Sales variances', 'medium', 54, 'published'),
    r('q2', 'Q-10422', 'Which responsibility center is evaluated on return on investment?', 'mcq', 'CMA Part 1', 'Ch 3 · Responsibility centers', 'easy', 81, 'published'),
    r('q3', 'CBQ-0310', 'Case: Brightline Manufacturing, variance analysis in 4 parts', 'cbq', 'CMA Part 1', 'Ch 3 · Performance Management', 'hard', 47, 'published'),
    r('q4', 'Q-10430', 'Direct labor efficiency variance when actual hours exceed standard hours allowed', 'mcq', 'CMA Part 1', 'Ch 3 · Labor variances', 'medium', null, 'draft'),
    r('q5', 'TBS-0912', 'Prepare the journal entry for a finance lease at commencement', 'tbs_journal_entry', 'CPA FAR', 'Ch 9 · Leases', 'hard', 42, 'published'),
    r('q6', 'TBS-0915', 'Research: find the ASC paragraph on lease classification criteria', 'tbs_research', 'CPA FAR', 'Ch 9 · Leases', 'medium', null, 'in_review'),
    r('q7', 'Q-20114', 'Under ASC 606, which step identifies the performance obligations in a contract?', 'mcq', 'CPA FAR', 'Ch 4 · Revenue recognition', 'easy', 72, 'published'),
    r('q8', 'CBQ-0412', 'Case: Northfield Corp capital budgeting with NPV and IRR', 'cbq', 'CMA Part 2', 'Ch 5 · Investment decisions', 'hard', null, 'in_review'),
  ];
}

export function sampleQuestion(): QuestionRecord {
  return {
    id: null,
    code: null,
    courseId: 'cpa-far',
    chapterId: 'cpa-far-ch9',
    type: 'tbs_journal_entry',
    difficulty: 'hard',
    topic: 'Lessee · finance lease',
    stem:
      'On January 1, Year 1, Kestrel Co. leased equipment from Ridge Leasing for 5 years. Annual payments of $50,000 are due each December 31. The rate implicit in the lease is 6% and is known to Kestrel. The present value of the lease payments is $210,618. The lease is classified as a finance lease.\n\nRequired: Record the journal entry at lease commencement on January 1, Year 1.',
    content: { accounts: ['Right-of-use asset', 'Lease liability', 'Cash', 'Interest expense', 'Amortization expense', 'Lease expense', 'Prepaid rent'], rows: 4 },
    points: 4,
    partialCredit: true,
    timeGuideMinutes: 15,
    status: 'draft',
    reviewerId: 'staff-lakshmi',
    answerKey: {
      lines: [
        { account: 'Right-of-use asset', debit: 210618, credit: 0 },
        { account: 'Lease liability', debit: 0, credit: 210618 },
      ],
    },
    explanation:
      'At commencement, Kestrel recognizes a right-of-use asset and a lease liability equal to the present value of the lease payments: $50,000 × 4.2124 = $210,618. No cash is paid on January 1 because the first payment is due on December 31.',
    exhibits: [
      { id: 'ex1', title: 'Lease agreement extract', storagePath: 'lease.pdf', description: '2 pages' },
      { id: 'ex2', title: 'Present value table', storagePath: 'pv.xlsx', description: 'Annuity factors, 1 to 10 years' },
    ],
    testIds: ['cpa-far-ch9-test', 'cpa-far-practice'],
  };
}

export function courseTests(courseId: string): SimpleTest[] {
  const code = courseShort(courseId).replace(/^CPA |^CMA /, '');
  return [
    { id: `${courseId}-ch9-test`, title: `${code} · Chapter 9 test`, kind: 'chapter_test', chapterId: `${courseId}-ch9` },
    { id: `${courseId}-practice`, title: `${code} · TBS practice set`, kind: 'practice_set', chapterId: null },
    { id: `${courseId}-mock-2`, title: `${code} · Full mock 2`, kind: 'full_mock', chapterId: null },
  ];
}

export function staff(): StaffMember[] {
  return [
    { id: 'staff-lakshmi', fullName: 'Lakshmi · CPA faculty', role: 'faculty' },
    { id: 'staff-prakash', fullName: 'Prakash · CMA faculty', role: 'faculty' },
    { id: 'staff-kiran', fullName: 'Kiran Rao', role: 'super_admin' },
  ];
}

const STUDENTS: (StudentRow & { detail: Omit<StudentDetail, keyof StudentRow | 'createdAt'> & { createdAt?: string } })[] = [
  {
    id: 's1', fullName: 'Ananya Reddy', email: 'ananya.reddy@example.com', phone: '+91 98XXX XX210', courses: 'CMA USA, CPA USA, Advanced Excel',
    validUntil: addDays(12), status: 'ending', progress: 48, lastActiveAt: new Date().toISOString(), createdAt: '2026-05-09T10:00:00Z', isBlocked: false, totalCount: 1248,
    detail: { access: account().access, devicesInUse: 2, maxDevices: 2, blockedAttemptsToday: 0 },
  },
  {
    id: 's2', fullName: 'Rahul Varma', email: 'rahul.varma@example.com', phone: '+91 99XXX XX481', courses: 'CMA USA',
    validUntil: addDays(365), status: 'active', progress: 2, lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString(), isBlocked: false, totalCount: 1248,
    detail: { access: [{ program: 'CMA USA', courses: 'Part 1, Part 2', validUntil: addDays(365), daysLeft: 365, status: 'active', enrollmentIds: ['r1', 'r2'] }], devicesInUse: 1, maxDevices: 2, blockedAttemptsToday: 0 },
  },
  {
    id: 's3', fullName: 'Sneha Patel', email: 'sneha.patel@example.com', phone: '+91 97XXX XX093', courses: 'CPA USA',
    validUntil: addDays(6), status: 'ending', progress: 71, lastActiveAt: addDays(-1), createdAt: '2026-05-03T10:00:00Z', isBlocked: false, totalCount: 1248,
    detail: { access: [{ program: 'CPA USA', courses: 'FAR, AUD, REG, BAR', validUntil: addDays(6), daysLeft: 6, status: 'ending', enrollmentIds: ['sn1'] }], devicesInUse: 2, maxDevices: 2, blockedAttemptsToday: 0 },
  },
  {
    id: 's4', fullName: 'Arjun Mehta', email: 'arjun.mehta@example.com', phone: '+91 90XXX XX772', courses: 'CPA USA, Power BI',
    validUntil: addDays(116), status: 'active', progress: 35, lastActiveAt: hoursAgo(3), createdAt: '2026-08-21T10:00:00Z', isBlocked: false, totalCount: 1248,
    detail: {
      access: [
        { program: 'CPA USA', courses: 'FAR, AUD, REG, ISC', validUntil: addDays(116), daysLeft: 116, status: 'active', enrollmentIds: ['am1'] },
        { program: 'Power BI', courses: 'Technical skills', validUntil: addDays(116), daysLeft: 116, status: 'active', enrollmentIds: ['am2'] },
      ],
      devicesInUse: 2, maxDevices: 2, blockedAttemptsToday: 1,
    },
  },
  {
    id: 's5', fullName: 'Divya Nair', email: 'divya.nair@example.com', phone: '+91 94XXX XX318', courses: 'CMA USA',
    validUntil: addDays(-13), status: 'expired', progress: 88, lastActiveAt: addDays(-8), createdAt: '2025-10-15T10:00:00Z', isBlocked: false, totalCount: 1248,
    detail: { access: [{ program: 'CMA USA', courses: 'Part 1, Part 2', validUntil: addDays(-13), daysLeft: 0, status: 'expired', enrollmentIds: ['dn1'] }], devicesInUse: 1, maxDevices: 2, blockedAttemptsToday: 0 },
  },
  {
    id: 's6', fullName: 'Mohammed Irfan', email: 'm.irfan@example.com', phone: '+91 96XXX XX145', courses: 'Advanced Excel',
    validUntil: addDays(94), status: 'active', progress: 40, lastActiveAt: addDays(-2), createdAt: '2026-07-30T10:00:00Z', isBlocked: false, totalCount: 1248,
    detail: { access: [{ program: 'Advanced Excel', courses: 'Technical skills', validUntil: addDays(94), daysLeft: 94, status: 'active', enrollmentIds: ['mi1'] }], devicesInUse: 1, maxDevices: 2, blockedAttemptsToday: 0 },
  },
  {
    id: 's7', fullName: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '+91 93XXX XX667', courses: 'CMA USA',
    validUntil: addDays(294), status: 'active', progress: 22, lastActiveAt: new Date().toISOString(), createdAt: '2026-08-18T10:00:00Z', isBlocked: false, totalCount: 1248,
    detail: { access: [{ program: 'CMA USA', courses: 'Part 1, Part 2', validUntil: addDays(294), daysLeft: 294, status: 'active', enrollmentIds: ['ps1'] }], devicesInUse: 2, maxDevices: 2, blockedAttemptsToday: 0 },
  },
];

export function students(filter: string, search: string): StudentRow[] {
  const s = search.trim().toLowerCase();
  return STUDENTS.filter((x) => filter === 'all' || x.status === filter)
    .filter((x) => !s || [x.fullName, x.email, x.phone].some((v) => (v ?? '').toLowerCase().includes(s)))
    .map(({ detail: _d, ...row }) => row);
}

export function student(id: string): StudentDetail | null {
  const x = STUDENTS.find((s) => s.id === id);
  if (!x) return null;
  return {
    id: x.id,
    fullName: x.fullName,
    email: x.email,
    phone: x.phone,
    createdAt: x.createdAt,
    isBlocked: x.isBlocked,
    access: x.detail.access,
    devicesInUse: x.detail.devicesInUse,
    maxDevices: x.detail.maxDevices,
    blockedAttemptsToday: x.detail.blockedAttemptsToday,
  };
}
