// Every read and write the app makes, as plain async functions.
// Demo mode returns sample data; otherwise these call Supabase
// (database functions from supabase/*.sql, plus a few direct table reads/writes
// that the row level security rules allow).
import * as demo from '@/data/demo';
import { db, isDemo, rpc } from './supabase';
import * as m from './mappers';
import type {
  Account,
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
  QuestionFilters,
  QuestionRecord,
  QuestionRow,
  RecentResult,
  Resume,
  SimpleTest,
  StaffMember,
  StudentDetail,
  StudentRow,
  TestInfo,
  TreeProgram,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rows = Record<string, any>[];

export const PAGE_SIZE = 25;

const pause = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));

/** Thrown by demo-mode writes so screens can show a friendly note. */
export class DemoModeError extends Error {
  constructor() {
    super('Demo mode: connect Supabase to save changes.');
  }
}
const demoWrite = async (): Promise<never> => {
  await pause(null);
  throw new DemoModeError();
};
const check = (r: { error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
};
const safeName = (name: string) => name.replace(/[^\w.-]+/g, '_');

// ======================================================================
// Student
// ======================================================================
export async function fetchCatalog(): Promise<CatalogCourse[]> {
  if (isDemo) return pause(demo.catalog());
  return (await rpc<Rows>('my_catalog')).map(m.mapCatalog);
}

export async function fetchResume(): Promise<Resume | null> {
  if (isDemo) return pause(demo.resume());
  return m.mapResume(await rpc('my_resume'));
}

export async function fetchCourseChapters(courseId: string): Promise<ChapterRow[]> {
  if (isDemo) return pause(demo.courseChapters(courseId));
  return (await rpc<Rows>('my_course_chapters', { p_course_id: courseId })).map(m.mapChapterRow);
}

export async function fetchRecentResults(limit = 5): Promise<RecentResult[]> {
  if (isDemo) return pause(demo.recentResults());
  return (await rpc<Rows>('my_recent_results', { p_limit: limit })).map(m.mapRecentResult);
}

export async function fetchFocusAreas(limit = 3): Promise<FocusArea[]> {
  if (isDemo) return pause(demo.focusAreas());
  return (await rpc<Rows>('my_focus_areas', { p_limit: limit })).map(m.mapFocusArea);
}

export async function fetchChapter(chapterId: string): Promise<ChapterDetail | null> {
  if (isDemo) return pause(demo.chapter(chapterId));
  return m.mapChapter(await rpc('get_chapter', { p_chapter_id: chapterId }));
}

export async function fetchMockTests(): Promise<MockTest[]> {
  if (isDemo) return pause(demo.mockTests());
  return (await rpc<Rows>('my_mock_tests')).map(m.mapMockTest);
}

export async function fetchTestInfo(testId: string): Promise<TestInfo | null> {
  if (isDemo) {
    const mt = demo.mockTests().find((t) => t.testId === testId);
    if (mt)
      return pause({
        id: mt.testId,
        title: mt.title,
        kind: mt.kind,
        courseId: mt.courseId,
        courseLabel: mt.courseLabel,
        chapterId: null,
        durationMinutes: mt.durationMinutes,
        description: mt.kind === 'full_mock' ? mt.examFormat : null,
      });
    const ch = demo.chapter(testId.replace(/-test$/, ''));
    if (ch?.test)
      return pause({
        id: ch.test.id,
        title: ch.test.title,
        kind: 'chapter_test' as const,
        courseId: ch.courseId,
        courseLabel: ch.courseLabel,
        chapterId: ch.id,
        durationMinutes: ch.test.durationMinutes,
        description: ch.test.format,
      });
    return null;
  }
  const { data, error } = await db()
    .from('tests')
    .select('id, title, kind, duration_minutes, description, course_id, chapter_id, courses(name, kind, programs(name))')
    .eq('id', testId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const d = data as any;
  const c = Array.isArray(d.courses) ? d.courses[0] : d.courses;
  const program = Array.isArray(c?.programs) ? c.programs[0]?.name : c?.programs?.name;
  return {
    id: d.id,
    title: d.title,
    kind: d.kind,
    courseId: d.course_id,
    courseLabel: c ? (c.kind === 'skill' ? c.name : `${program} · ${c.name}`) : '',
    chapterId: d.chapter_id,
    durationMinutes: d.duration_minutes,
    description: d.description,
  };
}

export async function fetchAccount(): Promise<Account> {
  if (isDemo) return pause(demo.account());
  return m.mapAccount(await rpc('my_account'));
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  if (isDemo) return pause(demo.notifications());
  const { data, error } = await db()
    .from('notifications')
    .select('id, title, body, link, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map(m.mapNotification);
}

export async function markVideo(v: { videoId: string; position: number; watched: number; complete?: boolean }) {
  if (isDemo) return demoWrite();
  return rpc<{ completed: boolean }>('mark_video_progress', {
    p_video_id: v.videoId,
    p_position_seconds: Math.round(v.position),
    p_watched_seconds: Math.round(v.watched),
    p_mark_complete: !!v.complete,
  });
}

/** Returns a short-lived link to the eBook PDF and records that it was opened. */
export async function openEbook(e: { id: string; storagePath: string; lastPage: number }): Promise<string> {
  if (isDemo) return demoWrite();
  const { data, error } = await db().storage.from('ebooks').createSignedUrl(e.storagePath, 60 * 60);
  if (error) throw new Error(error.message);
  await rpc('mark_ebook_progress', { p_ebook_id: e.id, p_last_page: Math.max(1, e.lastPage) });
  return data.signedUrl;
}

export async function saveNote(n: { videoId: string; atSeconds: number; body: string }) {
  if (isDemo) return demoWrite();
  check(await db().from('video_notes').insert({ video_id: n.videoId, at_seconds: Math.round(n.atSeconds), body: n.body }));
}

export async function askDoubt(d: { chapterId: string; videoId: string | null; atSeconds: number | null; question: string }) {
  if (isDemo) return demoWrite();
  check(
    await db().from('doubts').insert({
      chapter_id: d.chapterId,
      video_id: d.videoId,
      at_seconds: d.atSeconds,
      question: d.question,
    }),
  );
}

export async function removeDevice(id: string) {
  if (isDemo) return demoWrite();
  check(await db().from('user_devices').delete().eq('id', id));
}

export async function updateProfile(p: {
  id: string;
  fullName: string;
  phone: string;
  targetCourseId: string | null;
  targetExamDate: string | null;
}) {
  if (isDemo) return demoWrite();
  check(
    await db()
      .from('profiles')
      .update({
        full_name: p.fullName.trim(),
        phone: p.phone.trim() || null,
        target_course_id: p.targetCourseId || null,
        target_exam_date: p.targetExamDate || null,
      })
      .eq('id', p.id),
  );
}

export async function markNotificationsRead(ids: string[]) {
  if (isDemo || ids.length === 0) return;
  check(await db().from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids));
}

// ======================================================================
// Admin
// ======================================================================
export async function fetchDashboardStats(): Promise<DashboardStats> {
  if (isDemo) return pause(demo.dashboardStats());
  return m.mapDashboard(await rpc('admin_dashboard_stats'));
}

export async function fetchRecentActivity(limit = 8): Promise<Activity[]> {
  if (isDemo) return pause(demo.recentActivity());
  return (await rpc<Rows>('admin_recent_activity', { p_limit: limit })).map(m.mapActivity);
}

export async function fetchEndingSoon(limit = 4): Promise<EndingSoonRow[]> {
  if (isDemo) return pause(demo.endingSoon());
  return (await rpc<Rows>('admin_ending_soon', { p_limit: limit })).map(m.mapEndingSoon);
}

export async function fetchCourseTree(): Promise<TreeProgram[]> {
  if (isDemo) return pause(demo.courseTree());
  return m.mapTree(await rpc<Rows>('admin_course_tree'));
}

export async function fetchAdminChapter(chapterId: string): Promise<AdminChapter | null> {
  if (isDemo) return pause(demo.adminChapter(chapterId));
  return m.mapAdminChapter(await rpc('admin_get_chapter', { p_chapter_id: chapterId }));
}

export async function fetchQuestionCounts(): Promise<QuestionCounts> {
  if (isDemo) return pause(demo.questionCounts());
  return m.mapQuestionCounts(await rpc('admin_question_counts'));
}

export async function fetchQuestions(f: QuestionFilters): Promise<QuestionRow[]> {
  if (isDemo) {
    const s = f.search.trim().toLowerCase();
    const rows = demo
      .questions()
      .filter((q) => f.type === 'all' || (f.type === 'tbs' ? q.type.startsWith('tbs_') : q.type === f.type))
      .filter((q) => !f.difficulty || q.difficulty === f.difficulty)
      .filter((q) => !f.status || q.status === f.status)
      .filter((q) => !s || q.code.toLowerCase().includes(s) || q.stem.toLowerCase().includes(s));
    return pause(f.page > 0 ? [] : rows.map((q) => ({ ...q, totalCount: rows.length })));
  }
  return (
    await rpc<Rows>('admin_list_questions', {
      p_type: f.type === 'all' ? null : f.type,
      p_course_id: f.courseId || null,
      p_chapter_id: f.chapterId || null,
      p_difficulty: f.difficulty || null,
      p_status: f.status || null,
      p_search: f.search || null,
      p_limit: PAGE_SIZE,
      p_offset: f.page * PAGE_SIZE,
    })
  ).map(m.mapQuestionRow);
}

/** id 'new' (or empty) = new question: the demo shows the lease example, live starts blank (null). */
export async function fetchQuestion(id: string | undefined): Promise<QuestionRecord | null> {
  if (!id || id === 'new') return isDemo ? pause(demo.sampleQuestion()) : null;
  if (isDemo) return pause({ ...demo.sampleQuestion(), id });
  return m.mapQuestionRecord(await rpc('admin_get_question', { p_question_id: id }));
}

export async function saveQuestion(q: QuestionRecord): Promise<string> {
  if (isDemo) return demoWrite();
  return rpc<string>('admin_save_question', { p: m.questionPayload(q) });
}

export async function uploadExhibit(x: { questionId: string; file: File | Blob; fileName: string; title: string }) {
  if (isDemo) return demoWrite();
  const path = `${x.questionId}/${Date.now()}-${safeName(x.fileName)}`;
  const up = await db().storage.from('question-exhibits').upload(path, x.file, { upsert: false });
  if (up.error) throw new Error(up.error.message);
  check(await db().from('question_exhibits').insert({ question_id: x.questionId, title: x.title, storage_path: path, position: Date.now() % 100000 }));
}

export async function fetchCourseTests(courseId: string): Promise<SimpleTest[]> {
  if (isDemo) return pause(demo.courseTests(courseId));
  const { data, error } = await db()
    .from('tests')
    .select('id, title, kind, chapter_id')
    .eq('course_id', courseId)
    .order('kind')
    .order('position');
  if (error) throw new Error(error.message);
  return (data ?? []).map((t: any) => ({ id: t.id, title: t.title, kind: t.kind, chapterId: t.chapter_id }));
}

export async function fetchStaff(): Promise<StaffMember[]> {
  if (isDemo) return pause(demo.staff());
  const { data, error } = await db()
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['faculty', 'admin', 'super_admin'])
    .order('full_name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((p: any) => ({ id: p.id, fullName: p.full_name || 'Unnamed', role: p.role }));
}

export async function saveChapter(c: { id: string; title: string; isPublished: boolean }) {
  if (isDemo) return demoWrite();
  check(await db().from('chapters').update({ title: c.title.trim(), is_published: c.isPublished }).eq('id', c.id));
}

export async function addChapter(x: { courseId: string; position: number }): Promise<string> {
  if (isDemo) return demoWrite();
  const { data, error } = await db()
    .from('chapters')
    .insert({ course_id: x.courseId, position: x.position, title: 'New chapter', is_published: false })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function addCourse(c: { programId: string; code: string; name: string; fullName: string; kind: string; position: number }) {
  if (isDemo) return demoWrite();
  const slug = `${c.programId.slice(0, 8)}-${c.code}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  check(
    await db()
      .from('courses')
      .insert({
        program_id: c.programId,
        slug,
        code: c.code.trim().toUpperCase(),
        name: c.name.trim(),
        full_name: c.fullName.trim() || null,
        kind: c.kind,
        position: c.position,
        is_published: false,
      }),
  );
}

export async function updateVideo(v: { id: string; title: string; isPublished: boolean }) {
  if (isDemo) return demoWrite();
  check(await db().from('videos').update({ title: v.title.trim(), is_published: v.isPublished }).eq('id', v.id));
}

export async function reorderVideos(ids: string[]) {
  if (isDemo) return demoWrite();
  const results = await Promise.all(ids.map((id, i) => db().from('videos').update({ position: i + 1 }).eq('id', id)));
  results.forEach(check);
}

export async function updateEbook(e: { id: string; blockDownload: boolean; watermark: boolean; allowAnnotations: boolean }) {
  if (isDemo) return demoWrite();
  check(
    await db()
      .from('ebooks')
      .update({ block_download: e.blockDownload, watermark: e.watermark, allow_annotations: e.allowAnnotations })
      .eq('id', e.id),
  );
}

export async function uploadEbook(x: { chapterId: string; courseId: string; ebookId: string | null; file: File | Blob; fileName: string }) {
  if (isDemo) return demoWrite();
  const path = `${x.courseId}/${x.chapterId}/${Date.now()}-${safeName(x.fileName)}`;
  const up = await db().storage.from('ebooks').upload(path, x.file, { contentType: 'application/pdf' });
  if (up.error) throw new Error(up.error.message);
  const row = { chapter_id: x.chapterId, title: x.fileName, storage_path: path, file_size_bytes: x.file.size, is_published: true };
  check(x.ebookId ? await db().from('ebooks').update(row).eq('id', x.ebookId) : await db().from('ebooks').insert(row));
}

export interface TestSettingsInput {
  testId: string | null;
  chapterId: string;
  courseId: string;
  title: string;
  durationMinutes: number;
  maxAttempts: number | null;
  selectionMode: 'fixed' | 'random';
  randomConfig: Record<string, unknown>;
  showAnswersAfterSubmit: boolean;
}

export async function saveTestSettings(t: TestSettingsInput) {
  if (isDemo) return demoWrite();
  const row = {
    title: t.title,
    duration_minutes: t.durationMinutes,
    max_attempts: t.maxAttempts,
    selection_mode: t.selectionMode,
    random_config: t.randomConfig,
    show_answers_after_submit: t.showAnswersAfterSubmit,
  };
  check(
    t.testId
      ? await db().from('tests').update(row).eq('id', t.testId)
      : await db().from('tests').insert({ ...row, course_id: t.courseId, chapter_id: t.chapterId, kind: 'chapter_test', status: 'published' }),
  );
}

export async function fetchStudents(filter: string, search: string, page: number): Promise<StudentRow[]> {
  if (isDemo) return pause(demo.students(filter, search).map((r, _i, all) => ({ ...r, totalCount: all.length })));
  return (
    await rpc<Rows>('admin_list_students', {
      p_filter: filter,
      p_search: search || null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    })
  ).map(m.mapStudentRow);
}

export async function fetchStudent(id: string): Promise<StudentDetail | null> {
  if (isDemo) return pause(demo.student(id));
  return m.mapStudent(await rpc('admin_get_student', { p_user_id: id }));
}

export async function extendAccess(x: { enrollmentIds: string[]; days: number }) {
  if (isDemo) return demoWrite();
  for (const id of x.enrollmentIds) await rpc('admin_extend_enrollment', { p_enrollment_id: id, p_days: x.days });
}

export async function grantAccess(x: { userId: string; courseIds: string[]; days: number }) {
  if (isDemo) return demoWrite();
  for (const courseId of x.courseIds) await rpc('admin_grant_enrollment', { p_user_id: x.userId, p_course_id: courseId, p_days: x.days });
}

export async function resetDevices(userId: string): Promise<number> {
  if (isDemo) return demoWrite();
  return rpc<number>('admin_reset_devices', { p_user_id: userId });
}

export async function setBlocked(x: { userId: string; blocked: boolean }) {
  if (isDemo) return demoWrite();
  await rpc('admin_set_blocked', { p_user_id: x.userId, p_blocked: x.blocked });
}

export async function sendLoginLink(email: string) {
  if (isDemo) return demoWrite();
  const { error } = await db().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}

export async function sendReminders(): Promise<number> {
  if (isDemo) return demoWrite();
  return rpc<number>('send_expiry_reminders');
}
