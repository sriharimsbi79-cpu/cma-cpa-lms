// React Query hooks for every screen. The actual reads and writes live in
// ./queries.ts (plain functions, easy to test and reuse).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as q from './queries';
import type { QuestionFilters, QuestionRecord } from './types';

export { DemoModeError, PAGE_SIZE } from './queries';

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

// ---------------------------------------------------------------- student reads
export const useCatalog = () => useQuery({ queryKey: ['catalog'], queryFn: q.fetchCatalog });
export const useResume = () => useQuery({ queryKey: ['resume'], queryFn: q.fetchResume });
export const useCourseChapters = (courseId: string | undefined) =>
  useQuery({ queryKey: ['course-chapters', courseId], enabled: !!courseId, queryFn: () => q.fetchCourseChapters(courseId!) });
export const useRecentResults = (limit = 5) => useQuery({ queryKey: ['recent-results', limit], queryFn: () => q.fetchRecentResults(limit) });
export const useFocusAreas = (limit = 3) => useQuery({ queryKey: ['focus-areas', limit], queryFn: () => q.fetchFocusAreas(limit) });
export const useChapter = (chapterId: string | undefined) =>
  useQuery({ queryKey: ['chapter', chapterId], enabled: !!chapterId, queryFn: () => q.fetchChapter(chapterId!) });
export const useMockTests = () => useQuery({ queryKey: ['mock-tests'], queryFn: q.fetchMockTests });
export const useTestInfo = (testId: string | undefined) =>
  useQuery({ queryKey: ['test-info', testId], enabled: !!testId, queryFn: () => q.fetchTestInfo(testId!) });
export const useAccount = () => useQuery({ queryKey: ['account'], queryFn: q.fetchAccount });
export const useNotifications = () => useQuery({ queryKey: ['notifications'], queryFn: q.fetchNotifications });

// ---------------------------------------------------------------- student writes
export function useMarkVideo() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.markVideo, onSuccess: () => invalidate('chapter', 'resume', 'catalog', 'course-chapters') });
}
export const useOpenEbook = () => useMutation({ mutationFn: q.openEbook });
export const useSaveNote = () => useMutation({ mutationFn: q.saveNote });
export const useAskDoubt = () => useMutation({ mutationFn: q.askDoubt });
export function useRemoveDevice() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.removeDevice, onSuccess: () => invalidate('account') });
}
export function useUpdateProfile() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.updateProfile, onSuccess: () => invalidate('account') });
}
export function useMarkNotificationsRead() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.markNotificationsRead, onSuccess: () => invalidate('notifications') });
}

// ---------------------------------------------------------------- admin reads
export const useDashboardStats = () => useQuery({ queryKey: ['admin-stats'], queryFn: q.fetchDashboardStats });
export const useRecentActivity = (limit = 8) => useQuery({ queryKey: ['admin-activity', limit], queryFn: () => q.fetchRecentActivity(limit) });
export const useEndingSoon = (limit = 4) => useQuery({ queryKey: ['admin-ending-soon', limit], queryFn: () => q.fetchEndingSoon(limit) });
export const useCourseTree = () => useQuery({ queryKey: ['admin-tree'], queryFn: q.fetchCourseTree });
export const useAdminChapter = (chapterId: string | undefined) =>
  useQuery({ queryKey: ['admin-chapter', chapterId], enabled: !!chapterId, queryFn: () => q.fetchAdminChapter(chapterId!) });
export const useQuestionCounts = () => useQuery({ queryKey: ['admin-question-counts'], queryFn: q.fetchQuestionCounts });
export const useQuestions = (f: QuestionFilters) =>
  useQuery({ queryKey: ['admin-questions', f], placeholderData: (prev) => prev, queryFn: () => q.fetchQuestions(f) });
export const useQuestion = (id: string | undefined) => useQuery({ queryKey: ['admin-question', id], queryFn: () => q.fetchQuestion(id) });
export const useCourseTests = (courseId: string | undefined) =>
  useQuery({ queryKey: ['admin-course-tests', courseId], enabled: !!courseId, queryFn: () => q.fetchCourseTests(courseId!) });
export const useStaff = () => useQuery({ queryKey: ['admin-staff'], queryFn: q.fetchStaff });
export const useStudents = (filter: string, search: string, page: number) =>
  useQuery({ queryKey: ['admin-students', filter, search, page], placeholderData: (prev) => prev, queryFn: () => q.fetchStudents(filter, search, page) });
export const useStudent = (id: string | undefined) =>
  useQuery({ queryKey: ['admin-student', id], enabled: !!id, queryFn: () => q.fetchStudent(id!) });

// ---------------------------------------------------------------- admin writes
export function useSaveQuestion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (rec: QuestionRecord) => q.saveQuestion(rec),
    onSuccess: () => invalidate('admin-questions', 'admin-question-counts', 'admin-question', 'admin-stats'),
  });
}
export function useUploadExhibit() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.uploadExhibit, onSuccess: () => invalidate('admin-question') });
}
export function useSaveChapter() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.saveChapter, onSuccess: () => invalidate('admin-chapter', 'admin-tree') });
}
export function useAddChapter() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.addChapter, onSuccess: () => invalidate('admin-tree') });
}
export function useAddCourse() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.addCourse, onSuccess: () => invalidate('admin-tree', 'catalog') });
}
export function useUpdateVideo() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.updateVideo, onSuccess: () => invalidate('admin-chapter', 'admin-tree') });
}
export function useReorderVideos() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.reorderVideos, onSettled: () => invalidate('admin-chapter') });
}
export function useUpdateEbook() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.updateEbook, onSuccess: () => invalidate('admin-chapter') });
}
export function useUploadEbook() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.uploadEbook, onSuccess: () => invalidate('admin-chapter', 'admin-stats') });
}
export function useSaveTestSettings() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.saveTestSettings, onSuccess: () => invalidate('admin-chapter') });
}
export function useExtendAccess() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.extendAccess, onSuccess: () => invalidate('admin-student', 'admin-students', 'admin-ending-soon', 'admin-stats') });
}
export function useGrantAccess() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.grantAccess, onSuccess: () => invalidate('admin-student', 'admin-students', 'admin-stats') });
}
export function useResetDevices() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.resetDevices, onSuccess: () => invalidate('admin-student') });
}
export function useSetBlocked() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.setBlocked, onSuccess: () => invalidate('admin-student', 'admin-students') });
}
export const useSendLoginLink = () => useMutation({ mutationFn: q.sendLoginLink });
export const useSendReminders = () => useMutation({ mutationFn: q.sendReminders });
