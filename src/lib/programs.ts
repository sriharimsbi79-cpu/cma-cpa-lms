import type { CatalogCourse } from './types';

/** Programs whose courses are subjects shown inside a program page (Program → Subject → Chapters). */
export const SKILLS_SLUG = 'technical-skills';

export interface ProgramSummary {
  id: string;
  slug: string;
  name: string;
  short: string;
  position: number;
  subjects: CatalogCourse[];
  enrolledCount: number;
  chaptersDone: number;
  chaptersTotal: number;
  progress: number;
  /** Earliest validity among enrolled subjects. */
  validUntil: string | null;
  daysLeft: number | null;
}

export function summarizePrograms(catalog: CatalogCourse[]): ProgramSummary[] {
  const map = new Map<string, ProgramSummary>();
  for (const c of catalog) {
    if (!map.has(c.programId)) {
      map.set(c.programId, {
        id: c.programId,
        slug: c.programSlug,
        name: c.programName,
        short: c.programShort,
        position: c.programPosition,
        subjects: [],
        enrolledCount: 0,
        chaptersDone: 0,
        chaptersTotal: 0,
        progress: 0,
        validUntil: null,
        daysLeft: null,
      });
    }
    map.get(c.programId)!.subjects.push(c);
  }
  for (const p of map.values()) {
    const mine = p.subjects.filter((s) => s.enrolled);
    p.enrolledCount = mine.length;
    p.chaptersDone = mine.reduce((a, s) => a + s.chaptersDone, 0);
    p.chaptersTotal = mine.reduce((a, s) => a + s.chaptersTotal, 0);
    p.progress = p.chaptersTotal ? Math.round((100 * p.chaptersDone) / p.chaptersTotal) : 0;
    const first = mine.filter((s) => s.validUntil).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];
    p.validUntil = first?.validUntil ?? null;
    p.daysLeft = first?.daysLeft ?? null;
  }
  return [...map.values()].sort((a, b) => a.position - b.position);
}

export const programHref = (slug: string) => `/programs/${slug}`;

/** Where "back" goes from a subject: its program page, or the course list for skills. */
export function parentHref(c: Pick<CatalogCourse, 'programSlug'>) {
  return c.programSlug === SKILLS_SLUG ? '/courses' : programHref(c.programSlug);
}
