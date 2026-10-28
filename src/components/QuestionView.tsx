// How a question looks to a student. Used by "Preview as student" in the
// question builder, and ready to reuse in the exam screen.
import { useState } from 'react';
import { FileText } from 'lucide-react';
import type { QuestionType } from '@/lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

function Answer({ type, content, idPrefix }: { type: QuestionType; content: Json; idPrefix: string }) {
  const [v, setV] = useState<Json>({});
  switch (type) {
    case 'mcq':
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Choose one answer</legend>
          {(content.options ?? []).map((o: Json) => (
            <label key={o.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10">
              <input type="radio" name={`${idPrefix}-mcq`} className="size-[18px] accent-brand" checked={v.sel === o.id} onChange={() => setV({ sel: o.id })} />
              <span className="font-bold text-ink-3">{o.id.toUpperCase()}</span>
              {o.text || <span className="text-ink-3">(empty option)</span>}
            </label>
          ))}
        </fieldset>
      );
    case 'tbs_journal_entry':
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
              {Array.from({ length: Number(content.rows) || 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <select aria-label={`Account, row ${i + 1}`} className="field">
                      <option value="">Choose account</option>
                      {(content.accounts ?? []).map((a: string) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input aria-label={`Debit, row ${i + 1}`} inputMode="decimal" className="field text-right" />
                  </td>
                  <td className="px-2 py-1">
                    <input aria-label={`Credit, row ${i + 1}`} inputMode="decimal" className="field text-right" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'tbs_numeric':
      return (
        <div className="flex flex-col gap-2.5">
          {(content.cells ?? []).map((c: Json) => (
            <label key={c.id} className="grid grid-cols-[1fr_160px] items-center gap-3 text-sm">
              <span className="font-semibold">{c.label || c.id}</span>
              <input inputMode="decimal" className="field text-right" />
            </label>
          ))}
        </div>
      );
    case 'tbs_dropdown':
    case 'tbs_document_review': {
      const list = type === 'tbs_dropdown' ? content.blanks : content.spans;
      return (
        <div className="flex flex-col gap-2.5">
          {(list ?? []).map((b: Json) => (
            <label key={b.id} className="flex flex-col gap-1.5 text-sm">
              {type === 'tbs_dropdown' ? (
                <span className="font-semibold">{b.label || b.id}</span>
              ) : (
                <span className="self-start rounded bg-[#FFF3B0] px-1.5 py-0.5">{b.text || b.id}</span>
              )}
              <select className="field">
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
            <label key={it.id} className="grid grid-cols-[1fr_200px] items-center gap-3 text-sm">
              <span className="rounded-lg bg-mist px-3 py-2 font-semibold">{it.text || it.id}</span>
              <select className="field">
                <option value="">Drop into…</option>
                {(content.targets ?? []).map((t: Json) => (
                  <option key={t.id}>{t.text || t.id}</option>
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
            <input className="field max-w-xs font-mono" placeholder="e.g. 842-10-25-2" />
          </label>
        </div>
      );
    case 'cbq':
      return (
        <ol className="flex flex-col gap-5">
          {(content.parts ?? []).map((p: Json, i: number) => {
            const { id, type: t, prompt, ...rest } = p;
            return (
              <li key={id} className="flex flex-col gap-2.5 rounded-xl border border-line p-4">
                <p className="text-sm font-bold">
                  Part {i + 1}. <span className="font-semibold">{prompt || '(question text)'}</span>
                </p>
                <Answer type={t} content={rest} idPrefix={`${idPrefix}-${id}`} />
              </li>
            );
          })}
        </ol>
      );
  }
}

export default function QuestionView({
  type,
  stem,
  content,
  exhibits,
}: {
  type: QuestionType;
  stem: string;
  content: Json;
  exhibits: { id: string; title: string }[];
}) {
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
      <p className="whitespace-pre-line text-sm leading-relaxed">{stem || <span className="text-ink-3">(No question text yet)</span>}</p>
      <Answer type={type} content={content} idPrefix="pv" />
    </div>
  );
}
