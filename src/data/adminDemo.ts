// Sample data for the admin screens that are not connected to the database yet:
// mock tests, payments, coupons, packages and settings.
import { addDays } from '@/lib/format';
import type { Role, TestKind, PublishStatus } from '@/lib/types';
import { courseShort, courseTree } from './demo';

export interface AdminCourseOption {
  id: string;
  label: string;
  program: string;
  examFormat: string | null;
  chapters: { id: string; position: number; title: string }[];
}

export function courseOptions(): AdminCourseOption[] {
  const formats: Record<string, string> = {
    cma: '100 MCQs + 2 case-based questions · 4 hours',
    'cpa-far': '50 MCQs + 7 TBS · 4 hours',
    'cpa-aud': '78 MCQs + 7 TBS · 4 hours',
    'cpa-reg': '72 MCQs + 8 TBS · 4 hours',
  };
  return courseTree().flatMap((p) =>
    p.courses.map((c) => ({
      id: c.id,
      label: courseShort(c.id) || c.name,
      program: p.name,
      examFormat: formats[c.id] ?? (c.id.startsWith('cma') ? formats.cma : null),
      chapters: c.chapters.map((ch) => ({ id: ch.id, position: ch.position, title: ch.title })),
    })),
  );
}

// ---------- mock tests ----------
export interface AdminMock {
  id: string;
  courseId: string;
  title: string;
  kind: Exclude<TestKind, 'chapter_test'>;
  durationMinutes: number;
  questionCount: number;
  selection: 'fixed' | 'random';
  counts: { mcq: number; tbs: number; cbq: number };
  maxAttempts: number | null;
  attempts: number;
  avgPercent: number | null;
  status: PublishStatus;
  showAnswers: boolean;
  shuffle: boolean;
  description: string;
  questionIds: string[];
  chapterIds: string[];
}

const m = (id: string, courseId: string, title: string, kind: AdminMock['kind'], counts: AdminMock['counts'], extra: Partial<AdminMock> = {}): AdminMock => ({
  id,
  courseId,
  title,
  kind,
  durationMinutes: kind === 'full_mock' ? 240 : 120,
  questionCount: counts.mcq + counts.tbs + counts.cbq,
  selection: 'random',
  counts,
  maxAttempts: null,
  attempts: 0,
  avgPercent: null,
  status: 'published',
  showAnswers: true,
  shuffle: true,
  description: '',
  questionIds: [],
  chapterIds: [],
  ...extra,
});

export function adminMocks(): AdminMock[] {
  return [
    m('cma-part-1-full_mock-1', 'cma-part-1', 'Full mock 1', 'full_mock', { mcq: 100, tbs: 0, cbq: 2 }, { attempts: 412, avgPercent: 64, maxAttempts: 2 }),
    m('cma-part-1-full_mock-2', 'cma-part-1', 'Full mock 2', 'full_mock', { mcq: 100, tbs: 0, cbq: 2 }, { attempts: 268, avgPercent: 61, maxAttempts: 2 }),
    m('cma-part-1-practice_set-3', 'cma-part-1', 'CBQ practice set', 'practice_set', { mcq: 0, tbs: 0, cbq: 10 }, { attempts: 905, avgPercent: 58, selection: 'fixed', questionIds: ['q3'] }),
    m('cma-part-2-full_mock-1', 'cma-part-2', 'Full mock 1', 'full_mock', { mcq: 100, tbs: 0, cbq: 2 }, { attempts: 198, avgPercent: 66 }),
    m('cma-part-2-full_mock-3', 'cma-part-2', 'Full mock 3', 'full_mock', { mcq: 100, tbs: 0, cbq: 2 }, { status: 'draft' }),
    m('cpa-far-full_mock-1', 'cpa-far', 'Full mock 1', 'full_mock', { mcq: 50, tbs: 7, cbq: 0 }, { attempts: 151, avgPercent: 59, maxAttempts: 3 }),
    m('cpa-far-practice_set-3', 'cpa-far', 'TBS practice set', 'practice_set', { mcq: 0, tbs: 20, cbq: 0 }, { attempts: 377, avgPercent: 55, selection: 'fixed', questionIds: ['q5', 'q6'] }),
    m('cpa-aud-full_mock-1', 'cpa-aud', 'Full mock 1', 'full_mock', { mcq: 78, tbs: 7, cbq: 0 }, { status: 'in_review' }),
  ];
}

export function blankMock(courseId: string): AdminMock {
  return m('new', courseId, '', 'full_mock', courseId.startsWith('cma') ? { mcq: 100, tbs: 0, cbq: 2 } : { mcq: 50, tbs: 7, cbq: 0 }, { status: 'draft' });
}

/** How many published questions the bank has, per course and type (sample numbers). */
export function bankCounts(courseId: string): { mcq: number; tbs: number; cbq: number } {
  if (courseId.startsWith('cma')) return { mcq: courseId === 'cma-part-1' ? 1840 : 1520, tbs: 0, cbq: courseId === 'cma-part-1' ? 46 : 38 };
  if (courseId.startsWith('cpa')) return { mcq: 420, tbs: 48, cbq: 0 };
  return { mcq: 120, tbs: 0, cbq: 0 };
}

