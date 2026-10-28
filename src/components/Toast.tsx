import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { DemoModeError } from '@/lib/queries';
import { cx } from '@/lib/format';

type Tone = 'success' | 'info' | 'error';
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}

interface ToastValue {
  show: (text: string, tone?: Tone) => void;
  /** Shows an error, or the demo-mode note for writes in demo mode. */
  error: (e: unknown) => void;
}

const Ctx = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (text: string, tone: Tone = 'success') => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs.slice(-2), { id, tone, text }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const error = useCallback(
    (e: unknown) => {
      if (e instanceof DemoModeError) show(e.message, 'info');
      else show(e instanceof Error ? e.message : 'Something went wrong. Please try again.', 'error');
    },
    [show],
  );

  return (
    <Ctx.Provider value={{ show, error }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
      >
        {items.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? TriangleAlert : Info;
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={cx(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
                t.tone === 'success' && 'border-ok-bg bg-white text-ink',
                t.tone === 'info' && 'border-line bg-navy text-white',
                t.tone === 'error' && 'border-warn-line bg-warn-bg text-warn-fg',
              )}
            >
              <Icon aria-hidden className={cx('mt-0.5 size-[18px] shrink-0', t.tone === 'success' && 'text-ok-fg')} />
              <p className="flex-1">{t.text}</p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="-m-2 flex size-9 items-center justify-center rounded-lg opacity-70 hover:opacity-100"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
