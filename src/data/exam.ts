// Sample questions and attempts for the exam screen and result page.
// When the database is connected these come from start_test_attempt /
// get_attempt / submit_test_attempt instead.
import type { QuestionType } from '@/lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

export interface ExamQuestion {
  id: string;
  code: string;
  type: QuestionType;
  section: 'mcq' | 'task';
  topic: string;
  stem: string;
  content: Json;
  exhibits: { id: string; title: string }[];
  answerKey: Json;
  explanation: string;
  points: number;
}

export interface AttemptRecord {
  attemptId: string;
  testId: string;
  title: string;
  courseLabel: string;
  submittedAt: string;
  timeSpentSeconds: number;
  questions: ExamQuestion[];
  responses: Record<string, Json>;
  flagged: string[];
}

const opts = (...texts: string[]) => ({ options: texts.map((text, i) => ({ id: 'abcd'[i], text })) });

const mcq = (id: string, code: string, topic: string, stem: string, options: string[], correct: string, explanation: string): ExamQuestion => ({
  id, code, type: 'mcq', section: 'mcq', topic, stem, content: opts(...options), exhibits: [], answerKey: { correct }, explanation, points: 1,
});

const CMA: ExamQuestion[] = [
  mcq('cma-1', 'Q-10421', 'Sales variances',
    'Lark Co. budgeted sales of 10,000 units with a budgeted contribution margin of $12 per unit. Actual sales were 11,000 units. What is the sales volume variance based on contribution margin?',
    ['$12,000 favorable', '$12,000 unfavorable', '$11,000 favorable', '$1,000 favorable'], 'a',
    'Sales volume variance = (actual units − budgeted units) × budgeted contribution margin per unit = (11,000 − 10,000) × $12 = $12,000. More units were sold than budgeted, so it is favorable.'),
  mcq('cma-2', 'Q-10422', 'Responsibility centers',
    'Which type of responsibility center is evaluated using return on investment (ROI)?',
    ['Cost center', 'Revenue center', 'Profit center', 'Investment center'], 'd',
    'An investment center manager controls revenues, costs and the assets invested, so performance is measured against the investment base, for example with ROI or residual income.'),
  mcq('cma-3', 'Q-10430', 'Labor variances',
    'Standard hours allowed for actual output were 4,000. Actual hours worked were 4,200. The standard rate is $20 per hour and the actual rate was $21 per hour. What is the direct labor efficiency variance?',
    ['$4,000 unfavorable', '$4,200 unfavorable', '$4,000 favorable', '$8,200 unfavorable'], 'a',
    'Efficiency variance = (actual hours − standard hours allowed) × standard rate = (4,200 − 4,000) × $20 = $4,000. More hours were used than allowed, so it is unfavorable.'),
  mcq('cma-4', 'Q-10433', 'Material variances',
    'A company purchased 5,000 pounds of material at $3.10 per pound. The standard price is $3.00 per pound. What is the direct material price variance?',
    ['$500 unfavorable', '$500 favorable', '$310 unfavorable', '$5,000 unfavorable'], 'a',
    'Price variance = (actual price − standard price) × actual quantity purchased = ($3.10 − $3.00) × 5,000 = $500 unfavorable.'),
  mcq('cma-5', 'Q-10440', 'Balanced scorecard',
    'Employee training hours and employee retention are measures in which balanced scorecard perspective?',
    ['Financial', 'Customer', 'Internal business process', 'Learning and growth'], 'd',
    'The learning and growth perspective covers people, systems and culture: training, skills, retention and employee satisfaction.'),
  mcq('cma-6', 'Q-10446', 'Performance measures',
    'A division has operating income of $500,000 and invested assets of $3,000,000. The required rate of return is 12%. What is the residual income?',
    ['$140,000', '$360,000', '$500,000', '$60,000'], 'a',
    'Residual income = operating income − (required return × invested assets) = $500,000 − (12% × $3,000,000) = $500,000 − $360,000 = $140,000.'),
  {
    id: 'cma-7',
    code: 'CBQ-0310',
    type: 'cbq',
    section: 'task',
    topic: 'Flexible budgets',
    stem:
      'Brightline Manufacturing prepared a static budget for 20,000 units with a standard variable cost of $15 per unit. Actual production was 22,000 units and actual variable costs were $341,000.\n\nAnswer both parts.',
    content: {
      parts: [
        { id: 'p1', type: 'tbs_numeric', prompt: 'What is the flexible budget for variable costs at the actual level of production?', cells: [{ id: 'c1', label: 'Flexible budget variable costs ($)' }] },
        { id: 'p2', type: 'mcq', prompt: 'What is the flexible budget variance for variable costs?', ...opts('$11,000 unfavorable', '$11,000 favorable', '$41,000 unfavorable', '$30,000 unfavorable') },
      ],
    },
    exhibits: [{ id: 'ex1', title: 'Budget report' }],
    answerKey: {
      parts: {
        p1: { type: 'tbs_numeric', key: { answers: { c1: { value: 330000, tolerance: 0 } } } },
        p2: { type: 'mcq', key: { correct: 'a' } },
      },
    },
    explanation:
      'Part 1: flexible budget = 22,000 units × $15 = $330,000.\nPart 2: flexible budget variance = actual $341,000 − flexible budget $330,000 = $11,000 unfavorable. ($41,000 is the static budget variance, and $30,000 is the volume difference between the static and flexible budgets.)',
    points: 4,
  },
];

