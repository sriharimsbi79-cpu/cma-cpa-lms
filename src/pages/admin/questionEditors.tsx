// Answer-key editors for each question type. The content / answer_key shapes
// match what grade_response() in supabase/01_schema.sql expects.
import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { cx } from '@/lib/format';
import type { QuestionType } from '@/lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Json = Record<string, any>;
export interface EditorProps {
  content: Json;
  answerKey: Json;
  onChange: (content: Json, answerKey: Json) => void;
}

const LETTERS = 'abcdefghij';
function nextId(prefix: string, used: string[]) {
  let i = 1;
  while (used.includes(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}
const num = (v: string) => (v.trim() === '' ? '' : Number(v.replace(/,/g, '')));
const show = (v: unknown) => (v === '' || v === null || v === undefined ? '' : String(v));

export function defaultsFor(type: QuestionType): { content: Json; answerKey: Json } {
  switch (type) {
    case 'mcq':
      return { content: { options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' })) }, answerKey: { correct: '' } };
    case 'tbs_journal_entry':
      return { content: { accounts: ['Cash'], rows: 4 }, answerKey: { lines: [{ account: '', debit: 0, credit: 0 }] } };
    case 'tbs_numeric':
      return { content: { cells: [{ id: 'c1', label: '' }] }, answerKey: { answers: { c1: { value: '', tolerance: 0 } } } };
    case 'tbs_dropdown':
      return { content: { blanks: [{ id: 'b1', label: '', options: [] }] }, answerKey: { answers: { b1: '' } } };
    case 'tbs_document_review':
      return { content: { spans: [{ id: 's1', text: '', options: [] }] }, answerKey: { answers: { s1: '' } } };
    case 'tbs_drag_drop':
      return {
        content: { items: [{ id: 'i1', text: '' }], targets: [{ id: 't1', text: '' }, { id: 't2', text: '' }] },
        answerKey: { answers: { i1: '' } },
      };
    case 'tbs_research':
      return { content: { instructions: '' }, answerKey: { citations: [] } };
    case 'cbq':
      return {
        content: { parts: [{ id: 'p1', type: 'tbs_numeric', prompt: '', ...defaultsFor('tbs_numeric').content }] },
        answerKey: { parts: { p1: { type: 'tbs_numeric', key: defaultsFor('tbs_numeric').answerKey } } },
      };
  }
}

/** Problems that stop a question going to review. Empty = OK. */
export function validateAnswer(type: QuestionType, c: Json, k: Json | null): string[] {
  const errs: string[] = [];
  if (!k) return ['Add the answer key'];
  switch (type) {
    case 'mcq': {
      const opts = (c.options ?? []).filter((o: Json) => o.text?.trim());
      if (opts.length < 2) errs.push('Add at least two options');
      if (!k.correct || !opts.some((o: Json) => o.id === k.correct)) errs.push('Pick the correct option');
      break;
    }
    case 'tbs_journal_entry': {
      const lines = (k.lines ?? []).filter((l: Json) => l.account);
      if (lines.length === 0) errs.push('Add at least one journal line');
      const dr = lines.reduce((a: number, l: Json) => a + (Number(l.debit) || 0), 0);
      const cr = lines.reduce((a: number, l: Json) => a + (Number(l.credit) || 0), 0);
      if (Math.abs(dr - cr) > 0.005) errs.push('Debits and credits must balance');
      break;
    }
    case 'tbs_numeric':
      if (!(c.cells ?? []).length) errs.push('Add at least one answer cell');
      for (const cell of c.cells ?? []) {
        if (!cell.label?.trim()) errs.push('Every answer cell needs a label');
        if (k.answers?.[cell.id]?.value === '' || k.answers?.[cell.id]?.value === undefined) errs.push(`Enter the correct value for "${cell.label || cell.id}"`);
      }
      break;
    case 'tbs_dropdown':
    case 'tbs_document_review': {
      const list = type === 'tbs_dropdown' ? c.blanks : c.spans;
      if (!(list ?? []).length) errs.push('Add at least one item');
      for (const b of list ?? []) {
        if ((b.options ?? []).length < 2) errs.push('Each item needs at least two choices');
        if (!k.answers?.[b.id]) errs.push('Pick the correct choice for every item');
      }
      break;
    }
    case 'tbs_drag_drop':
      if ((c.targets ?? []).length < 2) errs.push('Add at least two boxes');
      for (const it of c.items ?? []) if (!k.answers?.[it.id]) errs.push('Link every item to a box');
      break;
    case 'tbs_research':
      if (!(k.citations ?? []).length) errs.push('Add at least one accepted citation');
      break;
    case 'cbq':
      if (!(c.parts ?? []).length) errs.push('Add at least one part');
      for (const p of c.parts ?? []) {
        if (!p.prompt?.trim()) errs.push('Every part needs a question');
        errs.push(...validateAnswer(p.type, p, k.parts?.[p.id]?.key ?? null).map((e) => `Part ${p.id.replace('p', '')}: ${e}`));
      }
      break;
  }
  return [...new Set(errs)];
}

// ---------------------------------------------------------------- MCQ
export function McqEditor({ content, answerKey, onChange }: EditorProps) {
  const options: Json[] = content.options ?? [];
  const setOpt = (i: number, text: string) => onChange({ ...content, options: options.map((o, j) => (j === i ? { ...o, text } : o)) }, answerKey);
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] text-ink-3">Type the choices and pick the correct one.</p>
      {options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2.5">
          <input
            type="radio"
            name="mcq-correct"
            aria-label={`Option ${o.id.toUpperCase()} is correct`}
            checked={answerKey.correct === o.id}
            onChange={() => onChange(content, { correct: o.id })}
            className="size-5 shrink-0 accent-brand"
          />
          <span className="w-5 text-sm font-bold text-ink-3">{o.id.toUpperCase()}</span>
          <input aria-label={`Option ${o.id.toUpperCase()}`} className="field" value={o.text} onChange={(e) => setOpt(i, e.target.value)} />
          <button
            type="button"
            aria-label={`Remove option ${o.id.toUpperCase()}`}
            disabled={options.length <= 2}
            onClick={() => onChange({ ...content, options: options.filter((_, j) => j !== i) }, answerKey.correct === o.id ? { correct: '' } : answerKey)}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-mist disabled:opacity-40"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      ))}
      {options.length < 6 && (
        <button
          type="button"
          onClick={() => {
            const id = LETTERS.split('').find((l) => !options.some((o) => o.id === l)) ?? `o${options.length + 1}`;
            onChange({ ...content, options: [...options, { id, text: '' }] }, answerKey);
          }}
          className="inline-flex h-10 items-center gap-1.5 self-start text-sm font-bold text-brand"
        >
          <Plus aria-hidden className="size-3.5" strokeWidth={2.6} />
          Add option
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Journal entry
export function JournalEntryEditor({ content, answerKey, onChange }: EditorProps) {
  const accounts: string[] = content.accounts ?? [];
  const lines: Json[] = answerKey.lines ?? [];
  const [newAcc, setNewAcc] = useState('');
  const setLine = (i: number, patch: Json) => onChange(content, { ...answerKey, lines: lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const dr = lines.reduce((a, l) => a + (Number(l.debit) || 0), 0);
  const cr = lines.reduce((a, l) => a + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(dr - cr) < 0.005 && dr > 0;
  const used = new Set(lines.map((l) => l.account).filter(Boolean));
  const addAccount = () => {
    const a = newAcc.trim();
    if (!a || accounts.includes(a)) return;
    onChange({ ...content, accounts: [...accounts, a] }, answerKey);
    setNewAcc('');
  };
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-3">
              <th scope="col" className="py-2 pr-2 font-bold">Account</th>
              <th scope="col" className="w-40 px-2 py-2 font-bold">Debit ($)</th>
              <th scope="col" className="w-40 px-2 py-2 font-bold">Credit ($)</th>
              <th scope="col" className="w-11">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <select aria-label={`Account, row ${i + 1}`} className="field" value={l.account} onChange={(e) => setLine(i, { account: e.target.value })}>
                    <option value="">Choose account</option>
                    {accounts.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input aria-label={`Debit, row ${i + 1}`} inputMode="decimal" className="field text-right tabular-nums" value={l.debit ? fmt(Number(l.debit)) : ''} onChange={(e) => setLine(i, { debit: Number(num(e.target.value)) || 0 })} />
                </td>
                <td className="px-2 py-1">
                  <input aria-label={`Credit, row ${i + 1}`} inputMode="decimal" className="field text-right tabular-nums" value={l.credit ? fmt(Number(l.credit)) : ''} onChange={(e) => setLine(i, { credit: Number(num(e.target.value)) || 0 })} />
                </td>
                <td>
                  <button
                    type="button"
                    aria-label={`Remove row ${i + 1}`}
                    disabled={lines.length <= 1}
                    onClick={() => onChange(content, { ...answerKey, lines: lines.filter((_, j) => j !== i) })}
                    className="flex size-10 items-center justify-center rounded-lg text-ink-3 hover:bg-mist disabled:opacity-40"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-extrabold">
              <td className="border-t border-line pb-1 pr-2 pt-2.5">
                Total ·{' '}
                <span className={balanced ? 'text-ok-fg' : 'text-warn-text'}>{balanced ? 'balanced' : 'not balanced'}</span>
              </td>
              <td className="border-t border-line px-5 pb-1 pt-2.5 text-right tabular-nums">{fmt(dr)}</td>
              <td className="border-t border-line px-5 pb-1 pt-2.5 text-right tabular-nums">{fmt(cr)}</td>
              <td className="border-t border-line" />
            </tr>
          </tfoot>
        </table>
      </div>
      <button
        type="button"
        onClick={() => onChange({ ...content, rows: Math.max(Number(content.rows) || 0, lines.length + 1) }, { ...answerKey, lines: [...lines, { account: '', debit: 0, credit: 0 }] })}
        className="inline-flex h-10 items-center gap-1.5 self-start text-sm font-bold text-brand"
      >
        <Plus aria-hidden className="size-3.5" strokeWidth={2.6} />
        Add row
      </button>
      <div className="flex flex-col gap-2 border-t border-line-soft pt-3.5">
        <p className="text-[13px] font-bold">Accounts students can choose from</p>
        <ul className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <li key={a} className={cx('inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-[13px] font-semibold', used.has(a) ? 'bg-ok-bg text-ok-fg' : 'border border-line-strong text-ink-2')}>
              {a}
              {used.has(a) && ' · correct'}
              <button
                type="button"
                aria-label={`Remove ${a}`}
                onClick={() => onChange({ ...content, accounts: accounts.filter((x) => x !== a) }, { ...answerKey, lines: lines.map((l) => (l.account === a ? { ...l, account: '' } : l)) })}
                className="-my-2 -mr-2 flex size-10 items-center justify-center rounded-full hover:bg-black/5"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            aria-label="New account name"
            placeholder="Add an account, e.g. Interest expense"
            className="field max-w-xs"
            value={newAcc}
            onChange={(e) => setNewAcc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addAccount();
              }
            }}
          />
          <button type="button" className="btn-secondary" onClick={addAccount}>
            Add
          </button>
        </div>
        <p className="text-xs text-ink-3">Add a few wrong accounts too, so students have to choose.</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        Rows students see
        <input type="number" min={lines.length} max={12} className="field w-20" value={content.rows ?? 4} onChange={(e) => onChange({ ...content, rows: Number(e.target.value) || lines.length }, answerKey)} />
      </label>
    </div>
  );
}

// ---------------------------------------------------------------- Numeric
export function NumericEditor({ content, answerKey, onChange }: EditorProps) {
  const cells: Json[] = content.cells ?? [];
  const answers: Json = answerKey.answers ?? {};
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] text-ink-3">Students type an amount into each cell. Set the correct value and how far off is still accepted.</p>
      {cells.map((cell, i) => (
        <div key={cell.id} className="grid grid-cols-[1fr_120px_90px_40px] items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="field-label">{i === 0 ? 'Cell label' : <span className="sr-only">Cell label</span>}</span>
            <input className="field" value={cell.label} placeholder="e.g. Sales volume variance" onChange={(e) => onChange({ ...content, cells: cells.map((c) => (c.id === cell.id ? { ...c, label: e.target.value } : c)) }, answerKey)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="field-label">{i === 0 ? 'Correct value' : <span className="sr-only">Correct value</span>}</span>
            <input inputMode="decimal" className="field text-right" value={show(answers[cell.id]?.value)} onChange={(e) => onChange(content, { answers: { ...answers, [cell.id]: { ...answers[cell.id], value: num(e.target.value) } } })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="field-label">{i === 0 ? '± allowed' : <span className="sr-only">Allowed difference</span>}</span>
            <input inputMode="decimal" className="field text-right" value={show(answers[cell.id]?.tolerance ?? 0)} onChange={(e) => onChange(content, { answers: { ...answers, [cell.id]: { ...answers[cell.id], tolerance: num(e.target.value) || 0 } } })} />
          </label>
          <button
            type="button"
            aria-label="Remove cell"
            disabled={cells.length <= 1}
            onClick={() => {
              const { [cell.id]: _drop, ...rest } = answers;
              onChange({ ...content, cells: cells.filter((c) => c.id !== cell.id) }, { answers: rest });
            }}
            className="flex size-10 items-center justify-center rounded-lg text-ink-3 hover:bg-mist disabled:opacity-40"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const id = nextId('c', cells.map((c) => c.id));
          onChange({ ...content, cells: [...cells, { id, label: '' }] }, { answers: { ...answers, [id]: { value: '', tolerance: 0 } } });
        }}
        className="inline-flex h-10 items-center gap-1.5 self-start text-sm font-bold text-brand"
      >
        <Plus aria-hidden className="size-3.5" strokeWidth={2.6} />
        Add cell
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Dropdown / document review
export function ChoiceListEditor({ content, answerKey, onChange, kind }: EditorProps & { kind: 'blanks' | 'spans' }) {
  const list: Json[] = content[kind] ?? [];
  const answers: Json = answerKey.answers ?? {};
  const textKey = kind === 'blanks' ? 'label' : 'text';
  const prefix = kind === 'blanks' ? 'b' : 's';
  const update = (id: string, patch: Json) => onChange({ ...content, [kind]: list.map((b) => (b.id === id ? { ...b, ...patch } : b)) }, answerKey);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-3">
        {kind === 'blanks'
          ? 'Each blank in the scenario gets a dropdown. Type the choices separated by commas and pick the correct one.'
          : 'Students read the document and choose the right fix for each highlighted phrase.'}
      </p>
      {list.map((b, i) => (
        <div key={b.id} className="flex flex-col gap-2 rounded-xl border border-line p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold">
              {kind === 'blanks' ? 'Blank' : 'Phrase'} {i + 1}
            </span>
            <button
              type="button"
              aria-label="Remove"
              disabled={list.length <= 1}
              onClick={() => {
                const { [b.id]: _drop, ...rest } = answers;
                onChange({ ...content, [kind]: list.filter((x) => x.id !== b.id) }, { answers: rest });
              }}
              className="flex size-9 items-center justify-center rounded-lg text-ink-3 hover:bg-mist disabled:opacity-40"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
          <input
            aria-label={kind === 'blanks' ? 'Blank label' : 'Highlighted phrase'}
            className="field"
            placeholder={kind === 'blanks' ? 'Label, e.g. Classification of the lease' : 'Highlighted phrase from the document'}
            value={b[textKey] ?? ''}
            onChange={(e) => update(b.id, { [textKey]: e.target.value })}
          />
          <input
            aria-label="Choices, separated by commas"
            className="field"
            placeholder="Choices, separated by commas"
            defaultValue={(b.options ?? []).join(', ')}
            onBlur={(e) => update(b.id, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
          />
          <select
            aria-label="Correct choice"
            className="field"
            value={answers[b.id] ?? ''}
            onChange={(e) => onChange(content, { answers: { ...answers, [b.id]: e.target.value } })}
          >
            <option value="">Correct choice…</option>
            {(b.options ?? []).map((o: string) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const id = nextId(prefix, list.map((x) => x.id));
          onChange({ ...content, [kind]: [...list, { id, [textKey]: '', options: [] }] }, { answers: { ...answers, [id]: '' } });
        }}
        className="inline-flex h-10 items-center gap-1.5 self-start text-sm font-bold text-brand"
      >
        <Plus aria-hidden className="size-3.5" strokeWidth={2.6} />
        Add {kind === 'blanks' ? 'blank' : 'phrase'}
      </button>
    </div>
  );
}

// stable components (defining them inline would remount inputs on every keystroke)
export const DropdownEditor = (p: EditorProps) => <ChoiceListEditor {...p} kind="blanks" />;
export const DocumentReviewEditor = (p: EditorProps) => <ChoiceListEditor {...p} kind="spans" />;

// ---------------------------------------------------------------- Drag and drop
export function DragDropEditor({ content, answerKey, onChange }: EditorProps) {
  const items: Json[] = content.items ?? [];
  const targets: Json[] = content.targets ?? [];
  const answers: Json = answerKey.answers ?? {};
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-bold">Boxes</p>
        {targets.map((t) => (
          <div key={t.id} className="flex gap-2">
            <input aria-label="Box name" className="field" placeholder="e.g. Operating activities" value={t.text} onChange={(e) => onChange({ ...content, targets: targets.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)) }, answerKey)} />
            <button
              type="button"
              aria-label="Remove box"
              disabled={targets.length <= 2}
              onClick={() => onChange({ ...content, targets: targets.filter((x) => x.id !== t.id) }, { answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v === t.id ? '' : v])) })}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-mist disabled:opacity-40"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...content, targets: [...targets, { id: nextId('t', targets.map((x) => x.id)), text: '' }] }, answerKey)} className="inline-flex h-10 items-center gap-1.5 self-start text-sm font-bold text-brand">
          <Plus aria-hidden className="size-3.5" strokeWidth={2.6} />
          Add box
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-bold">Items and their correct box</p>
        {items.map((it) => (
          <div key={it.id} className="flex flex-col gap-1.5 rounded-xl border border-line p-2.5">
            <div className="flex gap-2">
              <input aria-label="Item" className="field" placeholder="e.g. Purchase of equipment" value={it.text} onChange={(e) => onChange({ ...content, items: items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)) }, answerKey)} />
              <button
                type="button"
                aria-label="Remove item"
                disabled={items.length <= 1}
                onClick={() => {
                  const { [it.id]: _drop, ...rest } = answers;
                  onChange({ ...content, items: items.filter((x) => x.id !== it.id) }, { answers: rest });
                }}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-mist disabled:opacity-40"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </div>
            <select aria-label="Correct box" className="field" value={answers[it.id] ?? ''} onChange={(e) => onChange(content, { answers: { ...answers, [it.id]: e.target.value } })}>
              <option value="">Correct box…</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.text || t.id}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const id = nextId('i', items.map((x) => x.id));
            onChange({ ...content, items: [...items, { id, text: '' }] }, { answers: { ...answers, [id]: '' } });
          }}
          className="inline-flex h-10 items-center gap-1.5 self-start text-sm font-bold text-brand"
        >
          <Plus aria-hidden className="size-3.5" strokeWidth={2.6} />
          Add item
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Research
export function ResearchEditor({ content, answerKey, onChange }: EditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="field-label">What students should find</span>
        <textarea rows={3} className="rounded-[10px] border border-line-strong px-3 py-2.5 text-sm" value={content.instructions ?? ''} onChange={(e) => onChange({ ...content, instructions: e.target.value }, answerKey)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="field-label">Accepted citations, one per line</span>
        <textarea
          rows={3}
          className="rounded-[10px] border border-line-strong px-3 py-2.5 font-mono text-sm"
          placeholder="842-10-25-2"
          defaultValue={(answerKey.citations ?? []).join('\n')}
          onBlur={(e) => onChange(content, { citations: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
        />
        <span className="text-xs text-ink-3">Spaces and dashes are ignored when marking, so 842-10-25-2 and 842 10 25 2 both count.</span>
      </label>
    </div>
  );
}

// ---------------------------------------------------------------- CBQ
const PART_TYPES: { id: QuestionType; label: string }[] = [
  { id: 'tbs_numeric', label: 'Numeric entry' },
  { id: 'tbs_dropdown', label: 'Dropdown' },
  { id: 'tbs_drag_drop', label: 'Drag and drop' },
  { id: 'mcq', label: 'Multiple choice' },
];

export function CbqEditor({ content, answerKey, onChange }: EditorProps) {
  const parts: Json[] = content.parts ?? [];
  const keys: Json = answerKey.parts ?? {};
  const setPart = (id: string, part: Json, key: Json) =>
    onChange({ ...content, parts: parts.map((p) => (p.id === id ? part : p)) }, { parts: { ...keys, [id]: { type: part.type, key } } });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-ink-3">One case with several linked parts. Each part is marked on its own and the case score is the average.</p>
      {parts.map((p, i) => {
        const { id, type, prompt, ...partContent } = p;
        const partKey = keys[id]?.key ?? defaultsFor(type).answerKey;
        const Editor = editorFor(type);
        return (
          <div key={id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-extrabold">Part {i + 1}</span>
              <div className="flex items-center gap-2">
                <select
                  aria-label={`Part ${i + 1} answer type`}
                  className="field h-10 w-auto"
                  value={type}
                  onChange={(e) => {
                    const t = e.target.value as QuestionType;
                    const d = defaultsFor(t);
                    setPart(id, { id, type: t, prompt, ...d.content }, d.answerKey);
                  }}
                >
                  {PART_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Remove part ${i + 1}`}
                  disabled={parts.length <= 1}
                  onClick={() => {
                    const { [id]: _drop, ...rest } = keys;
                    onChange({ ...content, parts: parts.filter((x) => x.id !== id) }, { parts: rest });
                  }}
                  className="flex size-10 items-center justify-center rounded-lg text-ink-3 hover:bg-mist disabled:opacity-40"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </div>
            <textarea
              aria-label={`Part ${i + 1} question`}
              rows={2}
              placeholder="Question for this part"
              className="rounded-[10px] border border-line-strong px-3 py-2.5 text-sm"
              value={prompt ?? ''}
              onChange={(e) => setPart(id, { ...p, prompt: e.target.value }, partKey)}
            />
            {Editor && <Editor content={partContent} answerKey={partKey} onChange={(c, k) => setPart(id, { id, type, prompt, ...c }, k)} />}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          const id = nextId('p', parts.map((x) => x.id));
          const d = defaultsFor('tbs_numeric');
          onChange({ ...content, parts: [...parts, { id, type: 'tbs_numeric', prompt: '', ...d.content }] }, { parts: { ...keys, [id]: { type: 'tbs_numeric', key: d.answerKey } } });
        }}
        className="inline-flex h-10 items-center gap-1.5 self-start text-sm font-bold text-brand"
      >
        <Plus aria-hidden className="size-3.5" strokeWidth={2.6} />
        Add part
      </button>
    </div>
  );
}

export function editorFor(type: QuestionType): ((p: EditorProps) => JSX.Element) | null {
  switch (type) {
    case 'mcq':
      return McqEditor;
    case 'tbs_journal_entry':
      return JournalEntryEditor;
    case 'tbs_numeric':
      return NumericEditor;
    case 'tbs_dropdown':
      return DropdownEditor;
    case 'tbs_document_review':
      return DocumentReviewEditor;
    case 'tbs_drag_drop':
      return DragDropEditor;
    case 'tbs_research':
      return ResearchEditor;
    case 'cbq':
      return CbqEditor;
  }
}
