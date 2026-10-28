import { Maximize, Play } from 'lucide-react';
import { clock } from '@/lib/format';
import type { VideoItem } from '@/lib/types';

/**
 * Video area with the student's email and phone as a moving-free watermark.
 *
 * Plug the DRM player in here. With VdoCipher, a Supabase Edge Function
 * returns { otp, playbackInfo } for `video.providerVideoId` (only for enrolled
 * students), and this component renders:
 *   <iframe src={`https://player.vdocipher.com/v2/?otp=${otp}&playbackInfo=${playbackInfo}`}
 *     allow="encrypted-media" allowFullScreen className="absolute inset-0 size-full" />
 * The player's time updates then call useMarkVideo() every ~15 seconds.
 */
export default function VideoPlayer({
  video,
  watermark,
  onPlay,
  rounded = true,
}: {
  video: VideoItem;
  watermark: string;
  onPlay: () => void;
  rounded?: boolean;
}) {
  const total = video.durationSeconds ?? 0;
  const at = Math.min(video.lastPosition, total);
  const pct = total ? (100 * at) / total : 0;
  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-[#0B1220] ${rounded ? 'lg:rounded-card' : ''}`}>
      <span className="absolute left-5 top-4 hidden text-sm font-semibold text-white lg:block">{video.title}</span>
      <span aria-hidden className="pointer-events-none absolute left-[8%] top-[30%] -rotate-[10deg] whitespace-nowrap text-[11px] text-white/25 lg:text-[13px]">
        {watermark}
      </span>
      <span aria-hidden className="pointer-events-none absolute bottom-[32%] right-[6%] -rotate-[10deg] whitespace-nowrap text-[11px] text-white/25 lg:text-[13px]">
        {watermark}
      </span>
      <button
        type="button"
        aria-label={`Play ${video.title}`}
        onClick={onPlay}
        className="absolute left-1/2 top-[44%] flex size-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-navy lg:top-1/2 lg:size-[76px]"
      >
        <Play aria-hidden className="ml-1 size-6 fill-current lg:size-7" />
      </button>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-[#050A14]/75 px-2 pb-0.5 lg:gap-1.5 lg:px-4 lg:py-3">
        <div
          role="progressbar"
          aria-label="Video position"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mx-2 h-[3px] overflow-hidden rounded-full bg-white/25 lg:mx-0 lg:h-1"
        >
          <div className="h-full bg-white" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center text-xs text-white lg:text-[13px]">
          <button type="button" aria-label="Play" onClick={onPlay} className="hidden size-11 items-center justify-center lg:flex">
            <Play aria-hidden className="size-[18px] fill-current" />
          </button>
          <span className="px-2 tabular-nums">
            {clock(at)} / {clock(total)}
          </span>
          <span className="flex-1" />
          <button type="button" onClick={onPlay} className="h-10 px-2.5 font-bold lg:h-11 lg:px-3">
            1.25×
          </button>
          <button type="button" onClick={onPlay} className="hidden h-11 px-3 font-bold lg:block">
            720p
          </button>
          <button type="button" aria-label="Full screen" onClick={onPlay} className="flex size-10 items-center justify-center lg:hidden">
            <Maximize aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