const CPA: ExamQuestion[] = [
  mcq('cpa-1', 'Q-20114', 'Revenue recognition',
    'Under ASC 606, which step comes immediately after identifying the contract with a customer?',
    ['Determine the transaction price', 'Identify the performance obligations in the contract', 'Allocate the transaction price', 'Recognize revenue when obligations are satisfied'], 'b',
    'The five steps are: identify the contract, identify the performance obligations, determine the transaction price, allocate it to the obligations, and recognize revenue as each obligation is satisfied.'),
  mcq('cpa-2', 'Q-20131', 'Inventory',
    'When prices are rising, which inventory cost flow method gives the highest ending inventory?',
    ['FIFO', 'LIFO', 'Weighted average', 'All give the same ending inventory'], 'a',
    'Under FIFO the oldest (cheaper) costs go to cost of goods sold, so ending inventory holds the newest, higher costs.'),
  mcq('cpa-3', 'Q-20152', 'Bonds payable',
    'Bonds are issued at a discount and the effective interest method is used. How does interest expense change each year?',
    ['It increases', 'It decreases', 'It stays the same', 'It equals the cash interest paid'], 'a',
    'The carrying amount of a discount bond rises toward face value as the discount is amortized, so interest expense (carrying amount × effective rate) increases each year.'),
  mcq('cpa-4', 'Q-20177', 'Leases',
    'For a finance lease, what does the lessee report on the income statement?',
    ['Interest expense and amortization expense, separately', 'A single straight-line lease expense', 'Interest expense only', 'Rent expense equal to the cash paid'], 'a',
    'A finance lease is presented like a financed purchase: interest on the lease liability and amortization of the right-of-use asset are reported separately. A single straight-line lease cost is used for operating leases.'),
  mcq('cpa-5', 'Q-20190', 'Governmental accounting',
    'Government-wide financial statements use which measurement focus and basis of accounting?',
    ['Economic resources focus, accrual basis', 'Current financial resources focus, modified accrual basis', 'Economic resources focus, modified accrual basis', 'Cash basis'], 'a',
    'Government-wide statements report all assets and liabilities, including capital assets and long-term debt, using the economic resources focus and the accrual basis.'),
  {
    id: 'cpa-6',
    code: 'TBS-0912',
    type: 'tbs_journal_entry',
    section: 'task',
    topic: 'Leases',
    stem:
      'On January 1, Year 1, Kestrel Co. leased equipment for 5 years. Annual payments of $50,000 are due each December 31. The rate implicit in the lease is 6% and is known to Kestrel. The present value of the lease payments is $210,618. The lease is a finance lease.\n\nRecord the journal entry at lease commencement on January 1, Year 1.',
    content: { accounts: ['Right-of-use asset', 'Lease liability', 'Cash', 'Interest expense', 'Amortization expense', 'Lease expense', 'Prepaid rent'], rows: 4 },
    exhibits: [{ id: 'ex1', title: 'Lease agreement extract' }, { id: 'ex2', title: 'Present value table' }],
    answerKey: { lines: [{ account: 'Right-of-use asset', debit: 210618, credit: 0 }, { account: 'Lease liability', debit: 0, credit: 210618 }] },
    explanation:
      'At commencement the lessee records a right-of-use asset and a lease liability equal to the present value of the lease payments, $210,618. No cash is paid on January 1 because the first payment is due on December 31.',
    points: 2,
  },
  {
    id: 'cpa-7',
    code: 'TBS-0931',
    type: 'tbs_dropdown',
    section: 'task',
    topic: 'Statement of cash flows',
    stem: 'For each transaction, select where it is reported in the statement of cash flows under US GAAP.',
    content: {
      blanks: [
        { id: 'b1', label: 'Purchase of equipment for cash', options: ['Operating', 'Investing', 'Financing'] },
        { id: 'b2', label: 'Payment of dividends to shareholders', options: ['Operating', 'Investing', 'Financing'] },
        { id: 'b3', label: 'Interest paid on a bank loan', options: ['Operating', 'Investing', 'Financing'] },
        { id: 'b4', label: 'Proceeds from issuing bonds', options: ['Operating', 'Investing', 'Financing'] },
      ],
    },
    exhibits: [],
    answerKey: { answers: { b1: 'Investing', b2: 'Financing', b3: 'Operating', b4: 'Financing' } },
    explanation:
      'Buying equipment is investing. Dividends paid and bond proceeds are financing. Under US GAAP, interest paid is an operating cash flow even though the loan itself is financing.',
    points: 2,
  },
  {
    id: 'cpa-8',
    code: 'TBS-0915',
    type: 'tbs_research',
    section: 'task',
    topic: 'Leases',
    stem: 'Using the authoritative literature, find the paragraph that lists the criteria a lessee uses to classify a lease as a finance lease.',
    content: { instructions: 'Enter the citation in the format Topic-Subtopic-Section-Paragraph.' },
    exhibits: [],
    answerKey: { citations: ['842-10-25-2'] },
    explanation: 'ASC 842-10-25-2 lists the five criteria. If any one is met, the lessee classifies the lease as a finance lease.',
    points: 1,
  },
];

