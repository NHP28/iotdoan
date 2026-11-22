'use client';
import { cx } from '@/lib/styles';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Camera,
  Check,
  Fingerprint,
  ImagePlus,
  LoaderCircle,
  LogIn,
  LogOut,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  VideoOff,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Attendance, formatTime, User } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Notice } from './ui';

export default function CameraPage({ user }: { user: User }) {
  const router = useRouter();
  const [registered, setRegistered] = useState(!!user.driver?.face_registered);
  const [mode, setMode] = useState<'attendance' | 'enroll'>(
    user.driver?.face_registered ? 'attendance' : 'enroll',
  );
  const [camera, setCamera] = useState(false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const history = useData<Attendance[]>('recognition/history', []);
  const model = useData<{ available: boolean }>('recognition/status', { available: false });
  const inShift = history.data[0]?.check_type === 'CHECK_IN';
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  function stop() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCamera(false);
    setReady(false);
  }
  async function start() {
    setError('');
    setSuccess('');
    setStarting(true);
    setImage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          'Trình duyệt chưa hỗ trợ camera. Hãy dùng HTTPS hoặc localhost, hoặc tải ảnh lên.',
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!alive.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      setCamera(true);
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
    } catch (err) {
      stop();
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Quyền camera bị từ chối. Hãy cho phép camera trong trình duyệt hoặc tải ảnh lên.'
          : err instanceof DOMException && err.name === 'NotFoundError'
            ? 'Không tìm thấy camera. Bạn có thể tải ảnh lên để tiếp tục.'
            : err instanceof Error
              ? err.message
              : 'Không mở được camera.',
      );
    } finally {
      if (alive.current) setStarting(false);
    }
  }
  function capture() {
    if (!video.current || !ready) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    const context = canvas.getContext('2d');
    if (!context || !canvas.width) {
      setError('Camera chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }
    context.drawImage(video.current, 0, 0);
    setImage(canvas.toDataURL('image/jpeg', 0.88));
    stop();
    setError('');
    setSuccess('');
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setSuccess('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 3_000_000) {
      setError('Ảnh vượt quá 3 MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }
    stop();
    try {
      const reader = new FileReader();
      const result = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
        reader.readAsDataURL(file);
      });
      setImage(result);
    } catch {
      setError('Không đọc được ảnh. Vui lòng thử ảnh khác.');
    }
  }
  async function submit(checkType?: 'CHECK_IN' | 'CHECK_OUT') {
    if (!image || busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'enroll') {
        await api('recognition/enroll', { method: 'POST', body: JSON.stringify({ image }) });
        setRegistered(true);
        setMode('attendance');
        setSuccess('Đã đăng ký khuôn mặt. Bạn có thể chụp ảnh mới để điểm danh.');
      } else {
        const record = await api<Attendance>('recognition/attendance', {
          method: 'POST',
          body: JSON.stringify({ image, check_type: checkType }),
        });
        setSuccess(
          `${record.check_type === 'CHECK_IN' ? 'Check-in' : 'Check-out'} thành công lúc ${formatTime(record.timestamp)}. Độ tương đồng: ${record.confidence_score?.toFixed(1)}%.`,
        );
        void history.refresh();
      }
      setImage('');
      stop();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xử lý nhận diện.');
    } finally {
      setBusy(false);
    }
  }
  const canSubmit = !!image && !busy && !history.loading && !model.loading && model.data.available;
  return (
    <>
      <div className="gap-[1rem] flex items-end justify-between flex-wrap mb-[1.4rem]">
        <div>
          <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
            TÀI XẾ / ĐIỂM DANH
          </span>
          <h1 className="m-[0] font-medium text-[clamp(1.45rem,_2.4vw,_1.95rem)] tracking-[-0.02em]">
            {mode === 'enroll' ? 'Đăng ký khuôn mặt' : 'Điểm danh khuôn mặt'}
          </h1>
          <p className="mx-[0] mt-[0.2rem] mb-[0] text-[var(--ink-muted)] text-[0.9rem]">
            {mode === 'enroll'
              ? 'Đăng ký khuôn mặt trước khi bắt đầu sử dụng điểm danh.'
              : 'Chụp ảnh và xác minh khuôn mặt để bắt đầu hoặc kết thúc ca làm.'}
          </p>
        </div>
        <Badge tone={registered ? 'green' : 'yellow'}>
          {registered ? 'Đã đăng ký khuôn mặt' : 'Chưa đăng ký khuôn mặt'}
        </Badge>
      </div>
      <Notice error={error || history.error} success={success} />
      {!user.driver?.is_active ? (
        <div
          className="px-[1rem] py-[0.8rem] rounded-[10px] border-[2px] border-solid [border-color:#dc2626] bg-none text-[0.85rem] font-medium mb-[1rem] bg-[var(--danger-bg)] text-[#991b1b]"
          role="alert"
        >
          Hồ sơ tài xế đang tạm ngưng. Vui lòng liên hệ quản trị viên để tiếp tục.
        </div>
      ) : (
        <>
          <div
            className="p-[0.35rem] rounded-[12px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none inline-flex bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] mb-[1.25rem]"
            role="group"
            aria-label="Chọn chế độ nhận diện"
          >
            <button
              className={cx(
                'px-[0.95rem] py-[0.5rem] rounded-[8px] gap-[0.45rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] cursor-pointer inline-flex items-center [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55]',
                mode === 'enroll' &&
                  'border-[1.5px] border-solid [border-color:#11141c] text-[#11141c] bg-[var(--primary)]',
                !(mode === 'enroll') &&
                  'border-[0] border-none [border-color:currentColor] text-[var(--ink-secondary)] bg-[transparent]',
              )}
              disabled={busy}
              onClick={() => {
                setMode('enroll');
                setImage('');
                setError('');
                setSuccess('');
              }}
            >
              <ScanFace size={17} />
              Đăng ký khuôn mặt
            </button>
            <button
              className={cx(
                'px-[0.95rem] py-[0.5rem] rounded-[8px] gap-[0.45rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] cursor-pointer inline-flex items-center [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55]',
                mode === 'attendance' &&
                  'border-[1.5px] border-solid [border-color:#11141c] text-[#11141c] bg-[var(--primary)]',
                !(mode === 'attendance') &&
                  'border-[0] border-none [border-color:currentColor] text-[var(--ink-secondary)] bg-[transparent]',
              )}
              disabled={busy || !registered}
              onClick={() => {
                setMode('attendance');
                setImage('');
                setError('');
                setSuccess('');
              }}
            >
              <Fingerprint size={17} />
              Check-in / Check-out
            </button>
          </div>
          <div className="gap-[1.25rem] grid grid-cols-[1.35fr_1fr] [align-items:start] [@media(width<=1024px)]:grid-cols-[1fr]">
            <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)]">
              <div className="gap-[1rem] flex items-start justify-between mb-[1.1rem]">
                <div>
                  <h3 className="m-[0] font-medium text-[1.05rem]">
                    {mode === 'enroll' ? 'Ảnh khuôn mặt đăng ký' : 'Xác minh danh tính'}
                  </h3>
                  <p className="mx-[0] mt-[0.15rem] mb-[0] text-[0.83rem] text-[var(--ink-muted)]">
                    Đảm bảo trong khung hình chỉ có bạn
                  </p>
                </div>
                <Badge tone={camera ? 'green' : 'neutral'}>
                  {camera ? 'Camera đang mở' : image ? 'Đã chọn ảnh' : 'Camera đang tắt'}
                </Badge>
              </div>
              <div className="rounded-[14px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none relative w-[100%] [aspect-ratio:16_/_10] bg-[#0f172a] overflow-x-hidden overflow-y-hidden flex items-center justify-center text-[#e2e8f0]">
                <video
                  ref={video}
                  autoPlay
                  playsInline
                  muted
                  onLoadedData={() => setReady(true)}
                  className={cx('w-[100%] h-[100%] object-cover', !camera && 'hidden!')}
                />
                {image && (
                  <img
                    src={image}
                    alt="Ảnh khuôn mặt đã chọn để nhận diện"
                    className="w-[100%] h-[100%] object-cover"
                  />
                )}
                {!image && (
                  <div className="gap-[0.4rem] absolute top-[12%] right-[12%] bottom-[12%] left-[12%] flex flex-col items-center justify-center text-center pointer-events-none">
                    <span
                      className={cx(
                        'border-solid absolute w-[26px] h-[26px] top-[0] left-[0] [border-top-width:3px] [border-right-width:0] [border-bottom-width:0] [border-left-width:3px] [border-top-left-radius:10px]',
                        camera && '[border-color:#4ade80]',
                        !camera && '[border-color:var(--primary)]',
                      )}
                    />
                    <span
                      className={cx(
                        'border-solid absolute w-[26px] h-[26px] top-[0] right-[0] [border-top-width:3px] [border-right-width:3px] [border-bottom-width:0] [border-left-width:0] [border-top-right-radius:10px]',
                        camera && '[border-color:#4ade80]',
                        !camera && '[border-color:var(--primary)]',
                      )}
                    />
                    <span
                      className={cx(
                        'border-solid absolute w-[26px] h-[26px] bottom-[0] left-[0] [border-top-width:0] [border-right-width:0] [border-bottom-width:3px] [border-left-width:3px] [border-bottom-left-radius:10px]',
                        camera && '[border-color:#4ade80]',
                        !camera && '[border-color:var(--primary)]',
                      )}
                    />
                    <span
                      className={cx(
                        'border-solid absolute w-[26px] h-[26px] bottom-[0] right-[0] [border-top-width:0] [border-right-width:3px] [border-bottom-width:3px] [border-left-width:0] [border-bottom-right-radius:10px]',
                        camera && '[border-color:#4ade80]',
                        !camera && '[border-color:var(--primary)]',
                      )}
                    />
                    {!camera && (
                      <>
                        <ScanFace size={70} strokeWidth={1} />
                        <strong className="font-medium">Đưa khuôn mặt vào khung hình</strong>
                        <small className="text-[#94a3b8] text-[0.78rem]">
                          Nhìn thẳng · Đủ ánh sáng · Không che mặt
                        </small>
                      </>
                    )}
                  </div>
                )}
                {image && (
                  <button
                    className="rounded-[999px] border-[2px] border-solid [border-color:#11141c] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer absolute top-[0.75rem] right-[0.75rem] w-[34px] h-[34px] bg-[#ffffff] inline-flex items-center justify-center [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55]"
                    disabled={busy}
                    onClick={() => setImage('')}
                    aria-label="Xóa ảnh đã chọn"
                  >
                    <X size={18} />
                  </button>
                )}
                <span className="px-[0.65rem] py-[0.3rem] rounded-[999px] border-[1px] border-solid [border-color:rgba(255,_255,_255,_0.2)] gap-[0.45rem] bg-none absolute bottom-[0.75rem] left-[0.75rem] inline-flex items-center bg-[rgba(15,_23,_42,_0.82)] text-[0.68rem] font-medium tracking-[0.06em] text-[#f8fafc]">
                  <span className="rounded-[999px] bg-none inline-block w-[8px] h-[8px] bg-[#22c55e] [box-shadow:0_0_0_3px_rgba(34,_197,_94,_0.2)] shrink-[0]" />
                  {image ? 'ẢNH ĐÃ SẴN SÀNG' : camera ? 'LIVE CAMERA' : 'FACE RECOGNITION'}
                </span>
              </div>
              <div className="gap-[0.65rem] flex items-center flex-wrap mt-[1rem]">
                {camera ? (
                  <>
                    <button
                      className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                      disabled={!ready || busy}
                      onClick={capture}
                    >
                      <Camera size={17} />
                      Chụp ảnh
                    </button>
                    <button
                      className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                      onClick={stop}
                    >
                      <VideoOff size={17} />
                      Tắt camera
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                      onClick={() => void start()}
                      disabled={starting || busy}
                    >
                      {starting ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin [animation-duration:0.9s]"
                        />
                      ) : (
                        <Camera size={17} />
                      )}
                      {image ? 'Chụp lại' : 'Mở camera'}
                    </button>
                    <label
                      className={cx(
                        'px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none font-medium inline-flex items-center justify-center text-[0.84rem] [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] text-[var(--ink)] [box-shadow:var(--shadow-hard-sm)] relative overflow-x-hidden overflow-y-hidden cursor-pointer [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!',
                        busy && 'opacity-[0.55] pointer-events-none',
                      )}
                    >
                      <ImagePlus size={17} />
                      Tải ảnh lên
                      <input
                        className="text-inherit [font-family:inherit] [font-size:inherit] [font-weight:inherit] leading-[inherit] [font-style:inherit] [font-variant:inherit] absolute top-[0] right-[0] bottom-[0] left-[0] opacity-[0] cursor-pointer [&:disabled]:bg-none [&:disabled]:text-[var(--ink-muted)] [&:disabled]:bg-[var(--bg-subtle)]"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={upload}
                        disabled={busy}
                      />
                    </label>
                  </>
                )}
                <span className="ml-[auto] text-[0.76rem] text-[var(--ink-muted)]">
                  JPG, PNG, WebP · tối đa 3 MB
                </span>
              </div>
            </section>
            <aside className="gap-[1rem] flex flex-col">
              <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.75rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex flex-col">
                <span className="rounded-[12px] border-[2px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[42px] h-[42px] text-[#11141c] [box-shadow:var(--shadow-hard-sm)] bg-[var(--primary)]">
                  <Fingerprint size={26} />
                </span>
                <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
                  {mode === 'enroll' ? 'ĐĂNG KÝ NHẬN DIỆN' : 'ĐIỂM DANH CA LÀM'}
                </span>
                <h2 className="m-[0] font-medium text-[1.3rem] leading-[1.25]">
                  {mode === 'enroll' ? (
                    <>
                      Khuôn mặt của bạn,
                      <br />
                      dấu nhận diện của bạn.
                    </>
                  ) : (
                    user.full_name
                  )}
                </h2>
                <p className="m-[0] text-[0.85rem] text-[var(--ink-muted)]">
                  {mode === 'enroll'
                    ? 'Model sẽ trích xuất đặc trưng khuôn mặt từ ảnh và liên kết với hồ sơ tài xế hiện tại.'
                    : `Mã tài xế: ${user.driver?.driver_code || '—'}`}
                </p>
                <div className="px-[0.8rem] py-[0.65rem] rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none flex justify-between items-center bg-[var(--bg-subtle)] text-[0.83rem] font-medium">
                  <span>Trạng thái ca</span>
                  <Badge tone={inShift ? 'green' : 'neutral'}>
                    {history.loading ? 'Đang tải' : inShift ? 'Đang trong ca' : 'Ngoài ca'}
                  </Badge>
                </div>
                <div className="px-[0.8rem] py-[0.65rem] rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none flex justify-between items-center bg-[var(--bg-subtle)] text-[0.83rem] font-medium">
                  <span>Model nhận diện</span>
                  <Badge tone={model.data.available ? 'green' : 'yellow'}>
                    {model.loading
                      ? 'Đang kiểm tra'
                      : model.data.available
                        ? 'Sẵn sàng'
                        : 'Chưa kết nối'}
                  </Badge>
                </div>
                {!model.loading && !model.data.available && (
                  <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1.5px] border-solid [border-color:#f59e0b] gap-[0.35rem] bg-none bg-[#fef3c7] text-[#78350f] text-[0.8rem] flex flex-col">
                    <p className="m-[0]">
                      Vui lòng khởi động dịch vụ AI để đăng ký khuôn mặt và điểm danh.
                    </p>
                    <button
                      className="p-[0] border-[0] border-none [border-color:currentColor] gap-[0.35rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--brand)] cursor-pointer inline-flex items-center bg-[transparent] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:hover]:underline"
                      onClick={() => void model.refresh()}
                    >
                      <RefreshCw size={13} />
                      Kiểm tra lại
                    </button>
                  </div>
                )}
                {mode === 'enroll' ? (
                  <>
                    <button
                      className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] w-[100%] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                      disabled={!canSubmit}
                      onClick={() => void submit()}
                    >
                      {busy ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin [animation-duration:0.9s]"
                        />
                      ) : (
                        <ScanFace size={17} />
                      )}
                      {registered ? 'Cập nhật khuôn mặt' : 'Đăng ký khuôn mặt'}
                      <ArrowRight size={16} />
                    </button>
                    {registered && (
                      <p className="mx-[0] mt-[0.85rem] mb-[0] text-[0.85rem] text-[var(--ink-muted)]">
                        Ảnh mới sẽ thay thế khuôn mặt đã đăng ký.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="gap-[0.6rem] flex flex-col">
                    <button
                      className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] w-[100%] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                      disabled={!canSubmit || inShift}
                      onClick={() => void submit('CHECK_IN')}
                    >
                      {busy ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin [animation-duration:0.9s]"
                        />
                      ) : (
                        <LogIn size={17} />
                      )}
                      Check-in · Bắt đầu ca
                    </button>
                    <button
                      className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] w-[100%] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                      disabled={!canSubmit || !inShift}
                      onClick={() => void submit('CHECK_OUT')}
                    >
                      <LogOut size={17} />
                      Check-out · Kết thúc ca
                    </button>
                  </div>
                )}
                <div className="gap-[0.5rem] flex items-center text-[0.8rem] text-[var(--ink-muted)] pt-[0.5rem] [border-top-width:1px] [border-top-style:dashed] [border-top-color:var(--border)]">
                  <ShieldCheck size={16} />
                  <p className="m-[0]">
                    {image
                      ? 'Ảnh sẵn sàng để gửi tới model xác minh.'
                      : 'Chụp ảnh hoặc tải ảnh lên để tiếp tục.'}
                  </p>
                </div>
              </section>
              <div className="px-[1.15rem] py-[1rem] rounded-[14px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.45rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] flex flex-col text-[0.82rem]">
                <strong className="font-medium">Để nhận diện tốt hơn</strong>
                {[
                  'Giữ khuôn mặt rõ nét và nhìn thẳng.',
                  'Chọn nơi đủ sáng, tránh ngược sáng.',
                  'Bỏ khẩu trang và kính che khuôn mặt.',
                ].map((tip) => (
                  <p
                    className="m-[0] gap-[0.45rem] flex items-center text-[var(--ink-secondary)]"
                    key={tip}
                  >
                    <Check size={14} />
                    {tip}
                  </p>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