// ---------- payments ----------
export type PaymentStatus = 'paid' | 'failed' | 'refunded';
export interface AdminPayment {
  id: string;
  gatewayId: string;
  studentName: string;
  email: string;
  phone: string;
  packageName: string;
  amountInr: number;
  status: PaymentStatus;
  method: 'UPI' | 'Card' | 'Net banking' | 'Manual';
  createdAt: string;
  invoiceNumber: string | null;
  coupon: string | null;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export function payments(): AdminPayment[] {
  return [
    { id: 'pay-1', gatewayId: 'pay_PqR8sT2uV', studentName: 'Rahul Varma', email: 'rahul.v@example.com', phone: '+91 99XXX XX418', packageName: 'CMA USA · Part 1 + Part 2', amountInr: 45000, status: 'paid', method: 'UPI', createdAt: hoursAgo(2), invoiceNumber: 'INV-2026-0187', coupon: 'DIWALI10' },
    { id: 'pay-2', gatewayId: 'pay_Lm3nO4pQ', studentName: 'Divya Nair', email: 'divya.n@example.com', phone: '+91 98XXX XX771', packageName: 'CPA USA · 4 sections', amountInr: 85000, status: 'paid', method: 'Card', createdAt: hoursAgo(9), invoiceNumber: 'INV-2026-0186', coupon: null },
    { id: 'pay-3', gatewayId: 'pay_Hj5kL6mN', studentName: 'Arjun Mehta', email: 'arjun.m@example.com', phone: '+91 90XXX XX305', packageName: 'Advanced Excel', amountInr: 6000, status: 'failed', method: 'UPI', createdAt: hoursAgo(26), invoiceNumber: null, coupon: null },
    { id: 'pay-4', gatewayId: 'pay_Ef7gH8iJ', studentName: 'Sneha Patel', email: 'sneha@example.com', phone: '+91 97XXX XX093', packageName: 'CPA USA · FAR only', amountInr: 25000, status: 'paid', method: 'Net banking', createdAt: hoursAgo(50), invoiceNumber: 'INV-2026-0185', coupon: null },
    { id: 'pay-5', gatewayId: 'manual', studentName: 'Vikram Singh', email: 'vikram.s@example.com', phone: '+91 91XXX XX552', packageName: 'CMA USA · Part 1', amountInr: 25000, status: 'paid', method: 'Manual', createdAt: hoursAgo(75), invoiceNumber: 'INV-2026-0184', coupon: null },
    { id: 'pay-6', gatewayId: 'pay_Bc9dE0fG', studentName: 'Meera Iyer', email: 'meera.i@example.com', phone: '+91 95XXX XX806', packageName: 'Power BI', amountInr: 6000, status: 'refunded', method: 'Card', createdAt: hoursAgo(130), invoiceNumber: 'INV-2026-0179', coupon: null },
    { id: 'pay-7', gatewayId: 'pay_Xy1zA2bC', studentName: 'Karthik Rao', email: 'karthik.r@example.com', phone: '+91 93XXX XX640', packageName: 'CMA USA · Part 1 + Part 2', amountInr: 40500, status: 'paid', method: 'UPI', createdAt: hoursAgo(170), invoiceNumber: 'INV-2026-0176', coupon: 'DIWALI10' },
  ];
}

export interface CoursePackage {
  id: string;
  name: string;
  courses: string[];
  priceInr: number;
  validityMonths: number;
  active: boolean;
  sold: number;
}

export function packages(): CoursePackage[] {
  return [
    { id: 'pk1', name: 'CMA USA · Part 1 + Part 2', courses: ['CMA Part 1', 'CMA Part 2'], priceInr: 45000, validityMonths: 18, active: true, sold: 214 },
    { id: 'pk2', name: 'CMA USA · Part 1', courses: ['CMA Part 1'], priceInr: 25000, validityMonths: 12, active: true, sold: 96 },
    { id: 'pk3', name: 'CPA USA · 4 sections', courses: ['FAR', 'AUD', 'REG', 'BAR'], priceInr: 85000, validityMonths: 18, active: true, sold: 61 },
    { id: 'pk4', name: 'CPA USA · FAR only', courses: ['FAR'], priceInr: 25000, validityMonths: 12, active: true, sold: 38 },
    { id: 'pk5', name: 'Advanced Excel', courses: ['Advanced Excel'], priceInr: 6000, validityMonths: 12, active: true, sold: 143 },
    { id: 'pk6', name: 'Power BI', courses: ['Power BI'], priceInr: 6000, validityMonths: 12, active: false, sold: 52 },
  ];
}

export interface Coupon {
  id: string;
  code: string;
  kind: 'percent' | 'flat';
  value: number;
  used: number;
  limit: number | null;
  validUntil: string | null;
  active: boolean;
}

export function coupons(): Coupon[] {
  return [
    { id: 'c1', code: 'DIWALI10', kind: 'percent', value: 10, used: 38, limit: 100, validUntil: addDays(6), active: true },
    { id: 'c2', code: 'REFER5000', kind: 'flat', value: 5000, used: 12, limit: null, validUntil: null, active: true },
    { id: 'c3', code: 'EARLYBIRD', kind: 'percent', value: 15, used: 50, limit: 50, validUntil: addDays(-20), active: false },
  ];
}

// ---------- settings ----------
export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastActive: string;
}

export function staffAccounts(): StaffAccount[] {
  return [
    { id: 'staff-kiran', name: 'Kiran Rao', email: 'kiran@example.com', role: 'super_admin', lastActive: hoursAgo(0.2) },
    { id: 'staff-lakshmi', name: 'Lakshmi', email: 'lakshmi@example.com', role: 'faculty', lastActive: hoursAgo(1) },
    { id: 'staff-prakash', name: 'Prakash', email: 'prakash@example.com', role: 'faculty', lastActive: hoursAgo(5) },
    { id: 'staff-anil', name: 'Anil Kumar', email: 'anil@example.com', role: 'admin', lastActive: hoursAgo(30) },
  ];
}