export function examQuestionsFor(testId: string): ExamQuestion[] {
  return testId.includes('cpa') ? CPA : CMA;
}

// ---------- attempts ----------
const store = new Map<string, AttemptRecord>();
const KEY = (id: string) => `lms_attempt_${id}`;

export function saveAttempt(a: AttemptRecord) {
  store.set(a.attemptId, a);
  try {
    sessionStorage.setItem(KEY(a.attemptId), JSON.stringify(a));
  } catch {
    /* storage can be unavailable; the in-memory copy still works */
  }
}

const SAMPLE_META: Record<string, { testId: string; title: string; courseLabel: string; days: number; spent: number }> = {
  a1: { testId: 'cma-part-1-full_mock-1', title: 'Full mock 1', courseLabel: 'CMA USA · Part 1', days: 7, spent: 3 * 3600 + 52 * 60 },
  a2: { testId: 'cma-part-1-ch2-test', title: 'Chapter 2 test', courseLabel: 'CMA USA · Part 1', days: 10, spent: 48 * 60 },
  a3: { testId: 'cpa-far-full_mock-1', title: 'Full mock 1', courseLabel: 'CPA USA · FAR', days: 16, spent: 3 * 3600 + 58 * 60 },
};

/** Answers for the sample attempts: a1 = 70%, a2 = 80%, a3 = 65%. */
function sampleResponses(id: string): { responses: Record<string, Json>; flagged: string[] } {
  if (id === 'a3')
    return {
      responses: {
        'cpa-1': { selected: 'b' },
        'cpa-2': { selected: 'a' },
        'cpa-3': { selected: 'b' },
        'cpa-4': { selected: 'a' },
        'cpa-5': { selected: 'b' },
        'cpa-6': { lines: [{ account: 'Right-of-use asset', debit: '210,618', credit: '' }, { account: 'Cash', debit: '', credit: '210,618' }] },
        'cpa-7': { answers: { b1: 'Investing', b2: 'Financing', b3: 'Financing', b4: 'Financing' } },
        'cpa-8': { citation: '842-10-25-2' },
      },
      flagged: ['cpa-3', 'cpa-6'],
    };
  const all = id === 'a2';
  return {
    responses: {
      'cma-1': { selected: 'a' },
      'cma-2': { selected: 'd' },
      'cma-3': { selected: all ? 'a' : 'b' },
      'cma-4': { selected: 'a' },
      'cma-5': { selected: 'd' },
      'cma-6': { selected: 'a' },
      'cma-7': { parts: { p1: { answers: { c1: '330,000' } }, p2: { selected: 'c' } } },
    },
    flagged: ['cma-3', 'cma-7'],
  };
}

export function getAttempt(attemptId: string): AttemptRecord | null {
  const mem = store.get(attemptId);
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(KEY(attemptId));
    if (raw) return JSON.parse(raw) as AttemptRecord;
  } catch {
    /* ignore */
  }
  const meta = SAMPLE_META[attemptId];
  if (!meta) return null;
  return {
    attemptId,
    testId: meta.testId,
    title: meta.title,
    courseLabel: meta.courseLabel,
    submittedAt: new Date(Date.now() - meta.days * 86_400_000).toISOString(),
    timeSpentSeconds: meta.spent,
    questions: examQuestionsFor(meta.testId),
    ...sampleResponses(attemptId),
  };
}
