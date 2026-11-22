'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Fingerprint, ImagePlus, LoaderCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { Badge, Notice } from './ui';
import LiveFaceCapture from './live-face-capture';
import FaceCapture, {
  emptyEnrollment,
  type FaceEnrollment,
} from './face-capture';
import { cx } from '@/lib/styles';

const button =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-[var(--border-strong)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] [box-shadow:var(--shadow-hard-sm)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

export default function FaceVerification({ user }: { user: User }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'live' | 'media'>('live');
  const [captureBusy, setCaptureBusy] = useState(false);
  const [enrollment, setEnrollment] = useState(emptyEnrollment);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const registered = !!user.driver?.face_registered;
  const active = !!user.driver?.is_active;

  async function save(value: FaceEnrollment) {
    if (busy || !active) throw new Error('Hồ sơ chưa sẵn sàng để xác nhận.');
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const result = await api<{ sample_count: number }>('recognition/enroll', {
        method: 'POST',
        body: JSON.stringify(value),
      });
      setEditing(false);
      setEnrollment(emptyEnrollment());
      setSuccess(
        `Xác nhận khuôn mặt thành công. Đã lưu ${result.sample_count} ảnh mẫu, bạn có thể bắt đầu điểm danh.`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Chưa xác nhận được khuôn mặt.',
      );
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function submitMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || captureBusy) return;
    if (!enrollment.images.length) {
      setError(
        'Vui lòng chọn ảnh chân dung hoặc tải/quay video trước khi xác nhận.',
      );
      return;
    }
    try {
      await save(enrollment);
    } catch {
      /* save displays the actionable API error. */
    }
  }

  return (
    <section
      id="face-verification"
      aria-labelledby="face-verification-title"
      className="scroll-mt-6 rounded-[var(--radius-lg)] border-2 border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 [box-shadow:var(--shadow-hard)]"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Fingerprint size={25} className="shrink-0" />
          <h3 id="face-verification-title" className="m-0 text-lg font-medium">
            Xác nhận khuôn mặt
          </h3>
        </div>
        <Badge tone={registered ? 'green' : 'yellow'}>
          {registered ? 'Đã xác nhận' : 'Chưa xác nhận'}
        </Badge>
      </div>
      <p className="mb-4 mt-0 text-sm text-[var(--ink-muted)]">
        {registered
          ? `Đã lưu ${user.driver?.face_sample_count || 1} ảnh mẫu. Bạn có thể cập nhật bằng camera, ảnh chân dung hoặc video.`
          : 'Camera realtime tự nhận diện và lấy mẫu khi bạn nhìn thẳng, quay nhẹ trái/phải. Bạn cũng có thể chọn tải ảnh hoặc quay video.'}
      </p>
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Cách xác nhận khuôn mặt"
      >
        {(
          [
            { value: 'live', label: 'Camera realtime', icon: Camera },
            { value: 'media', label: 'Tải ảnh / quay video', icon: ImagePlus },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={mode === item.value}
            disabled={busy || captureBusy}
            className={cx(
              'inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-2 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50',
              mode === item.value
                ? 'border-[var(--border-strong)] bg-[var(--bg-story)]'
                : 'border-[var(--border)] bg-[var(--bg-surface)]',
            )}
            onClick={() => {
              if (mode === item.value) return;
              setMode(item.value);
              setEnrollment(emptyEnrollment());
              setError('');
              setSuccess('');
            }}
          >
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </div>
      <p className="mb-4 mt-0 text-sm text-[var(--ink-muted)]" role="status">
        {mode === 'live'
          ? 'Đang chọn realtime: camera kiểm tra liên tục và tự lấy mẫu đạt yêu cầu.'
          : 'Đang chọn ảnh/video: chọn hoặc quay mẫu rồi bấm xác nhận để lưu.'}
      </p>
      {!active && (
        <p role="alert" className="text-sm text-red-800">
          Hồ sơ đang tạm ngưng. Vui lòng liên hệ quản trị viên.
        </p>
      )}
      <Notice error={error} success={success} />
      {editing ? (
        <div className="space-y-4">
          {mode === 'live' ? (
            <LiveFaceCapture
              onComplete={(images) =>
                save({ images, capture_source: 'photos' })
              }
              disabled={busy || !active}
            />
          ) : (
            <form onSubmit={submitMedia} className="space-y-4">
              <FaceCapture
                value={enrollment}
                onChange={setEnrollment}
                disabled={busy || !active}
                onBusyChange={setCaptureBusy}
              />
              <button
                type="submit"
                className={button}
                disabled={
                  busy || captureBusy || !active || !enrollment.images.length
                }
              >
                {busy && <LoaderCircle size={17} className="animate-spin" />}
                {busy
                  ? 'Đang xác nhận khuôn mặt…'
                  : 'Xác nhận và lưu khuôn mặt'}
              </button>
            </form>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="cursor-pointer rounded-[10px] border-2 border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm disabled:opacity-50"
              disabled={busy || captureBusy}
              onClick={() => {
                setEditing(false);
                setEnrollment(emptyEnrollment());
                setError('');
              }}
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={button}
          disabled={!active}
          aria-expanded={false}
          onClick={() => {
            setError('');
            setSuccess('');
            setEditing(true);
          }}
        >
          <Fingerprint size={17} />
          {mode === 'live' ? 'Bật camera realtime' : 'Thêm ảnh / video'}
        </button>
      )}
    </section>
  );
}
