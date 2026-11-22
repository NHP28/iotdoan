'use client';
import { cx } from '@/lib/styles';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Fingerprint,
  LoaderCircle,
  LogIn,
  LogOut,
  Radio,
  RefreshCw,
  ScanFace,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Attendance, formatTime, User } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Notice } from './ui';

type ModelStatus = {
  available: boolean;
  device_id?: string;
  mode?: string;
  enrollment_available?: boolean;
  devices?: { device_id: string; online: boolean }[];
};
export default function PiAttendance({ user }: { user: User }) {
  const router = useRouter();
  const model = useData<ModelStatus>('recognition/status', { available: false });
  const history = useData<Attendance[]>('recognition/history', []);
  const registered = !!user.driver?.face_registered;
  const [busy, setBusy] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const faceSymbol = useRef<HTMLDivElement>(null);
  const scanLine = useRef<HTMLSpanElement>(null);
  const inShift = history.data[0]?.check_type === 'CHECK_IN';
  const active = !!user.driver?.is_active;
  const ready =
    active && registered && model.data.available && !model.loading && !history.loading && !history.error && !busy;

  useEffect(() => {
    if (busy) return;
    const timer = setInterval(() => {
      void model.refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [busy, model.refresh]);

  useEffect(() => {
    if (!busy) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animations: Animation[] = [];
    function updateMotion() {
      animations.forEach((animation) => animation.cancel());
      animations = [];
      if (motion.matches) return;
      const pulse = faceSymbol.current?.animate(
        [
          { boxShadow: '0 0 0 0 #a2b2ff00' },
          { boxShadow: '0 0 0 12px #a2b2ff1a' },
          { boxShadow: '0 0 0 0 #a2b2ff00' },
        ],
        { duration: 2000, easing: 'ease-in-out', iterations: Infinity },
      );
      const scan = scanLine.current?.animate([{ top: '28%' }, { top: '65%' }, { top: '28%' }], {
        duration: 3000,
        easing: 'ease-in-out',
        iterations: Infinity,
      });
      animations = [pulse, scan].filter((animation): animation is Animation => !!animation);
    }
    updateMotion();
    motion.addEventListener('change', updateMotion);
    return () => {
      animations.forEach((animation) => animation.cancel());
      motion.removeEventListener('change', updateMotion);
    };
  }, [busy]);

  async function request(operation: 'CHECK_IN' | 'CHECK_OUT') {
    if (!ready) return;
    setBusy(operation);
    setError('');
    setSuccess('');
    try {
        const record = await api<Attendance>('recognition/attendance', {
          method: 'POST',
          body: JSON.stringify({ check_type: operation, device_id: model.data.device_id }),
        });
        setSuccess(
          `${operation === 'CHECK_IN' ? 'Check-in' : 'Check-out'} thành công cho ${user.full_name} lúc ${formatTime(record.timestamp)}.`,
        );
        await history.refresh();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nhận diện. Vui lòng thử lại.');
    } finally {
      setBusy(null);
      void model.refresh();
    }
  }
  return (
    <>
      <div className="gap-[1rem] flex items-end justify-between flex-wrap mb-[1.4rem]">
        <div>
          <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
            TÀI XẾ / ĐIỂM DANH
          </span>
          <h1 className="m-[0] font-medium text-[clamp(1.45rem,_2.4vw,_1.95rem)] tracking-[-0.02em]">
            Điểm danh khuôn mặt
          </h1>
          <p className="mx-[0] mt-[0.2rem] mb-[0] text-[var(--ink-muted)] text-[0.9rem]">
            Đăng nhập trên web, xác minh khuôn mặt bằng camera gắn trên Raspberry Pi.
          </p>
        </div>
        <Badge tone={registered ? 'green' : 'yellow'}>
          {registered ? 'Đã đăng ký khuôn mặt' : 'Chưa có khuôn mặt'}
        </Badge>
      </div>
      <Notice error={error || history.error || model.error} success={success} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[var(--border-strong)] bg-[var(--bg-surface)] p-5">
        <p className="m-0 text-sm">{registered ? 'Quản lý ảnh và video khuôn mặt trong hồ sơ cá nhân.' : 'Bạn cần xác nhận khuôn mặt trong hồ sơ trước khi điểm danh.'}</p>
        <Link href="/driver/profile#face-verification" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
          {registered ? 'Quản lý khuôn mặt' : 'Mở hồ sơ để xác nhận'}<ArrowRight size={16} />
        </Link>
      </div>
      {!active && (
        <div className="px-[1rem] py-[0.8rem] rounded-[10px] border-[2px] border-solid [border-color:#dc2626] bg-none text-[0.85rem] font-medium mb-[1rem] bg-[var(--danger-bg)] text-[#991b1b]">
          Hồ sơ tài xế đang tạm ngưng. Vui lòng liên hệ quản trị viên.
        </div>
      )}
      <div className="gap-[24px] grid grid-cols-[minmax(0,_1.65fr)_minmax(290px,_1fr)] [align-items:start] [@media(width<=1100px)]:grid-cols-[1fr]">
        <section className="p-[0] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] overflow-x-hidden overflow-y-hidden">
          <div className="px-[22px] py-[20px] gap-[1rem] flex items-start justify-between mb-[1.1rem]">
            <div>
              <h3 className="m-[0] font-medium text-[1.05rem]">Camera tại thiết bị</h3>
              <p className="mx-[0] mt-[0.15rem] mb-[0] text-[0.83rem] text-[var(--ink-muted)]">
                {model.data.device_id || 'Raspberry Pi'}
              </p>
            </div>
            <Badge tone={model.loading ? 'neutral' : model.data.available ? 'green' : 'yellow'}>
              {model.loading
                ? 'Đang kiểm tra'
                : model.data.available
                  ? 'Đã kết nối'
                  : 'Chưa kết nối'}
            </Badge>
          </div>
          <div
            className={cx(
              "[&::before]:[content:''] [&::before]:absolute [&::before]:top-[0] [&::before]:right-[0] [&::before]:bottom-[0] [&::before]:left-[0] [&::before]:[background-image:radial-gradient(#d8deed_1px,_transparent_1px)] [&::before]:[background-size:20px_20px] [&::before]:opacity-[0.6] [&::before]:pointer-events-none px-[32px] bg-none min-h-[350px] relative pt-[62px] pb-[48px] flex flex-col items-center justify-center text-center bg-[#edf0f7] text-[#283149] [border-top-width:1px] [border-top-style:solid] [border-top-color:var(--border)] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] overflow-x-hidden overflow-y-hidden",
            )}
          >
            {busy && (
              <span
                ref={scanLine}
                aria-hidden="true"
                className="absolute left-[10%] right-[10%] h-[1px] top-[28%] bg-[#a2b2ff] [box-shadow:0_0_12px_#a2b2ff]"
              />
            )}
            <span className="border-solid [border-color:#b9c3df] z-[1] absolute w-[25px] h-[25px] [border-top-width:2px] [border-right-width:0] [border-bottom-width:0] [border-left-width:2px] left-[24px] top-[24px] [border-top-left-radius:10px]" />
            <span className="border-solid [border-color:#b9c3df] z-[1] absolute w-[25px] h-[25px] [border-top-width:2px] [border-right-width:2px] [border-bottom-width:0] [border-left-width:0] right-[24px] top-[24px] [border-top-right-radius:10px]" />
            <span className="border-solid [border-color:#b9c3df] z-[1] absolute w-[25px] h-[25px] [border-top-width:0] [border-right-width:0] [border-bottom-width:2px] [border-left-width:2px] left-[24px] bottom-[24px] [border-bottom-left-radius:10px]" />
            <span className="border-solid [border-color:#b9c3df] z-[1] absolute w-[25px] h-[25px] [border-top-width:0] [border-right-width:2px] [border-bottom-width:2px] [border-left-width:0] right-[24px] bottom-[24px] [border-bottom-right-radius:10px]" />
            <div
              ref={faceSymbol}
              className={cx(
                'rounded-[30px] border-[1px] border-solid [border-color:#c7cfe5] bg-none z-[1] w-[112px] h-[112px] grid place-items-center mb-[22px] bg-[#f7f8ff]',
                busy && 'text-[#4f65ad]',
                !busy && 'text-[#7887bb]',
              )}
            >
              {busy ? (
                <ScanFace size={80} strokeWidth={1} />
              ) : success ? (
                <CheckCircle2 size={76} strokeWidth={1.1} />
              ) : (
                <Camera size={72} strokeWidth={1.1} />
              )}
            </div>
            <h2 className="m-[0] font-medium z-[1] text-[18px] leading-[1.5]">
              {busy
                ? 'Hãy nhìn thẳng vào camera Pi'
                : success
                  ? 'Xác minh đã hoàn tất'
                  : 'Sẵn sàng nhận diện tại Raspberry Pi'}
            </h2>
            <p className="mx-[0] mt-[10px] mb-[20px] z-[1] text-[12px] leading-[1.9] text-[#72809b] max-w-[350px]">
              {busy
                ? 'Thiết bị đang chụp ảnh và đối chiếu khuôn mặt với hồ sơ của bạn. Giữ khuôn mặt trong vùng đủ sáng.'
                : 'Bấm thao tác bên cạnh, sau đó đứng trước camera được gắn trên thiết bị.'}
            </p>
            <span className="gap-[8px] z-[1] inline-flex items-center text-[9px] tracking-[1px] text-[#75809d]">
              {busy ? (
                <LoaderCircle size={14} className="animate-spin [animation-duration:0.9s]" />
              ) : (
                <Radio size={14} />
              )}
              {busy ? 'ĐANG CHỜ KẾT QUẢ TỪ PI' : 'CAMERA XỬ LÝ TẠI THIẾT BỊ'}
            </span>
          </div>
          <div className="p-[22px] gap-[14px] flex">
            {['Chọn check-in / check-out', 'Nhìn vào camera Pi', 'Nhận kết quả trên web'].map(
              (text, i) => (
                <div
                  className="gap-[8px] flex items-center grow-[1] shrink-[1] basis-[0%]"
                  key={text}
                >
                  <span className="rounded-[50%] border-[1px] border-solid [border-color:var(--border)] bg-none w-[23px] h-[23px] shrink-[0] grid place-items-center bg-[var(--bg-subtle)] text-[10px]">
                    {i + 1}
                  </span>
                  <p className="m-[0] text-[10px] leading-[1.7] text-[var(--ink-muted)]">{text}</p>
                  {i < 2 && (
                    <ArrowRight
                      className="text-[var(--ink-muted)] shrink-[0] ml-[auto]"
                      size={14}
                    />
                  )}
                </div>
              ),
            )}
          </div>
        </section>
        <aside className="gap-[1rem] flex flex-col">
          <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.75rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex flex-col">
            <span className="rounded-[12px] border-[2px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[42px] h-[42px] text-[#11141c] [box-shadow:var(--shadow-hard-sm)] bg-[var(--primary)]">
              <Fingerprint size={25} />
            </span>
            <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
              HỒ SƠ ĐANG XÁC MINH
            </span>
            <h2 className="m-[0] font-medium text-[1.3rem] leading-[1.25]">{user.full_name}</h2>
            <p className="m-[0] text-[0.85rem] text-[var(--ink-muted)]">
              Mã tài xế: {user.driver?.driver_code || '—'}
            </p>
            <div className="px-[0.8rem] py-[0.65rem] rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none flex justify-between items-center bg-[var(--bg-subtle)] text-[0.83rem] font-medium">
              <span>Trạng thái ca</span>
              <Badge tone={inShift ? 'green' : 'neutral'}>
                {history.loading ? 'Đang tải' : inShift ? 'Đang trong ca' : 'Ngoài ca'}
              </Badge>
            </div>
            <div className="px-[0.8rem] py-[0.65rem] rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none flex justify-between items-center bg-[var(--bg-subtle)] text-[0.83rem] font-medium">
              <span>Khuôn mặt</span>
              <Badge tone={registered ? 'green' : 'yellow'}>
                {registered ? 'Đã đăng ký' : 'Chưa đăng ký'}
              </Badge>
            </div>
            {!model.data.available && !model.loading && (
              <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1.5px] border-solid [border-color:#f59e0b] gap-[0.35rem] bg-none bg-[#fef3c7] text-[#78350f] text-[0.8rem] flex flex-col">
                <p className="m-[0]">
                  Pi chưa kết nối. Bật thiết bị và chạy chương trình nhận diện để tiếp tục.
                </p>
                <button
                  className="p-[0] border-[0] border-none [border-color:currentColor] gap-[0.35rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--brand)] cursor-pointer inline-flex items-center bg-[transparent] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:hover]:underline"
                  onClick={() => void model.refresh()}
                  disabled={!!busy}
                >
                  <RefreshCw size={13} />
                  Kiểm tra lại
                </button>
              </div>
            )}
            {registered ? (
              <div className="gap-[0.6rem] flex flex-col">
                <button
                  className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] w-[100%] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                  disabled={!ready || inShift}
                  onClick={() => void request('CHECK_IN')}
                >
                  {busy === 'CHECK_IN' ? (
                    <LoaderCircle className="animate-spin [animation-duration:0.9s]" size={17} />
                  ) : (
                    <LogIn size={17} />
                  )}
                  Check-in · Bắt đầu ca
                </button>
                <button
                  className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] w-[100%] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                  disabled={!ready || !inShift}
                  onClick={() => void request('CHECK_OUT')}
                >
                  {busy === 'CHECK_OUT' ? (
                    <LoaderCircle className="animate-spin [animation-duration:0.9s]" size={17} />
                  ) : (
                    <LogOut size={17} />
                  )}
                  Check-out · Kết thúc ca
                </button>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">Vào <Link href="/driver/profile#face-verification" className="text-[var(--ink)] underline">hồ sơ cá nhân</Link> để bắt đầu xác nhận và thêm ảnh khuôn mặt trước khi chấm công.</p>
            )}
            <div className="gap-[0.5rem] flex items-center text-[0.8rem] text-[var(--ink-muted)] pt-[0.5rem] [border-top-width:1px] [border-top-style:dashed] [border-top-color:var(--border)]">
              <ShieldCheck size={17} />
              <p className="m-[0]">
                Kết quả chỉ được ghi cho hồ sơ liên kết với tài khoản đăng nhập và khuôn mặt khớp.
              </p>
            </div>
          </section>
          <div className="px-[1.15rem] py-[1rem] rounded-[14px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.45rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] flex flex-col text-[0.82rem]">
            <strong className="font-medium">Để nhận diện tốt hơn</strong>
            {[
              'Đứng trước camera gắn trên Pi.',
              'Giữ khuôn mặt rõ nét và nhìn thẳng.',
              'Bỏ khẩu trang, tránh ngược sáng.',
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
  );
}
