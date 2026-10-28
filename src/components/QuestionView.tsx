// How a question looks to a student. Used by the exam screen, the result page
// (read-only, with the correct MCQ option marked) and "Preview as student" in
// the question builder. Answers use the same shape the database grades.
import { useState } from 'react';
import { Check, FileText, X } from 'lucide-react';
import { cx } from '@/lib/format';
import type { QuestionType } from '@/lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

interface AnswerProps {
  type: QuestionType;
  content: Json;
  idPrefix: string;
  value: Json;
  onChange: (v: Json) => void;
  reviewKey?: Json | null;
}

function Answer({ type, content, idPrefix, value: v, onChange: set, reviewKey }: AnswerProps) {
  const answers: Json = v.answers ?? {};
  const setAnswer = (id: string, val: string) => set({ ...v, answers: { ...answers, [id]: val } });

  switch (type) {
    case 'mcq':
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Choose one answer</legend>
          {(content.options ?? []).map((o: Json) => {
            const isKey = reviewKey?.correct === o.id;
            const wrongPick = !!reviewKey && v.selected === o.id && !isKey;
            return (
              <label
                key={o.id}
                className={cx(
                  'flex min-h-12 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm',
                  isKey ? 'border-ok-fg bg-ok-bg' : wrongPick ? 'border-warn-strong bg-warn-bg' : 'border-line has-[:checked]:border-brand has-[:checked]:bg-brand/10',
                )}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-mcq`}
                  className="size-[18px] shrink-0 accent-brand"
                  checked={v.selected === o.id}
                  onChange={() => set({ selected: o.id })}
                />
                <span className="font-bold text-ink-3">{o.id.toUpperCase()}</span>
                <span className="flex-1">{o.text || <span className="text-ink-3">(empty option)</span>}</span>
                {isKey && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-ok-fg">
                    <Check aria-hidden className="size-4" />
                    Correct answer
                  </span>
                )}
                {wrongPick && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-warn-fg">
                    <X aria-hidden className="size-4" />
                    Your answer
                  </span>
                )}
              </label>
            );
          })}
        </fieldset>
      );
    case 'tbs_journal_entry': {
      const rows = Number(content.rows) || 3;
      const lines: Json[] = Array.from({ length: rows }, (_, i) => v.lines?.[i] ?? { account: '', debit: '', credit: '' });
      const setLine = (i: number, patch: Json) => set({ ...v, lines: lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-3">
                <th scope="col" className="py-1.5 pr-2 font-bold">Account</th>
                <th scope="col" className="w-32 px-2 py-1.5 font-bold">Debit</th>
                <th scope="col" className="w-32 px-2 py-1.5 font-bold">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <select aria-label={`Account, row ${i + 1}`} className="field" value={l.account} onChange={(e) => setLine(i, { account: e.target.value })}>
                      <option value="">Choose account</option>
                      {(content.accounts ?? []).map((a: string) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input aria-label={`Debit, row ${i + 1}`} inputMode="decimal" className="field text-right tabular-nums" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value })} />
                  </td>
                  <td className="px-2 py-1">
                    <input aria-label={`Credit, row ${i + 1}`} inputMode="decimal" className="field text-right tabular-nums" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'tbs_numeric':
      return (
        <div className="flex flex-col gap-2.5">
          {(content.cells ?? []).map((c: Json) => (
            <label key={c.id} className="grid grid-cols-1 items-center gap-1.5 text-sm sm:grid-cols-[1fr_180px] sm:gap-3">
              <span className="font-semibold">{c.label || c.id}</span>
              <input inputMode="decimal" className="field text-right tabular-nums" value={answers[c.id] ?? ''} onChange={(e) => setAnswer(c.id, e.target.value)} />
            </label>
          ))}
        </div>
      );
    case 'tbs_dropdown':
    case 'tbs_document_review': {
      const list = type === 'tbs_dropdown' ? content.blanks : content.spans;
      return (
        <div className="flex flex-col gap-3">
          {(list ?? []).map((b: Json) => (
            <label key={b.id} className="flex flex-col gap-1.5 text-sm">
              {type === 'tbs_dropdown' ? (
                <span className="font-semibold">{b.label || b.id}</span>
              ) : (
                <span className="self-start rounded bg-[#FFF3B0] px-1.5 py-0.5">{b.text || b.id}</span>
              )}
              <select className="field" value={answers[b.id] ?? ''} onChange={(e) => setAnswer(b.id, e.target.value)}>
                <option value="">Select…</option>
                {(b.options ?? []).map((o: string) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      );
    }
    case 'tbs_drag_drop':
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {(content.targets ?? []).map((t: Json) => (
              <span key={t.id} className="rounded-lg border-2 border-dashed border-line-dash px-3 py-2 text-[13px] font-semibold text-ink-2">
                {t.text || t.id}
              </span>
            ))}
          </div>
          {(content.items ?? []).map((it: Json) => (
            <label key={it.id} className="grid grid-cols-1 items-center gap-1.5 text-sm sm:grid-cols-[1fr_220px] sm:gap-3">
              <span className="rounded-lg bg-mist px-3 py-2 font-semibold">{it.text || it.id}</span>
              <select className="field" value={answers[it.id] ?? ''} onChange={(e) => setAnswer(it.id, e.target.value)}>
                <option value="">Drop into…</option>
                {(content.targets ?? []).map((t: Json) => (
                  <option key={t.id} value={t.id}>
                    {t.text || t.id}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      );
    case 'tbs_research':
      return (
        <div className="flex flex-col gap-2 text-sm">
          {content.instructions && <p className="text-ink-2">{content.instructions}</p>}
          <label className="flex flex-col gap-1">
            <span className="field-label">Citation</span>
            <input className="field max-w-xs font-mono" placeholder="e.g. 842-10-25-2" value={v.citation ?? ''} onChange={(e) => set({ citation: e.target.value })} />
          </label>
        </div>
      );
    case 'cbq': {
      const parts: Json = v.parts ?? {};
      return (
        <ol className="flex flex-col gap-4">
          {(content.parts ?? []).map((p: Json, i: number) => {
            const { id, type: t, prompt, ...rest } = p;
            return (
              <li key={id} className="flex flex-col gap-2.5 rounded-xl border border-line p-4">
                <p className="text-sm font-bold">
                  Part {i + 1}. <span className="font-semibold">{prompt || '(question text)'}</span>
                </p>
                <Answer
                  type={t}
                  content={rest}
                  idPrefix={`${idPrefix}-${id}`}
                  value={parts[id] ?? {}}
                  onChange={(pv) => set({ parts: { ...parts, [id]: pv } })}
                  reviewKey={reviewKey ? (reviewKey.parts?.[id]?.key ?? null) : undefined}
                />
              </li>
            );
          })}
        </ol>
      );
    }
  }
}

export default function QuestionView({
  type,
  stem,
  content,
  exhibits,
  value,
  onChange,
  readOnly = false,
  reviewKey,
  idPrefix = 'pv',
}: {
  type: QuestionType;
  stem: string;
  content: Json;
  exhibits: { id: string; title: string }[];
  /** Leave out value/onChange to let the component keep its own answer (preview). */
  value?: Json;
  onChange?: (v: Json) => void;
  readOnly?: boolean;
  /** Answer key, shown on the result page to mark the correct MCQ option. */
  reviewKey?: Json | null;
  idPrefix?: string;
}) {
  const [local, setLocal] = useState<Json>({});
  return (
    <div className="flex flex-col gap-4">
      {exhibits.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Exhibits">
          {exhibits.map((e) => (
            <span key={e.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold">
              <FileText aria-hidden className="size-4 text-ink-3" />
              {e.title}
            </span>
          ))}
        </div>
      )}
      <p className="whitespace-pre-line text-[15px] leading-relaxed">{stem || <span className="text-ink-3">(No question text yet)</span>}</p>
      <fieldset disabled={readOnly} className="min-w-0">
        <Answer type={type} content={content} idPrefix={idPrefix} value={value ?? local} onChange={onChange ?? setLocal} reviewKey={reviewKey} />
      </fieldset>
    </div>
  );
}
