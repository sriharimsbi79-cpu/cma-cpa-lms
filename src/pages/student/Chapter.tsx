import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, Check, ChevronLeft, ChevronRight, ClipboardList, FileText, MessageCircle, Play } from 'lucide-react';
import { useToast } from '@/components/Toast';
import VideoPlayer from '@/components/VideoPlayer';
import { EmptyState, ErrorState, Modal, PageLoader, ProgressBar } from '@/components/ui';
import { useAskDoubt, useCatalog, useChapter, useMarkVideo, useOpenEbook, useSaveNote } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { clock, cx, plural } from '@/lib/format';
import { parentHref } from '@/lib/programs';
import { isDemo } from '@/lib/supabase';
import type { ChapterDetail, VideoItem } from '@/lib/types';

type Tab = 'videos' | 'ebook' | 'test';

const PLAYER_NOTE = isDemo
  ? 'Demo mode: videos play here once the video service (VdoCipher) is connected.'
  : 'The video player connects here once the video service (VdoCipher) is set up.';

function VideoList({ ch, current, onPick, compact }: { ch: ChapterDetail; current: VideoItem; onPick: (v: VideoItem) => void; compact?: boolean }) {
  return (
    <ol aria-label="Videos in this chapter" className="flex flex-col gap-0.5">
      {ch.videos.map((v) => {
        const on = v.id === current.id;
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onPick(v)}
              aria-current={on ? 'true' : undefined}
              className={cx(
                'flex min-h-11 w-full items-center gap-3 rounded-[10px] text-left text-sm',
                compact ? 'p-2.5' : 'px-2.5 py-2',
                on ? 'bg-brand/10 font-bold text-brand' : 'hover:bg-mist-4',
              )}
            >
              {on ? (
                <span aria-label="Now playing" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <Play aria-hidden className="ml-0.5 size-2.5 fill-current" />
                </span>
              ) : v.completed ? (
                <span aria-label="Watched" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ok-bg text-ok-fg">
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                </span>
              ) : (
                <span aria-label="Not watched" className="size-[22px] shrink-0 rounded-full border border-line-dash" />
              )}
              <span className="min-w-0 flex-1">{v.title}</span>
              <span className={cx('text-xs', on ? '' : 'text-ink-3')}>{clock(v.durationSeconds)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function Chapter() {
  const { chapterId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { me } = useAuth();
  const { data: ch, isLoading, error, refetch } = useChapter(chapterId);
  const { data: catalog } = useCatalog();
  const course = catalog?.find((c) => c.courseId === ch?.courseId);
  const markVideo = useMarkVideo();
  const openEbook = useOpenEbook();
  const saveNote = useSaveNote();
  const askDoubt = useAskDoubt();
  const [tab, setTab] = useState<Tab>('videos');
  const [note, setNote] = useState('');
  const [doubtOpen, setDoubtOpen] = useState(false);
  const [doubt, setDoubt] = useState('');
  const [doubtError, setDoubtError] = useState('');

  const current = useMemo(() => {
    if (!ch || ch.videos.length === 0) return null;
    const wanted = params.get('v');
    return ch.videos.find((v) => v.id === wanted) ?? ch.videos.find((v) => !v.completed) ?? ch.videos[0];
  }, [ch, params]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!ch) return <EmptyState title="Chapter not found" action={<Link to="/courses" className="btn-primary">All courses</Link>} />;

  const idx = current ? ch.videos.findIndex((v) => v.id === current.id) : -1;
  const next = idx >= 0 ? ch.videos[idx + 1] : undefined;
  const pick = (v: VideoItem) => {
    setParams({ v: v.id }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const watermark = [me?.email, me?.phone].filter(Boolean).join(' · ');

  const goNext = () => {
    if (next) pick(next);
    else setTab('ebook');
  };
  const markComplete = () => {
    if (!current) return;
    const d = current.durationSeconds ?? 0;
    markVideo.mutate(
      { videoId: current.id, position: d, watched: d, complete: true },
      { onSuccess: () => toast.show('Marked as complete'), onError: toast.error },
    );
  };
  const doOpenEbook = () => {
    if (!ch.ebook) return;
    openEbook.mutate(ch.ebook, {
      onSuccess: (url) => {
        if (url) window.open(url, '_blank', 'noopener');
      },
      onError: toast.error,
    });
  };
  const startTest = () => ch.test && navigate(`/tests/${ch.test.id}`);
  const submitDoubt = () => {
    if (!doubt.trim()) {
      setDoubtError('Type your question first');
      return;
    }
    askDoubt.mutate(
      { chapterId: ch.id, videoId: current?.id ?? null, atSeconds: current?.lastPosition ?? null, question: doubt.trim() },
      {
        onSuccess: () => {
          toast.show('Your doubt was sent to faculty');
          setDoubt('');
          setDoubtOpen(false);
        },
        onError: (e) => {
          toast.error(e);
          setDoubtOpen(false);
        },
      },
    );
  };

  const steps: { key: Tab; n: number; label: string; sub: string; icon: typeof Play }[] = [
    { key: 'videos', n: 1, label: 'Videos', sub: `${ch.videosDone} of ${ch.videosTotal} watched`, icon: Play },
    {
      key: 'ebook',
      n: 2,
      label: 'eBook',
      sub: ch.ebook ? `${ch.ebook.pageCount ?? '—'} pages · ${ch.ebook.completed ? 'read' : 'not started'}` : 'Not added yet',
      icon: FileText,
    },
    {
      key: 'test',
      n: 3,
      label: 'Chapter test',
      sub: ch.test
        ? `${ch.test.format || plural(ch.test.questionCount, 'question')} · ${ch.test.attempts > 0 ? `best ${Math.round(ch.test.bestPercent ?? 0)}%` : 'not attempted'}`
        : 'Not added yet',
      icon: ClipboardList,
    },
  ];
  const cta =
    tab === 'videos'
      ? { label: next ? 'Next video' : 'Go to eBook', run: goNext, disabled: false }
      : tab === 'ebook'
        ? { label: 'Open eBook', run: doOpenEbook, disabled: !ch.ebook }
        : { label: 'Start test', run: startTest, disabled: !ch.test };

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* phone header */}
      <div className="sticky top-0 z-20 -mx-4 -mt-5 grid grid-cols-[44px_minmax(0,1fr)_56px] items-center gap-2 bg-page px-2 py-2 sm:-mx-6 lg:hidden">
        <Link to={`/courses/${ch.courseId}`} aria-label="Back to chapters" className="flex size-11 items-center justify-center rounded-xl">
          <ChevronLeft aria-hidden className="size-[22px]" />
        </Link>
        <div className="min-w-0 text-center">
          <p className="truncate text-xs text-ink-3">{ch.courseLabel}</p>
          <p className="truncate text-[15px] font-bold leading-tight">
            Chapter {ch.position} · {ch.title}
          </p>
        </div>
        <span className="justify-self-end rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">{ch.progress}%</span>
      </div>

      <nav aria-label="Breadcrumb" className="hidden text-sm text-ink-3 lg:block">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/" className="hover:text-ink">Home</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/courses" className="hover:text-ink">Courses</Link>
          </li>
          {course && course.kind !== 'skill' && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link to={parentHref(course)} className="hover:text-ink">{course.programName}</Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li>
            <Link to={`/courses/${ch.courseId}`} className="hover:text-ink">{course?.name ?? ch.courseLabel}</Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-semibold text-ink">Chapter {ch.position}</li>
        </ol>
      </nav>

      <div className="hidden flex-wrap items-end justify-between gap-4 lg:flex">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
          Chapter {ch.position} · {ch.title}
        </h1>
        <div className="flex flex-[0_1_260px] flex-col gap-1.5">
          <div className="flex justify-between text-[13px] text-ink-3">
            <span>Chapter progress</span>
            <span className="font-extrabold text-ink">{ch.progress}%</span>
          </div>
          <ProgressBar value={ch.progress} label="Chapter progress" trackClassName="bg-line" />
        </div>
      </div>

      <nav aria-label="Chapter steps" className="hidden grid-cols-3 gap-3 lg:grid">
        {steps.map((s) => {
          const on = tab === s.key;
          return (
            <button
              key={s.key}
              type="button"
              aria-current={on ? 'step' : undefined}
              onClick={() => {
                setTab(s.key);
                if (s.key !== 'videos') document.getElementById(s.key === 'ebook' ? 'ebook' : 'chapter-test')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={cx('flex items-center gap-3.5 rounded-2xl bg-white text-left', on ? 'border-2 border-brand px-[15px] py-[13px]' : 'border border-line px-4 py-3.5')}
            >
              <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold', on ? 'bg-brand text-white' : 'bg-mist text-ink-2')}>
                {s.n}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-bold">{s.label}</span>
                <span className="truncate text-[13px] text-ink-3">{s.sub}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-start gap-4 lg:gap-6">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 lg:gap-5">
          {current ? (
            <div className="-mx-4 sm:-mx-6 lg:mx-0">
              <VideoPlayer video={current} watermark={watermark} onPlay={() => toast.show(PLAYER_NOTE, 'info')} />
            </div>
          ) : (
            <p className="card p-6 text-sm text-ink-3">Videos for this chapter are not published yet.</p>
          )}

          {current && (
            <div className="flex flex-wrap items-start justify-between gap-3 lg:gap-4">
              <div className="min-w-0 flex-[1_1_300px]">
                <p className="text-xs font-semibold text-ink-3 lg:text-[13px]">
                  Video {idx + 1} of {ch.videos.length}
                  <span className="lg:hidden">{current.durationSeconds ? ` · ${Math.round(current.durationSeconds / 60)} min` : ''}</span>
                </p>
                <h2 className="mt-0.5 text-[19px] font-extrabold leading-tight lg:mt-1 lg:text-[22px]">{current.title}</h2>
                {current.durationSeconds ? (
                  <p className="mt-1.5 hidden text-sm text-ink-3 lg:block">{Math.round(current.durationSeconds / 60)} min</p>
                ) : null}
              </div>
              <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-wrap lg:gap-2.5">
                <button type="button" onClick={() => setDoubtOpen(true)} className="btn-secondary px-3 text-[13px] lg:px-4 lg:text-sm">
                  <MessageCircle aria-hidden className="size-4" />
                  Ask a doubt
                </button>
                <button type="button" onClick={markComplete} disabled={markVideo.isPending || current.completed} className="btn-secondary px-3 text-[13px] lg:px-4 lg:text-sm">
                  <Check aria-hidden className="size-4" strokeWidth={2.4} />
                  {current.completed ? 'Completed' : <><span className="lg:hidden">Mark complete</span><span className="hidden lg:inline">Mark as complete</span></>}
                </button>
                <button type="button" onClick={goNext} className="btn-primary hidden lg:inline-flex">
                  {next ? 'Next video' : 'Go to eBook'}
                  <ChevronRight aria-hidden className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* phone tabs */}
          <div role="group" aria-label="Chapter steps" className="grid grid-cols-3 gap-1 rounded-[14px] bg-mist-2 p-1 lg:hidden">
            {steps.map((s) => {
              const on = tab === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTab(s.key)}
                  className={cx('flex h-12 flex-col items-center justify-center rounded-[11px] leading-tight', on ? 'bg-white text-ink' : 'text-ink-2')}
                >
                  <span className="text-sm font-bold">{s.key === 'test' ? 'Test' : s.label}</span>
                  <span className="text-xs text-ink-3">
                    {s.key === 'videos'
                      ? `${ch.videosDone} of ${ch.videosTotal}`
                      : s.key === 'ebook'
                        ? `${ch.ebook?.pageCount ?? '—'} pages`
                        : plural(ch.test?.questionCount ?? 0, 'question')}
                  </span>
                </button>
              );
            })}
          </div>

          {current && (
            <section className="card hidden flex-col gap-2.5 rounded-2xl p-5 lg:flex">
              <label htmlFor="lesson-notes" className="text-[15px] font-bold">
                My notes for this video
              </label>
              <textarea
                id="lesson-notes"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={`Type a note. It is saved with the video time (${clock(current.lastPosition)}).`}
                className="resize-y rounded-[10px] border border-line-strong px-3.5 py-3 text-sm"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn-dark"
                  disabled={saveNote.isPending}
                  onClick={() => {
                    if (!note.trim()) return toast.show('Type a note first', 'info');
                    saveNote.mutate(
                      { videoId: current.id, atSeconds: current.lastPosition, body: note.trim() },
                      { onSuccess: () => { toast.show('Note saved'); setNote(''); }, onError: toast.error },
                    );
                  }}
                >
                  Save note
                </button>
              </div>
            </section>
          )}
        </div>

        <aside aria-label="Chapter contents" className="flex w-full min-w-0 flex-col gap-4 lg:card lg:w-auto lg:flex-[1_1_320px] lg:p-5">
          <h2 className="hidden text-base font-extrabold lg:block">Chapter {ch.position} contents</h2>

          <section className={cx(tab !== 'videos' && 'hidden lg:block')}>
            <h3 className="mb-1.5 hidden text-[13px] font-bold text-ink-3 lg:block">
              Videos · {ch.videosDone} of {ch.videosTotal} watched
            </h3>
            {current ? (
              <div className="rounded-2xl border border-line bg-white p-1 lg:border-0 lg:p-0">
                <VideoList ch={ch} current={current} onPick={pick} />
              </div>
            ) : (
              <p className="text-sm text-ink-3">No videos yet.</p>
            )}
          </section>

          <section id="ebook" className={cx('lg:border-t lg:border-line-soft lg:pt-4', tab !== 'ebook' && 'hidden lg:block')}>
            <h3 className="mb-2 hidden text-[13px] font-bold text-ink-3 lg:block">eBook</h3>
            {ch.ebook ? (
              <>
                <button type="button" onClick={doOpenEbook} className="hidden min-h-11 w-full items-center gap-3 rounded-[10px] p-2.5 text-left hover:bg-mist-4 lg:flex">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-mist text-ink-2">
                    <FileText aria-hidden className="size-[18px]" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-bold">{ch.ebook.title}</span>
                    <span className="text-xs text-ink-3">{ch.ebook.pageCount ?? '—'} pages · opens in the reader</span>
                  </span>
                  <span className="text-sm font-bold text-brand">Read</span>
                </button>
                <div className="card flex flex-col gap-3.5 rounded-2xl p-[18px] lg:hidden">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-16 w-[52px] shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                      <BookOpen aria-hidden className="size-[22px]" />
                    </span>
                    <div>
                      <p className="text-base font-extrabold">{ch.ebook.title}</p>
                      <p className="mt-0.5 text-[13px] text-ink-3">
                        {ch.ebook.pageCount ?? '—'} pages · {ch.ebook.completed ? 'read' : ch.ebook.lastPage > 1 ? `page ${ch.ebook.lastPage}` : 'not started'}
                      </p>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-2 text-[13px] text-ink-2">
                    {['Highlight, bookmark and add notes', 'Remembers the last page you read', 'Read in the app only, no download'].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <Check aria-hidden className="size-3.5 text-ok-fg" strokeWidth={2.6} />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-3">The eBook for this chapter is not added yet.</p>
            )}
          </section>

          <section id="chapter-test" className={cx('lg:border-t lg:border-line-soft lg:pt-4', tab !== 'test' && 'hidden lg:block')}>
            <h3 className="mb-2 hidden text-[13px] font-bold text-ink-3 lg:block">Chapter test</h3>
            {ch.test ? (
              <>
                <button type="button" onClick={startTest} className="hidden min-h-11 w-full items-center gap-3 rounded-[10px] p-2.5 text-left hover:bg-mist-4 lg:flex">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-mist text-ink-2">
                    <ClipboardList aria-hidden className="size-[18px]" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-bold">{ch.test.title}</span>
                    <span className="text-xs text-ink-3">
                      {ch.test.format || plural(ch.test.questionCount, 'question')} · {ch.test.durationMinutes} min
                    </span>
                  </span>
                  <span className="text-sm font-bold text-brand">{ch.test.attempts > 0 ? 'Retake' : 'Start'}</span>
                </button>
                <div className="card flex flex-col gap-3.5 rounded-2xl p-[18px] lg:hidden">
                  <div>
                    <p className="text-base font-extrabold">{ch.test.title}</p>
                    <p className="mt-0.5 text-[13px] text-ink-3">
                      {ch.test.attempts > 0 ? `Best score ${Math.round(ch.test.bestPercent ?? 0)}% · ${plural(ch.test.attempts, 'attempt')}` : 'Not attempted yet'}
                    </p>
                  </div>
                  <dl className="grid grid-cols-3 gap-2">
                    {[
                      ['Questions', ch.test.format || String(ch.test.questionCount)],
                      ['Time', `${ch.test.durationMinutes} min`],
                      ['Retakes', ch.test.maxAttempts ? `${ch.test.maxAttempts} max` : 'Anytime'],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-page p-2.5">
                        <dt className="text-xs text-ink-3">{k}</dt>
                        <dd className="mt-0.5 text-sm font-extrabold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-[13px] text-ink-2">You can take the test before finishing the videos. Your score updates your focus areas on Home.</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-3">The chapter test is not added yet.</p>
            )}
          </section>
        </aside>
      </div>

      {/* phone bottom action */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 pb-safe pt-2.5 lg:hidden">
        <button type="button" onClick={cta.run} disabled={cta.disabled} className="btn-primary mb-2.5 h-12 w-full rounded-xl text-[15px]">
          {cta.label}
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>

      <Modal
        open={doubtOpen}
        onClose={() => setDoubtOpen(false)}
        title="Ask a doubt"
        description={current ? `About ${current.title} at ${clock(current.lastPosition)}` : undefined}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDoubtOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={submitDoubt} disabled={askDoubt.isPending}>
              Send to faculty
            </button>
          </>
        }
      >
        <label htmlFor="doubt" className="field-label">
          Your question
        </label>
        <textarea
          id="doubt"
          rows={5}
          value={doubt}
          onChange={(e) => {
            setDoubt(e.target.value);
            setDoubtError('');
          }}
          aria-invalid={!!doubtError}
          aria-describedby={doubtError ? 'doubt-err' : undefined}
          className="mt-1 w-full resize-y rounded-[10px] border border-line-strong px-3.5 py-3 text-sm"
          placeholder="Explain what is not clear. Faculty will reply here and by notification."
        />
        {doubtError && (
          <p id="doubt-err" className="mt-1 text-[13px] font-semibold text-warn-text">
            {doubtError}
          </p>
        )}
      </Modal>
    </div>
  );
}
