import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Eye, GripVertical, Pencil, Plus, Upload } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { EmptyState, ErrorState, Field, Modal, PageLoader, Pill, Skeleton } from '@/components/ui';
import {
  useAddChapter,
  useAddCourse,
  useAdminChapter,
  useCourseTree,
  useReorderVideos,
  useSaveChapter,
  useSaveTestSettings,
  useUpdateEbook,
  useUpdateVideo,
  useUploadEbook,
} from '@/lib/api';
import { clock, cx, formatDate } from '@/lib/format';
import { isDemo } from '@/lib/supabase';
import type { AdminChapter, AdminVideo, TreeProgram } from '@/lib/types';

const VIDEO_NOTE =
  'Video uploads go to the DRM video service (VdoCipher). Connect it with a Supabase Edge Function, then uploads appear here with their processing status.';

function bytes(n: number | null) {
  if (!n) return '';
  return n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} KB`;
}

// ---------------------------------------------------------------- tree
function CourseTree({ tree, selected, onSelect }: { tree: TreeProgram[]; selected: string | null; onSelect: (id: string) => void }) {
  const toast = useToast();
  const addChapter = useAddChapter();
  const selectedCourse = tree.flatMap((p) => p.courses).find((c) => c.chapters.some((ch) => ch.id === selected));
  const [openPrograms, setOpenPrograms] = useState<Record<string, boolean>>({});
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({});
  const isOpenP = (id: string, i: number) => openPrograms[id] ?? (selectedCourse ? tree.find((p) => p.id === id)?.courses.some((c) => c.id === selectedCourse.id) : i === 0);
  const isOpenC = (id: string, j: number, pi: number) => openCourses[id] ?? (selectedCourse ? selectedCourse.id === id : pi === 0 && j === 0);

  return (
    <ul className="flex flex-col gap-0.5 text-sm">
      {tree.map((p, i) => {
        const po = !!isOpenP(p.id, i);
        return (
          <li key={p.id} className={cx(i > 0 && 'mt-1.5 border-t border-line-soft pt-1.5')}>
            <button
              type="button"
              aria-expanded={po}
              onClick={() => setOpenPrograms({ ...openPrograms, [p.id]: !po })}
              className="flex min-h-11 w-full items-center gap-2 rounded-[10px] px-2 text-left font-extrabold hover:bg-mist-4"
            >
              {po ? <ChevronDown aria-hidden className="size-4 shrink-0" /> : <ChevronRight aria-hidden className="size-4 shrink-0" />}
              <span className="whitespace-nowrap">{p.name}</span>
              {!po && (
                <span className="ml-auto truncate text-xs font-semibold text-ink-3">
                  {p.courses.length > 2 ? p.courses.map((c) => c.code).join(' · ') : `${p.courses.length} courses`}
                </span>
              )}
            </button>
            {po && (
              <ul className="flex flex-col gap-0.5 pl-4">
                {p.courses.map((c, j) => {
                  const co = !!isOpenC(c.id, j, i);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        aria-expanded={co}
                        onClick={() => setOpenCourses({ ...openCourses, [c.id]: !co })}
                        className="flex min-h-11 w-full items-center gap-2 rounded-[10px] px-2 text-left font-bold hover:bg-mist-4"
                      >
                        {co ? <ChevronDown aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
                        {c.name}
                        {!c.isPublished && <Pill className="ml-auto">Hidden</Pill>}
                      </button>
                      {co && (
                        <ul className="flex flex-col gap-0.5 pl-6">
                          {c.chapters.map((ch) => {
                            const on = ch.id === selected;
                            return (
                              <li key={ch.id}>
                                <button
                                  type="button"
                                  aria-current={on ? 'page' : undefined}
                                  onClick={() => onSelect(ch.id)}
                                  className={cx(
                                    'flex min-h-10 w-full items-center justify-between gap-2 rounded-[10px] px-2.5 text-left',
                                    on ? 'bg-brand/10 font-bold text-brand' : 'text-ink-2 hover:bg-mist-4',
                                  )}
                                >
                                  <span className="min-w-0">
                                    {c.kind === 'skill' ? 'M' : 'Ch'} {ch.position} · {ch.title}
                                  </span>
                                  {ch.videosProcessing > 0 ? (
                                    <span className="shrink-0 rounded-md bg-warn-bg px-1.5 py-px text-[11px] font-bold text-warn-fg">{ch.videosProcessing} processing</span>
                                  ) : !ch.isPublished ? (
                                    <span className="shrink-0 rounded-md bg-mist px-1.5 py-px text-[11px] font-bold text-ink-2">Draft</span>
                                  ) : null}
                                </button>
                              </li>
                            );
                          })}
                          <li>
                            <button
                              type="button"
                              disabled={addChapter.isPending}
                              onClick={() =>
                                addChapter.mutate(
                                  { courseId: c.id, position: (c.chapters[c.chapters.length - 1]?.position ?? 0) + 1 },
                                  {
                                    onSuccess: (id) => {
                                      toast.show('Chapter added. Give it a title.');
                                      onSelect(id);
                                    },
                                    onError: toast.error,
                                  },
                                )
                              }
                              className="flex min-h-10 items-center gap-1.5 px-2.5 text-[13px] font-bold text-brand"
                            >
                              <Plus aria-hidden className="size-3.5" strokeWidth={2.6} />
                              Add {c.kind === 'skill' ? 'module' : 'chapter'}
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- videos
function VideoRow({ v, onEdit, dragProps }: { v: AdminVideo; onEdit: () => void; dragProps: Record<string, unknown> }) {
  const processing = v.status === 'processing' || v.status === 'uploading';
  return (
    <li {...dragProps} className="flex items-center gap-3 border-t border-line-soft py-2 first:border-t-0">
      <GripVertical aria-hidden className="hidden size-4 shrink-0 cursor-grab text-navy-dim sm:block" />
      <span className={cx('hidden h-9 w-16 shrink-0 rounded-md sm:block', processing ? 'bg-mist-2' : 'bg-navy')} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-semibold">{v.title}</span>
        {processing && (
          <span className="block h-1 w-40 max-w-full overflow-hidden rounded-full bg-mist-3">
            <span className="block h-full bg-brand" style={{ width: `${v.processingPercent}%` }} />
          </span>
        )}
      </span>
      <span className="hidden w-12 text-[13px] text-ink-3 sm:block">{v.durationSeconds ? clock(v.durationSeconds) : '—'}</span>
      {processing ? (
        <Pill tone="ending">Processing {v.processingPercent}%</Pill>
      ) : v.status === 'failed' ? (
        <Pill tone="ending">Failed</Pill>
      ) : v.isPublished ? (
        <Pill tone="active">Published</Pill>
      ) : (
        <Pill>Hidden</Pill>
      )}
      <button type="button" aria-label={`Edit ${v.title}`} onClick={onEdit} className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-mist">
        <Pencil aria-hidden className="size-4" />
      </button>
    </li>
  );
}

function VideosSection({ ch }: { ch: AdminChapter }) {
  const toast = useToast();
  const reorder = useReorderVideos();
  const updateVideo = useUpdateVideo();
  const [order, setOrder] = useState(ch.videos);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminVideo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPub, setEditPub] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setOrder(ch.videos);
  }, [ch.videos]);

  const published = ch.videos.filter((v) => v.status === 'ready' && v.isPublished).length;
  const processing = ch.videos.filter((v) => v.status === 'processing' || v.status === 'uploading').length;

  const onDrop = (targetId: string) => (e: DragEvent) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.findIndex((v) => v.id === dragId);
    const to = next.findIndex((v) => v.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    setDragId(null);
    reorder.mutate(
      next.map((v) => v.id),
      { onSuccess: () => toast.show('Order saved'), onError: (err) => { toast.error(err); setOrder(ch.videos); } },
    );
  };

  return (
    <section aria-labelledby="vid-h" className="card flex flex-col gap-3.5 p-5 lg:p-6">
      <div>
        <h2 id="vid-h" className="text-lg font-extrabold">
          Step 1 · Videos
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-3">
          {published} published{processing ? `, ${processing} processing` : ''} · drag rows to change the order
        </p>
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) toast.show(VIDEO_NOTE, 'info');
        }}
        className="flex flex-wrap items-center justify-center gap-3.5 rounded-[14px] border-2 border-dashed border-line-dash bg-mist-4 p-5 text-center"
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Upload aria-hidden className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-bold">
            Drag video files here, or{' '}
            <button type="button" onClick={() => fileRef.current?.click()} className="font-bold text-brand underline">
              browse
            </button>
          </p>
          <p className="mt-0.5 text-[13px] text-ink-3">MP4 or MOV, up to 4 GB each. DRM and student watermark are added automatically.</p>
        </div>
        <input ref={fileRef} type="file" accept="video/*" multiple className="hidden" onChange={() => toast.show(VIDEO_NOTE, 'info')} />
      </div>
      {order.length === 0 ? (
        <p className="text-sm text-ink-3">No videos in this chapter yet.</p>
      ) : (
        <ol className="flex flex-col">
          {order.map((v) => (
            <VideoRow
              key={v.id}
              v={v}
              onEdit={() => {
                setEditing(v);
                setEditTitle(v.title);
                setEditPub(v.isPublished);
              }}
              dragProps={{
                draggable: true,
                onDragStart: () => setDragId(v.id),
                onDragOver: (e: DragEvent) => e.preventDefault(),
                onDrop: onDrop(v.id),
                className: undefined,
              }}
            />
          ))}
        </ol>
      )}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit video"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={updateVideo.isPending}
              onClick={() =>
                editing &&
                updateVideo.mutate(
                  { id: editing.id, title: editTitle || editing.title, isPublished: editPub },
                  { onSuccess: () => { toast.show('Video saved'); setEditing(null); }, onError: (e) => { toast.error(e); setEditing(null); } },
                )
              }
            >
              Save
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Title" htmlFor="v-title">
            <input id="v-title" className="field" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </Field>
          <label className="flex min-h-11 items-center gap-2.5 text-sm">
            <input type="checkbox" checked={editPub} onChange={(e) => setEditPub(e.target.checked)} className="size-5 accent-brand" />
            Visible to students
          </label>
        </div>
      </Modal>
    </section>
  );
}

// ---------------------------------------------------------------- ebook
function EbookSection({ ch }: { ch: AdminChapter }) {
  const toast = useToast();
  const update = useUpdateEbook();
  const upload = useUploadEbook();
  const fileRef = useRef<HTMLInputElement>(null);
  const e = ch.ebook;
  const [flags, setFlags] = useState({ blockDownload: e?.blockDownload ?? true, watermark: e?.watermark ?? true, allowAnnotations: e?.allowAnnotations ?? true });
  useEffect(() => {
    setFlags({ blockDownload: e?.blockDownload ?? true, watermark: e?.watermark ?? true, allowAnnotations: e?.allowAnnotations ?? true });
  }, [e]);

  const toggle = (k: keyof typeof flags) => (ev: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...flags, [k]: ev.target.checked };
    setFlags(next);
    if (e) update.mutate({ id: e.id, ...next }, { onSuccess: () => toast.show('eBook settings saved'), onError: (err) => { toast.error(err); setFlags(flags); } });
  };

  return (
    <section aria-labelledby="ebook-h" className="card flex flex-col gap-3.5 p-5 lg:p-6">
      <h2 id="ebook-h" className="text-lg font-extrabold">
        Step 2 · eBook
      </h2>
      <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-line p-3.5">
        <span className="flex h-[52px] w-11 shrink-0 items-center justify-center rounded-lg bg-navy text-[11px] font-extrabold text-white">PDF</span>
        <span className="flex min-w-0 flex-[1_1_220px] flex-col">
          <span className="text-sm font-bold [overflow-wrap:anywhere]">{e ? e.title : 'No eBook yet'}</span>
          <span className="text-[13px] text-ink-3">
            {e ? [e.pageCount ? `${e.pageCount} pages` : null, bytes(e.fileSizeBytes), `uploaded ${formatDate(e.createdAt)}`].filter(Boolean).join(' · ') : 'Upload the chapter PDF'}
          </span>
        </span>
        <button type="button" className="btn-secondary" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
          {upload.isPending ? 'Uploading…' : e ? 'Replace file' : 'Upload PDF'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(ev) => {
            const file = ev.target.files?.[0];
            ev.target.value = '';
            if (!file) return;
            upload.mutate({ chapterId: ch.id, courseId: ch.courseId, ebookId: e?.id ?? null, file, fileName: file.name }, { onSuccess: () => toast.show('eBook uploaded'), onError: toast.error });
          }}
        />
      </div>
      <div className="flex flex-col">
        {(
          [
            ['blockDownload', 'Block download and printing'],
            ['watermark', "Watermark every page with the student's email and phone"],
            ['allowAnnotations', 'Allow highlights, bookmarks and notes'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex min-h-11 items-center gap-2.5 text-sm">
            <input type="checkbox" checked={flags[k]} onChange={toggle(k)} disabled={!e} className="size-5 shrink-0 accent-brand" />
            {label}
          </label>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- test
function TestSection({ ch }: { ch: AdminChapter }) {
  const toast = useToast();
  const save = useSaveTestSettings();
  const t = ch.test;
  const caseKey = /CMA/.test(ch.courseLabel) ? 'cbq' : /CPA/.test(ch.courseLabel) ? 'tbs' : null;
  const counts = (t?.randomConfig?.counts ?? {}) as Record<string, number>;
  const init = () => ({
    title: t?.title ?? `${ch.title} test`,
    duration: t?.durationMinutes ?? 60,
    retakes: t?.maxAttempts ? String(t.maxAttempts) : '',
    mode: t?.selectionMode ?? 'random',
    mcq: counts.mcq ?? 30,
    cases: caseKey ? Object.entries(counts).filter(([k]) => k !== 'mcq').reduce((a, [, v]) => a + Number(v), 0) || 1 : 0,
    show: t?.showAnswersAfterSubmit ?? true,
  });
  const [f, setF] = useState(init);
  useEffect(() => {
    setF(init());
  }, [t, ch.id]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const randomConfig = f.mode === 'random' ? { counts: { mcq: Number(f.mcq) || 0, ...(caseKey && Number(f.cases) ? { [caseKey]: Number(f.cases) } : {}) } } : {};
    save.mutate(
      {
        testId: t?.id ?? null,
        chapterId: ch.id,
        courseId: ch.courseId,
        title: f.title.trim() || `${ch.title} test`,
        durationMinutes: Number(f.duration),
        maxAttempts: f.retakes ? Number(f.retakes) : null,
        selectionMode: f.mode as 'fixed' | 'random',
        randomConfig,
        showAnswersAfterSubmit: f.show,
      },
      { onSuccess: () => toast.show(t ? 'Test settings saved' : 'Chapter test created'), onError: toast.error },
    );
  };

  return (
    <section aria-labelledby="test-h" className="card flex flex-col gap-4 p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="test-h" className="text-lg font-extrabold">
            Step 3 · Chapter test
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {t ? `${t.title} · ${t.description || `${t.questionCount} questions picked`}` : 'No test yet. Fill this in to create one.'}
          </p>
        </div>
        <Link to={`/admin/questions?chapter=${ch.id}&course=${ch.courseId}`} className="btn-secondary">
          Choose questions
        </Link>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Test name" htmlFor="t-title">
          <input id="t-title" className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Time limit" htmlFor="t-time">
            <select id="t-time" className="field" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}>
              {[30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </Field>
          <Field label="Retakes" htmlFor="t-retake">
            <select id="t-retake" className="field" value={f.retakes} onChange={(e) => setF({ ...f, retakes: e.target.value })}>
              <option value="">Unlimited</option>
              <option value="3">3 attempts</option>
              <option value="1">1 attempt</option>
            </select>
          </Field>
        </div>
        <fieldset className="flex flex-col gap-0.5">
          <legend className="mb-1 text-xs font-bold text-ink-2">Question selection</legend>
          <label className="flex min-h-11 items-center gap-2.5 text-sm">
            <input type="radio" name="qsel" checked={f.mode === 'fixed'} onChange={() => setF({ ...f, mode: 'fixed' })} className="size-[18px] accent-brand" />
            Fixed set, same questions for every student
          </label>
          <label className="flex min-h-11 items-center gap-2.5 text-sm">
            <input type="radio" name="qsel" checked={f.mode === 'random'} onChange={() => setF({ ...f, mode: 'random' })} className="size-[18px] accent-brand" />
            Random from this chapter's questions, mixed difficulty
          </label>
        </fieldset>
        {f.mode === 'random' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="MCQs per attempt" htmlFor="t-mcq">
              <input id="t-mcq" type="number" min={0} className="field" value={f.mcq} onChange={(e) => setF({ ...f, mcq: Number(e.target.value) })} />
            </Field>
            {caseKey && (
              <Field label={caseKey === 'cbq' ? 'Case-based questions per attempt' : 'TBS per attempt'} htmlFor="t-case">
                <input id="t-case" type="number" min={0} className="field" value={f.cases} onChange={(e) => setF({ ...f, cases: Number(e.target.value) })} />
              </Field>
            )}
          </div>
        )}
        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <input type="checkbox" checked={f.show} onChange={(e) => setF({ ...f, show: e.target.checked })} className="size-5 accent-brand" />
          Show answers and explanations after submit
        </label>
        <button type="submit" className="btn-primary self-start" disabled={save.isPending}>
          {t ? 'Save test settings' : 'Create chapter test'}
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------- chapter editor
function ChapterEditor({ chapterId }: { chapterId: string }) {
  const toast = useToast();
  const { data: ch, isLoading, error, refetch } = useAdminChapter(chapterId);
  const save = useSaveChapter();
  const [title, setTitle] = useState('');
  const [pub, setPub] = useState(true);
  useEffect(() => {
    if (ch) {
      setTitle(ch.title);
      setPub(ch.isPublished);
    }
  }, [ch]);

  if (isLoading)
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    );
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!ch) return <EmptyState title="Chapter not found" />;

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="chap-h" className="card flex flex-col gap-4 p-5 lg:p-6">
        <p id="chap-h" className="text-[13px] font-bold text-ink-3">
          {ch.courseLabel} · Chapter {ch.position}
        </p>
        <Field label="Chapter title" htmlFor="chapter-title">
          <input id="chapter-title" className="field h-[46px] text-base font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="size-5 accent-brand" />
            Visible to students
          </label>
          <div className="flex flex-wrap gap-2.5">
            <Link to={`/chapters/${ch.id}`} className="btn-secondary">
              <Eye aria-hidden className="size-4" />
              Preview as student
            </Link>
            <button
              type="button"
              className="btn-primary"
              disabled={save.isPending || !title.trim()}
              onClick={() => save.mutate({ id: ch.id, title, isPublished: pub }, { onSuccess: () => toast.show('Chapter saved'), onError: toast.error })}
            >
              Save changes
            </button>
          </div>
        </div>
      </section>
      <VideosSection ch={ch} />
      <EbookSection ch={ch} />
      <TestSection ch={ch} />
    </div>
  );
}

// ---------------------------------------------------------------- new course
function NewCourseModal({ open, onClose, tree }: { open: boolean; onClose: () => void; tree: TreeProgram[] }) {
  const toast = useToast();
  const add = useAddCourse();
  const [f, setF] = useState({ programId: '', code: '', name: '', fullName: '', kind: 'skill' });
  const [err, setErr] = useState('');
  useEffect(() => {
    if (open) {
      const p = tree[0];
      setF({ programId: p?.id ?? '', code: '', name: '', fullName: '', kind: p?.slug === 'cma-usa' ? 'cma_part' : p?.slug === 'cpa-usa' ? 'cpa_core' : 'skill' });
      setErr('');
    }
  }, [open, tree]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.programId || !f.name.trim() || !f.code.trim()) return setErr('Fill in the program, name and short code');
    const program = tree.find((p) => p.id === f.programId);
    add.mutate(
      { ...f, position: (program?.courses.length ?? 0) + 1 },
      {
        onSuccess: () => {
          toast.show('Course added. It stays hidden until you publish it.');
          onClose();
        },
        onError: (e2) => {
          toast.error(e2);
          if (isDemo) onClose();
        },
      },
    );
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New course"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="new-course" className="btn-primary" disabled={add.isPending}>
            Add course
          </button>
        </>
      }
    >
      <form id="new-course" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Program" htmlFor="nc-program">
          <select
            id="nc-program"
            className="field"
            value={f.programId}
            onChange={(e) => {
              const p = tree.find((x) => x.id === e.target.value);
              setF({ ...f, programId: e.target.value, kind: p?.slug === 'cma-usa' ? 'cma_part' : p?.slug === 'cpa-usa' ? 'cpa_core' : 'skill' });
            }}
          >
            {tree.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field label="Course name" htmlFor="nc-name" hint="Shown in menus, e.g. Power BI or FAR">
            <input id="nc-name" className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Short code" htmlFor="nc-code">
            <input id="nc-code" className="field uppercase" maxLength={8} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
          </Field>
        </div>
        <Field label="Full name" htmlFor="nc-full">
          <input id="nc-full" className="field" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
        </Field>
        {f.kind.startsWith('cpa') && (
          <Field label="CPA section type" htmlFor="nc-kind">
            <select id="nc-kind" className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              <option value="cpa_core">Core</option>
              <option value="cpa_discipline">Discipline</option>
            </select>
          </Field>
        )}
        {err && <p role="alert" className="text-[13px] font-semibold text-warn-text">{err}</p>}
      </form>
    </Modal>
  );
}

export default function Content() {
  const { data: tree, isLoading, error, refetch } = useCourseTree();
  const [params, setParams] = useSearchParams();
  const [newOpen, setNewOpen] = useState(false);
  const firstChapter = useMemo(() => {
    const all = tree?.flatMap((p) => p.courses).flatMap((c) => c.chapters) ?? [];
    // demo opens Chapter 3 like the design; live opens the first chapter
    return (isDemo ? all.find((c) => c.id === 'cma-part-1-ch3') : undefined)?.id ?? all[0]?.id ?? null;
  }, [tree]);
  const selected = params.get('chapter') ?? firstChapter;

  if (isLoading) return <PageLoader />;
  if (error || !tree) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Courses &amp; content</h1>
          <p className="mt-1 text-sm text-ink-3">Add chapters, upload videos and eBooks, and set up chapter tests</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setNewOpen(true)}>
          <Plus aria-hidden className="size-4" strokeWidth={2.4} />
          New course
        </button>
      </header>
      <div className="flex flex-wrap items-start gap-5 lg:gap-6">
        <aside aria-label="Course tree" className="card w-full min-w-0 p-3.5 lg:w-auto lg:flex-[1_1_290px]">
          <CourseTree tree={tree} selected={selected} onSelect={(id) => setParams({ chapter: id })} />
        </aside>
        <div className="min-w-0 flex-[999_1_560px]">
          {selected ? <ChapterEditor key={selected} chapterId={selected} /> : <EmptyState title="Pick a chapter" text="Choose a chapter on the left, or add one." />}
        </div>
      </div>
      <NewCourseModal open={newOpen} onClose={() => setNewOpen(false)} tree={tree} />
    </div>
  );
}
