import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Calculator, ChevronLeft, Clock, Flag, Save, Table2 } from 'lucide-react';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui';
import { useTestInfo } from '@/lib/api';
import { durationLabel } from '@/lib/format';

const KIND_LABEL = { chapter_test: 'Chapter test', full_mock: 'Full-length mock', practice_set: 'Practice set' } as const;

function hasSavedProgress(testId: string | undefined) {
  try {
    return !!testId && !!localStorage.getItem(`lms_exam_${testId}`);
  } catch {
    return false;
  }
}

/** Test start page. "Start test" opens the full-screen exam screen. */
export default function TestIntro() {
  const { testId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: t, isLoading, error, refetch } = useTestInfo(testId);
  const reviewing = !!params.get('attempt');
  const inProgress = hasSavedProgress(testId);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!t) return <EmptyState title="Test not found" text="It may not be published yet." action={<Link to="/mock-tests" className="btn-primary">Mock tests</Link>} />;

  const back = t.chapterId ? `/chapters/${t.chapterId}` : '/mock-tests';
  const rules = [
    { icon: Clock, text: `${durationLabel(t.durationMinutes)}. The timer starts when you press Start and keeps running if you close the page.` },
    { icon: Save, text: 'Answers save automatically as you go.' },
    { icon: Flag, text: 'Flag questions to come back to them before you submit.' },
    { icon: Calculator, text: 'A calculator is available on every question.' },
    { icon: Table2, text: 'Task-based and case-based questions include a spreadsheet and exhibits.' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Link to={back} className="inline-flex h-11 items-center gap-1 self-start text-sm font-bold text-ink-2">
        <ChevronLeft aria-hidden className="size-[18px]" />
        Back
      </Link>
      <section className="card flex flex-col gap-5 p-6 lg:p-8">
        <div>
          <p className="text-sm font-semibold text-ink-3">
            {t.courseLabel} · {KIND_LABEL[t.kind]}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight lg:text-[28px]">{t.title}</h1>
          {t.description && <p className="mt-2 text-sm text-ink-2">{t.description}</p>}
        </div>
        <ul className="flex flex-col gap-3">
          {rules.map((r) => (
            <li key={r.text} className="flex items-start gap-3 text-sm text-ink-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-mist text-ink">
                <r.icon aria-hidden className="size-4" />
              </span>
              <span className="pt-2">{r.text}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          {reviewing && (
            <Link to={`/results/${params.get('attempt')}`} className="btn-secondary h-12 flex-1 rounded-xl text-[15px]">
              Review last answers
            </Link>
          )}
          <button type="button" className="btn-primary h-12 flex-1 rounded-xl text-[15px]" onClick={() => navigate(`/tests/${t.id}/attempt`)}>
            {inProgress ? 'Continue test' : reviewing ? 'Retake test' : 'Start test'}
          </button>
        </div>
      </section>
    </div>
  );
}
