import type { QuestionType } from '@/lib/types';

export const QUESTION_TYPES: { id: QuestionType; label: string; badge: string; sub: string; exam: string }[] = [
  { id: 'mcq', label: 'MCQ', badge: 'MCQ', sub: '', exam: 'CMA and CPA' },
  { id: 'tbs_journal_entry', label: 'TBS · Journal entry', badge: 'TBS', sub: 'Journal entry', exam: 'CPA' },
  { id: 'tbs_numeric', label: 'TBS · Numeric entry', badge: 'TBS', sub: 'Numeric entry', exam: 'CPA' },
  { id: 'tbs_dropdown', label: 'TBS · Dropdown', badge: 'TBS', sub: 'Dropdown', exam: 'CPA' },
  { id: 'tbs_drag_drop', label: 'TBS · Drag and drop', badge: 'TBS', sub: 'Drag and drop', exam: 'CPA' },
  { id: 'tbs_research', label: 'TBS · Research', badge: 'TBS', sub: 'Research', exam: 'CPA' },
  { id: 'tbs_document_review', label: 'TBS · Document review', badge: 'TBS', sub: 'Document review', exam: 'CPA' },
  { id: 'cbq', label: 'Case-based (CBQ)', badge: 'CBQ', sub: 'Case-based', exam: 'CMA' },
];

export const typeInfo = (t: QuestionType) => QUESTION_TYPES.find((x) => x.id === t) ?? QUESTION_TYPES[0];

export const STATUS_LABEL = { draft: 'Draft', in_review: 'In review', published: 'Published', archived: 'Archived' } as const;
export const STATUS_TONE = { draft: 'none', in_review: 'ending', published: 'active', archived: 'expired' } as const;
export const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;
