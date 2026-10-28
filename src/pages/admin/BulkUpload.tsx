import { useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Download, FileSpreadsheet, TriangleAlert, UploadCloud, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ChipGroup, Field, NOT_CONNECTED } from '@/components/ui';
import { courseOptions } from '@/data/adminDemo';
import { cx, plural } from '@/lib/format';
import { isDemo } from '@/lib/supabase';

const COLUMNS = [
  { name: 'chapter', text: 'Chapter number, e.g. 3' },
  { name: 'topic', text: 'Short topic name, e.g. Sales variances' },
  { name: 'difficulty', text: 'easy, medium or hard (empty = medium)' },
  { name: 'question', text: 'The question text' },
  { name: 'option_a … option_d', text: 'Answer choices (at least A and B)' },
  { name: 'correct', text: 'The correct letter: a, b, c or d' },
  { name: 'explanation', text: 'Why the answer is correct (shown after the test)' },
];
const HEADER = ['chapter', 'topic', 'difficulty', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct', 'explanation'];

const TEMPLATE = [
  HEADER.join(','),
  '3,Responsibility centers,easy,"Which responsibility center is evaluated using ROI?",Cost center,Revenue center,Profit center,Investment center,d,"An investment center controls revenue, costs and invested assets."',
  '3,Labor variances,medium,"Actual hours 4,200; standard hours allowed 4,000; standard rate $20. What is the labor efficiency variance?","$4,000 unfavorable","$4,200 unfavorable","$4,000 favorable","$8,200 unfavorable",a,"(4,200 − 4,000) × $20 = $4,000 unfavorable."',
].join('\n');

const SAMPLE = [
  HEADER.join(','),
  '3,Sales variances,medium,"Budgeted sales 10,000 units at $12 contribution margin; actual sales 11,000 units. What is the sales volume variance?","$12,000 favorable","$12,000 unfavorable","$11,000 favorable","$1,000 favorable",a,"(11,000 − 10,000) × $12."',
  '3,Responsibility centers,easy,"Which responsibility center is evaluated using ROI?",Cost center,Revenue center,Profit center,Investment center,d,"Investment centers control invested assets."',
  '3,Material variances,medium,"5,000 lbs bought at $3.10; standard price $3.00. Material price variance?","$500 unfavorable","$500 favorable","$310 unfavorable","$5,000 unfavorable",a,"($3.10 − $3.00) × 5,000."',
  '3,Balanced scorecard,easy,"Employee training hours belong to which balanced scorecard perspective?",Financial,Customer,Internal business process,,e,""',
  '9,Performance measures,hard,"Operating income $500,000; assets $3,000,000; required return 12%. Residual income?","$140,000","$360,000","$500,000","$60,000",a,"$500,000 − 12% × $3,000,000."',
  '2,Budgeting,medium,"",Option one,Option two,,,a,""',
].join('\n');

/** Small CSV reader: handles quotes, commas and new lines inside quotes. */
function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

interface Row {
  n: number;
  chapter: string;
  topic: string;
  question: string;
  correct: string;
  answerText: string;
  errors: string[];
}

function check(rows: string[][], chapterCount: number): { rows: Row[]; headerError: string | null } {
  if (rows.length === 0) return { rows: [], headerError: 'The file is empty.' };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const missing = ['question', 'option_a', 'option_b', 'correct'].filter((c) => !head.includes(c));
  if (missing.length) return { rows: [], headerError: `Missing columns: ${missing.join(', ')}. Use the template so the first row has the column names.` };
  const col = (r: string[], name: string) => (r[head.indexOf(name)] ?? '').trim();
  const seen = new Set<string>();
  return {
    headerError: null,
    rows: rows.slice(1).map((r, i) => {
      const errors: string[] = [];
      const question = col(r, 'question');
      const opts = { a: col(r, 'option_a'), b: col(r, 'option_b'), c: col(r, 'option_c'), d: col(r, 'option_d') };
      const correct = col(r, 'correct').toLowerCase();
      const chapter = col(r, 'chapter');
      const diff = col(r, 'difficulty').toLowerCase();
      if (!question) errors.push('Question text is empty');
      if (!opts.a || !opts.b) errors.push('Options A and B are needed');
      if (!['a', 'b', 'c', 'd'].includes(correct)) errors.push('Correct must be a, b, c or d');
      else if (!opts[correct as keyof typeof opts]) errors.push(`Option ${correct.toUpperCase()} is empty`);
      if (chapter && !(Number(chapter) >= 1 && Number(chapter) <= chapterCount)) errors.push(`No chapter ${chapter} in this course`);
      if (diff && !['easy', 'medium', 'hard'].includes(diff)) errors.push('Difficulty must be easy, medium or hard');
      const keyText = question.toLowerCase();
      if (question && seen.has(keyText)) errors.push('Same question appears twice');
      seen.add(keyText);
      return {
        n: i + 2,
        chapter,
        topic: col(r, 'topic'),
        question,
        correct,
        answerText: opts[correct as keyof typeof opts] ?? '',
        errors,
      };
    }),
  };
}

function Step({ n, title, children, done }: { n: number; title: string; children: ReactNode; done?: boolean }) {
  return (
    <section aria-labelledby={`step-${n}`} className="card flex flex-col gap-4 p-5 lg:p-6">
      <div className="flex items-center gap-3">
        <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold', done ? 'bg-ok-bg text-ok-fg' : 'bg-navy text-white')}>
          {done ? <CheckCircle2 aria-hidden className="size-[18px]" /> : n}
        </span>
        <h2 id={`step-${n}`} className="text-lg font-extrabold">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function BulkUpload() {
  const toast = useToast();
  const courses = useMemo(() => courseOptions(), []);
  const [courseId, setCourseId] = useState('cma-part-1');
  const [status, setStatus] = useState<'draft' | 'in_review'>('in_review');
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'errors'>('all');
  const [dragging, setDragging] = useState(false);

  const course = courses.find((c) => c.id === courseId)!;
  const result = useMemo(() => (file ? check(parseCsv(file.text), course.chapters.length) : null), [file, course]);
  const rows = result?.rows ?? [];
  const ready = rows.filter((r) => r.errors.length === 0);
  const bad = rows.length - ready.length;
  const shown = filter === 'errors' ? rows.filter((r) => r.errors.length) : rows;

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcq-upload-template.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      toast.show('Please upload a .csv file. In Excel use File → Save as → CSV.', 'error');
      return;
    }
    if (f.size > 5_000_000) {
      toast.show('The file is larger than 5 MB. Split it into smaller files.', 'error');
      return;
    }
    setFile({ name: f.name, text: await f.text() });
    setFilter('all');
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void readFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col gap-5">
      <Link to="/admin/questions" className="inline-flex h-11 items-center gap-1 self-start text-sm font-bold text-ink-2">
        <ChevronLeft aria-hidden className="size-[18px]" />
        Question bank
      </Link>
      <header className="-mt-3">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Bulk upload questions</h1>
        <p className="mt-1 text-sm text-ink-3">Add many multiple-choice questions at once from a spreadsheet. Add TBS and case-based questions in the question builder.</p>
      </header>
      {!isDemo && (
        <p className="rounded-xl border border-warn-line bg-warn-bg px-3.5 py-2 text-xs font-semibold text-warn-fg">
          You can check your file here, but importing is not connected to the database yet.
        </p>
      )}

      <Step n={1} title="Download the template">
        <p className="text-sm text-ink-2">Fill it in Excel or Google Sheets, one question per row, then save it as a CSV file. Keep the first row with the column names.</p>
        <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {COLUMNS.map((c) => (
            <li key={c.name}>
              <code className="rounded bg-mist px-1.5 py-0.5 text-[13px] font-bold">{c.name}</code> <span className="text-ink-3">{c.text}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-secondary self-start" onClick={downloadTemplate}>
          <Download aria-hidden className="size-4" />
          Download template (CSV)
        </button>
      </Step>

      <Step n={2} title="Choose the course and upload" done={!!file}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Course" htmlFor="bu-course" hint={`Chapter numbers must be 1 to ${course.chapters.length}`}>
            <select id="bu-course" className="field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Save imported questions as" htmlFor="bu-status" hint="In review: a reviewer checks them before students see them">
            <select id="bu-status" className="field" value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'in_review')}>
              <option value="in_review">In review</option>
              <option value="draft">Draft</option>
            </select>
          </Field>
        </div>

        {file ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-mist-4 px-4 py-3">
            <FileSpreadsheet aria-hidden className="size-6 shrink-0 text-ok-fg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{file.name}</p>
              <p className="text-xs text-ink-3">{result?.headerError ? 'Could not read the columns' : plural(rows.length, 'question row')}</p>
            </div>
            <button type="button" aria-label="Remove file" onClick={() => setFile(null)} className="flex size-10 items-center justify-center rounded-lg text-ink-3 hover:bg-mist">
              <X aria-hidden className="size-5" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cx('flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center', dragging ? 'border-brand bg-brand/5' : 'border-line-dash')}
          >
            <UploadCloud aria-hidden className="size-8 text-ink-3" />
            <p className="text-sm font-bold">Drag your CSV file here</p>
            <p className="text-xs text-ink-3">Up to 5 MB</p>
            <input type="file" accept=".csv,text/csv" className="sr-only" id="bu-file" onChange={(e) => void readFile(e.target.files?.[0])} />
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <label htmlFor="bu-file" className="btn-primary cursor-pointer">
                Choose file
              </label>
              <button type="button" className="btn-secondary" onClick={() => setFile({ name: 'sample-questions.csv', text: SAMPLE })}>
                Try a sample file
              </button>
            </div>
          </div>
        )}
      </Step>

      {file && (
        <Step n={3} title="Check and import">
          {result?.headerError ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-fg">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {result.headerError}
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-3 gap-2">
                {[
                  { l: 'Rows', v: rows.length, cls: 'bg-mist-4' },
                  { l: 'Ready to import', v: ready.length, cls: 'bg-ok-bg text-ok-fg' },
                  { l: 'With errors', v: bad, cls: bad ? 'bg-warn-bg text-warn-fg' : 'bg-mist-4' },
                ].map((s) => (
                  <div key={s.l} className={cx('rounded-xl px-3 py-2.5', s.cls)}>
                    <dt className="text-xs font-semibold opacity-80">{s.l}</dt>
                    <dd className="text-2xl font-extrabold">{s.v}</dd>
                  </div>
                ))}
              </dl>
              {bad > 0 && (
                <ChipGroup
                  label="Show rows"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: 'All rows', count: rows.length },
                    { value: 'errors', label: 'Only errors', count: bad },
                  ]}
                />
              )}
              <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line">
                {shown.map((r) => (
                  <li key={r.n} className="flex items-start gap-3 px-3.5 py-3 sm:px-4">
                    {r.errors.length ? (
                      <TriangleAlert aria-label="Has errors" className="mt-0.5 size-[18px] shrink-0 text-warn-strong" />
                    ) : (
                      <CheckCircle2 aria-label="Ready" className="mt-0.5 size-[18px] shrink-0 text-ok-fg" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink-3">
                        Row {r.n}
                        {r.chapter && ` · Chapter ${r.chapter}`}
                        {r.topic && ` · ${r.topic}`}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm font-semibold">{r.question || <span className="text-ink-3">(no question text)</span>}</p>
                      {r.errors.length === 0 ? (
                        <p className="mt-0.5 text-xs text-ink-3">
                          Answer: <b className="text-ink-2">{r.correct.toUpperCase()}. {r.answerText}</b>
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs font-semibold text-warn-fg">{r.errors.join(' · ')}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-3">{bad > 0 ? 'Rows with errors are skipped. Fix them in your file and upload again.' : 'All rows look good.'}</p>
                <button type="button" className="btn-primary" disabled={ready.length === 0} onClick={() => toast.show(NOT_CONNECTED, 'info')}>
                  Import {plural(ready.length, 'question')}
                </button>
              </div>
            </>
          )}
        </Step>
      )}
    </div>
  );
}
