// Same scoring rules as public.grade_response in the database, so the exam
// screen and result page can show scores before the database is connected.
import type { QuestionType } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

const toNum = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[,\s$₹]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

/** True when the student has entered anything at all. */
export function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (typeof v === 'number') return true;
  if (Array.isArray(v)) return v.some(hasValue);
  if (typeof v === 'object') return Object.values(v as Json).some(hasValue);
  return false;
}

/** Score from 0 to 1. */
export function gradeResponse(type: QuestionType, key: Json | null | undefined, response: Json | null | undefined): number {
  if (!key || !response) return 0;
  let total = 0;
  let ok = 0;
  switch (type) {
    case 'mcq':
      return response.selected && response.selected === key.correct ? 1 : 0;
    case 'tbs_numeric':
      for (const [id, k] of Object.entries<Json>(key.answers ?? {})) {
        total++;
        const given = response.answers?.[id];
        if (hasValue(given) && Math.abs(toNum(given) - toNum(k.value)) <= (toNum(k.tolerance) || 0)) ok++;
      }
      break;
    case 'tbs_dropdown':
    case 'tbs_drag_drop':
    case 'tbs_document_review':
      for (const [id, k] of Object.entries(key.answers ?? {})) {
        total++;
        if (hasValue(response.answers?.[id]) && norm(response.answers[id]) === norm(k)) ok++;
      }
      break;
    case 'tbs_journal_entry': {
      const lines: Json[] = Array.isArray(response.lines) ? response.lines : [];
      const used = new Set<number>();
      for (const line of key.lines ?? []) {
        total++;
        const i = lines.findIndex(
          (r, idx) =>
            !used.has(idx) &&
            norm(r.account) === norm(line.account) &&
            Math.abs((toNum(r.debit) || 0) - (toNum(line.debit) || 0)) < 0.5 &&
            Math.abs((toNum(r.credit) || 0) - (toNum(line.credit) || 0)) < 0.5,
        );
        if (i >= 0) {
          used.add(i);
          ok++;
        }
      }
      // extra wrong lines lower the score
      total = Math.max(total, lines.filter((l) => hasValue(l.account)).length);
      break;
    }
    case 'tbs_research': {
      const clean = (s: unknown) => norm(s).replace(/[^0-9a-z]/g, '');
      const given = clean(response.citation);
      return given && (key.citations ?? []).some((c: string) => clean(c) === given) ? 1 : 0;
    }
    case 'cbq': {
      const parts = Object.entries<Json>(key.parts ?? {});
      if (!parts.length) return 0;
      const sum = parts.reduce((a, [id, p]) => a + gradeResponse(p.type, p.key, response.parts?.[id]), 0);
      return Math.round((sum / parts.length) * 10000) / 10000;
    }
  }
  return total === 0 ? 0 : Math.round((ok / total) * 10000) / 10000;
}
