'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, LoaderCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import {
  advanceCapture,
  captureSteps,
  stableFramesRequired,
  type CaptureProgress,
  type FacePreview,
} from '@/lib/live-face';
import { cx } from '@/lib/styles';

const button =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';
const initialProgress = (): CaptureProgress => ({
  step: 0,
  stableFrames: 0,
  lastAcceptedAt: null,
  missedFrames: 0,
});

export default function LiveFaceCapture({
  disabled,
  onComplete,
}: {
  disabled: boolean;
  onComplete: (images: string[]) => Promise<void>;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const samples = useRef<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(initialProgress);
  const [status, setStatus] = useState<
    'starting' | 'running' | 'complete' | 'error' | 'save-error'
  >('starting');
  const [message, setMessage] = useState('Đang mở camera…');
  const [preview, setPreview] = useState<FacePreview | null>(null);
  const [aspect, setAspect] = useState(4 / 3);

  useEffect(() => {
    let cancelled = false;
    let stopped = false;
    let media: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | null = null;
    let current = initialProgress();
    let failures = 0;
    let lastVideoTime = -1;
    const canvas = document.createElement('canvas');
    samples.current = [];
    setProgress(current);
    setStatus('starting');
    setPreview(null);
    setMessage('Đang mở camera…');

    function stopCamera() {
      stopped = true;
      media?.getTracks().forEach((track) => {
        track.removeEventListener('ended', disconnected);
        track.stop();
      });
      if (video.current?.srcObject === media) video.current.srcObject = null;
    }
    function disconnected() {
      if (cancelled) return;
      clearTimeout(timer);
      request?.abort();
      stopCamera();
      setStatus('error');
      setMessage('Camera đã ngắt kết nối. Hãy kết nối lại và thử lại.');
    }
    function schedule(delay = 220) {
      if (!cancelled && !stopped)
        timer = setTimeout(() => {
          void inspect();
        }, delay);
    }
    async function inspect() {
      const player = video.current;
      if (cancelled || stopped || !player) return;
      if (
        document.hidden ||
        player.readyState < 2 ||
        !player.videoWidth ||
        player.currentTime === lastVideoTime
      ) {
        current = {
          ...current,
          stableFrames: 0,
          lastAcceptedAt: null,
          missedFrames: 0,
        };
        setProgress(current);
        schedule();
        return;
      }
      lastVideoTime = player.currentTime;
      const scale = Math.min(1, 640 / player.videoWidth);
      canvas.width = Math.round(player.videoWidth * scale);
      canvas.height = Math.round(player.videoHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        setStatus('error');
        setMessage('Trình duyệt không xử lý được camera.');
        stopCamera();
        return;
      }
      context.drawImage(player, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL('image/jpeg', 0.88);
      request = new AbortController();
      const timeout = setTimeout(() => request?.abort(), 10000);
      try {
        const result = await api<FacePreview>('recognition/preview', {
          method: 'POST',
          body: JSON.stringify({
            image,
            pose: captureSteps[current.step].pose,
          }),
          signal: request.signal,
        });
        if (cancelled || stopped) return;
        failures = 0;
        setPreview(result);
        const next = advanceCapture(current, result, performance.now());
        current = next.progress;
        setProgress(current);
        setMessage(result.message);
        if (next.capture) {
          samples.current.push(image);
          setPreview(null);
          setMessage(
            current.step < captureSteps.length
              ? captureSteps[current.step].hint
              : 'Đã lấy đủ mẫu. Đang xác nhận khuôn mặt…',
          );
        }
        if (current.step === captureSteps.length) {
          clearTimeout(timeout);
          stopCamera();
          setStatus('complete');
          try {
            await onCompleteRef.current([...samples.current]);
          } catch {
            if (!cancelled) {
              setStatus('save-error');
              setMessage(
                'Chưa lưu được khuôn mặt. Bạn có thể thử lưu lại hoặc lấy lại mẫu.',
              );
            }
          }
          return;
        }
        schedule();
      } catch (err) {
        if (cancelled || stopped) return;
        failures++;
        current = {
          ...current,
          stableFrames: 0,
          lastAcceptedAt: null,
          missedFrames: 0,
        };
        setProgress(current);
        setPreview(null);
        setMessage(
          err instanceof Error && err.name !== 'AbortError'
            ? err.message
            : 'Kiểm tra camera quá lâu. Đang kết nối lại…',
        );
        if (failures >= 3) {
          stopCamera();
          setStatus('error');
        } else schedule(1200);
      } finally {
        clearTimeout(timeout);
      }
    }
    async function openCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error('Camera cần HTTPS hoặc localhost để hoạt động.');
        const opened = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
        if (cancelled) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        media = opened;
        const player = video.current;
        if (!player) {
          stopCamera();
          return;
        }
        media
          .getVideoTracks()
          .forEach((track) => track.addEventListener('ended', disconnected));
        player.srcObject = media;
        await player.play();
        if (cancelled) return;
        setAspect(player.videoWidth / player.videoHeight || 4 / 3);
        setStatus('running');
        setMessage(captureSteps[0].hint);
        schedule(0);
      } catch (err) {
        if (cancelled) return;
        stopCamera();
        setStatus('error');
        const name = err instanceof Error ? err.name : '';
        setMessage(
          name === 'NotAllowedError'
            ? 'Hãy cho phép truy cập camera trong trình duyệt rồi thử lại.'
            : name === 'NotFoundError'
              ? 'Không tìm thấy camera. Hãy kết nối webcam rồi thử lại.'
              : name === 'NotReadableError'
                ? 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.'
                : err instanceof Error
                  ? err.message
                  : 'Không mở được camera.',
        );
      }
    }
    void openCamera();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      request?.abort();
      stopCamera();
      samples.current = [];
    };
  }, [attempt]);

  async function retrySave() {
    setStatus('complete');
    try {
      await onCompleteRef.current([...samples.current]);
    } catch {
      setStatus('save-error');
    }
  }

  const step = captureSteps[Math.min(progress.step, captureSteps.length - 1)];
  const percentage = Math.round(
    ((progress.step + progress.stableFrames / stableFramesRequired) /
      captureSteps.length) *
      100,
  );
  const ready = preview?.acceptable && status === 'running';
  return (
    <div className="space-y-4">
      <ol
        className="m-0 grid list-none grid-cols-3 gap-2 p-0"
        aria-label="Các bước xác nhận khuôn mặt"
      >
        {captureSteps.map((item, index) => (
          <li
            key={item.pose}
            aria-current={progress.step === index ? 'step' : undefined}
            className={cx(
              'flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs',
              progress.step >= index
                ? 'border-[var(--border-strong)] bg-[var(--bg-story)]'
                : 'border-[var(--border)] bg-[var(--bg-subtle)]',
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)]">
              {progress.step > index ? <Check size={16} /> : index + 1}
            </span>
            {item.label}
          </li>
        ))}
      </ol>
      <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border-2 border-[var(--border-strong)] bg-[#111827]">
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: aspect }}
        >
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label="Camera xác nhận khuôn mặt trực tiếp"
            className="absolute inset-0 h-full w-full -scale-x-100 object-contain"
          />
          {status === 'running' && (
            <>
              <div
                className={cx(
                  'pointer-events-none absolute left-[24%] top-[10%] h-[80%] w-[52%] rounded-[50%] border-[3px] [box-shadow:0_0_0_999px_#00000050]',
                  ready ? 'border-emerald-400' : 'border-white/80',
                )}
              />
              {preview?.box && (
                <div
                  className={cx(
                    'pointer-events-none absolute rounded-2xl border-2',
                    ready ? 'border-emerald-400' : 'border-amber-300',
                  )}
                  style={{
                    left: `${(1 - preview.box.x - preview.box.width) * 100}%`,
                    top: `${preview.box.y * 100}%`,
                    width: `${preview.box.width * 100}%`,
                    height: `${preview.box.height * 100}%`,
                  }}
                />
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Nhận diện realtime
              </span>
              <p className="absolute bottom-3 left-3 right-3 m-0 rounded-xl bg-black/65 px-3 py-2 text-center text-sm font-medium text-white">
                {step.label}
              </p>
            </>
          )}
          {status !== 'running' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
              {status === 'starting' || status === 'complete' ? (
                <LoaderCircle size={34} className="animate-spin" />
              ) : (
                <Camera size={34} />
              )}
              <span>
                {status === 'starting'
                  ? 'Đang mở camera…'
                  : status === 'complete'
                    ? 'Đang xác nhận và lưu khuôn mặt…'
                    : status === 'save-error'
                      ? 'Đã lấy đủ mẫu khuôn mặt'
                      : 'Camera đã dừng'}
              </span>
            </div>
          )}
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Tiến độ lấy mẫu khuôn mặt"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]"
      >
        <div
          className="h-full rounded-full bg-[var(--primary-strong)] transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p
        role="status"
        aria-live="polite"
        className="m-0 text-center text-sm font-medium"
      >
        {message}
      </p>
      <p className="m-0 text-center text-xs text-[var(--ink-muted)]">
        Camera tự lấy mẫu khi khuôn mặt rõ nét và giữ đúng tư thế. Đã hoàn tất{' '}
        {progress.step}/{captureSteps.length} bước.
      </p>
      {(status === 'error' || status === 'save-error') && (
        <div className="flex flex-wrap justify-center gap-3">
          {status === 'save-error' && (
            <button
              type="button"
              className={button}
              disabled={disabled}
              onClick={() => void retrySave()}
            >
              Thử lưu lại
            </button>
          )}
          <button
            type="button"
            className={button}
            disabled={disabled}
            onClick={() => setAttempt((value) => value + 1)}
          >
            <RefreshCw size={16} />
            {status === 'error' ? 'Thử lại camera' : 'Lấy lại mẫu'}
          </button>
        </div>
      )}
    </div>
  );
}
