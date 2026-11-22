'use client';
import { cx } from '@/lib/styles';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  Fingerprint,
  Plus,
  RefreshCw,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';
import { Attendance, Driver, localDay, Telemetry, User } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Empty, Loading, Metric, Notice } from './ui';
import { AttendanceTable } from './admin-pages';

export default function Overview({ user }: { user: User }) {
  const admin = user.role === 'admin';
  const driver = user.role === 'driver';
  const drivers = useData<Driver[]>(admin ? 'drivers' : null, []);
  const attendance = useData<Attendance[]>(
    admin ? 'attendance' : driver ? 'recognition/history' : null,
    [],
  );
  const telemetry = useData<Telemetry[]>(admin ? 'telemetry?limit=50' : null, []);
  const model = useData<{ available: boolean }>('recognition/status', { available: false });
  const loading = drivers.loading || attendance.loading || telemetry.loading;
  const error = drivers.error || attendance.error || telemetry.error;
  const today = localDay(new Date().toISOString());
  const todayLogs = attendance.data.filter((a) => localDay(a.timestamp) === today);
  const activeDrivers = new Set<number>();
  const latest = new Map<number, Attendance>();
  attendance.data.forEach((a) => {
    if (!latest.has(a.driver_id)) latest.set(a.driver_id, a);
  });
  latest.forEach((a) => {
    if (a.check_type === 'CHECK_IN') activeDrivers.add(a.driver_id);
  });
  const deviceMap = new Map<string, Telemetry>();
  telemetry.data.forEach((t) => {
    if (!deviceMap.has(t.device_id)) deviceMap.set(t.device_id, t);
  });
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const day = localDay(date.toISOString());
    return {
      label: new Intl.DateTimeFormat('vi-VN', {
        weekday: 'short',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(date),
      count: attendance.data.filter(
        (a) => localDay(a.timestamp) === day && a.check_type === 'CHECK_IN',
      ).length,
      today: i === 6,
    };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <>
      <div className="gap-[1rem] flex items-end justify-between flex-wrap mb-[1.4rem]">
        <div>
          <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
            WORKSPACE / TỔNG QUAN
          </span>
          <h1 className="m-[0] font-medium text-[clamp(1.45rem,_2.4vw,_1.95rem)] tracking-[-0.02em]">
            Tổng quan
          </h1>
          <p className="mx-[0] mt-[0.2rem] mb-[0] text-[var(--ink-muted)] text-[0.9rem]">
            {admin
              ? 'Theo dõi tài xế, điểm danh và thiết bị.'
              : driver
                ? 'Xem hồ sơ và theo dõi điểm danh.'
                : 'Quản lý tài khoản và hồ sơ tài xế.'}
          </p>
        </div>
        <button
          className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
          onClick={() => {
            void drivers.refresh();
            void attendance.refresh();
            void telemetry.refresh();
            void model.refresh();
          }}
          disabled={loading || model.loading}
        >
          <RefreshCw
            size={15}
            className={cx(loading && 'animate-spin [animation-duration:0.9s]')}
          />
          Làm mới
        </button>
      </div>
      <Notice error={error} />
      <section className="px-[2rem] py-[1.85rem] rounded-[18px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[1.5rem] grid grid-cols-[1.2fr_1fr] items-center [background-image:linear-gradient(135deg,_#e0e7ff_0%,_#ede9fe_55%,_#dcfce7_100%)] bg-[transparent] text-[#11141c] [box-shadow:var(--shadow-hard)] mb-[1.65rem] overflow-x-hidden overflow-y-hidden [@media(width<=1024px)]:grid-cols-[1fr]">
        <div>
          <span className="px-[0.75rem] py-[0.3rem] rounded-[999px] border-[1.5px] border-solid [border-color:var(--border-strong)] gap-[0.45rem] bg-none inline-flex items-center text-[0.7rem] font-medium tracking-[0.06em] uppercase bg-[var(--bg-surface)] text-[#11141c] [box-shadow:var(--shadow-hard-sm)]">
            <span className="rounded-[999px] bg-none inline-block w-[8px] h-[8px] bg-[#22c55e] [box-shadow:0_0_0_3px_rgba(34,_197,_94,_0.2)] shrink-[0]" />{' '}
            {admin ? 'QUẢN TRỊ' : driver ? 'TÀI XẾ' : 'NGƯỜI DÙNG'}
          </span>
          <h2 className="mx-[0] mt-[0.85rem] mb-[0.6rem] font-medium text-[clamp(1.5rem,_2.5vw,_2.1rem)] leading-[1.15]">
            {admin ? 'Quản lý tài xế' : driver ? 'Điểm danh ca làm' : 'Đăng ký hồ sơ tài xế'}
          </h2>
          <p className="mx-[0] mt-[0] mb-[1.25rem] text-[0.92rem] text-[#334155] max-w-[470px]">
            {admin
              ? 'Quản lý hồ sơ, theo dõi điểm danh và dữ liệu thiết bị trong cùng một không gian.'
              : driver
                ? 'Kiểm tra hồ sơ, xác minh khuôn mặt và điểm danh trước khi bắt đầu ca làm.'
                : 'Đăng ký hồ sơ tài xế để sử dụng điểm danh bằng nhận diện khuôn mặt.'}
          </p>
          <Link
            className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:#11141c] gap-[0.5rem] bg-none text-[#ffffff] no-underline inline-flex items-center justify-center text-[0.84rem] font-medium [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[#11141c] [box-shadow:3px_3px_0px_0px_var(--primary)] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
            href={`/${user.role}/${admin ? 'drivers' : driver ? 'check-in' : 'register-driver'}`}
          >
            {admin ? 'Quản lý tài xế' : driver ? 'Điểm danh ngay' : 'Đăng ký tài xế'}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="relative min-h-[210px] flex items-center justify-center" aria-hidden="true">
          <div />
          <div />
          <div className="p-[0.95rem] rounded-[16px] border-[2px] border-solid [border-color:#11141c] bg-none relative z-[2] w-[210px] bg-[#ffffff] [box-shadow:var(--shadow-hard)]">
            <div className="flex justify-between items-center text-[0.68rem] font-medium tracking-[0.08em] mb-[0.65rem]">
              <span>DRIVER ID</span>
              <ShieldCheck size={19} />
            </div>
            <div className="rounded-[10px] border-[1.5px] border-solid [border-color:#11141c] bg-none h-[78px] bg-[var(--primary)] flex items-center justify-center mb-[0.65rem]">
              <Truck size={51} strokeWidth={1.4} />
            </div>
            <div className="gap-[0.35rem] flex flex-col mb-[0.65rem]">
              <span className="rounded-[999px] bg-none h-[7px] bg-[#e2e8f0] [&:first-child]:bg-[#11141c] [&:first-child]:w-[78%]" />
              <span className="rounded-[999px] bg-none h-[7px] bg-[#e2e8f0] [&:first-child]:bg-[#11141c] [&:first-child]:w-[78%]" />
            </div>
            <div className="gap-[0.4rem] flex items-center text-[0.64rem] font-medium tracking-[0.06em]">
              <span className="rounded-[999px] bg-none inline-block w-[8px] h-[8px] bg-[#22c55e] [box-shadow:0_0_0_3px_rgba(34,_197,_94,_0.2)] shrink-[0]" />{' '}
              READY FOR THE ROAD
            </div>
          </div>
          <div className="px-[0.7rem] py-[0.4rem] rounded-[999px] border-[2px] border-solid [border-color:#11141c] gap-[0.4rem] bg-none absolute z-[3] inline-flex items-center bg-[var(--yellow)] [box-shadow:var(--shadow-hard-sm)] text-[0.68rem] font-medium top-[0.35rem] right-[0.5rem]">
            <Fingerprint size={22} /> FACE RECOGNITION
          </div>
          <div className="px-[0.7rem] py-[0.4rem] rounded-[999px] border-[2px] border-solid [border-color:#11141c] gap-[0.4rem] bg-none absolute z-[3] inline-flex items-center bg-[#ffffff] [box-shadow:var(--shadow-hard-sm)] text-[0.68rem] font-medium bottom-[0.35rem] left-[0.25rem]">
            <span className="rounded-[999px] border-[1.5px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[24px] h-[24px] bg-[var(--mint)] text-[#11141c] shrink-[0]">
              <Check size={14} />
            </span>{' '}
            DRIVE WITH CONFIDENCE
          </div>
          <span className="absolute bottom-[0.8rem] right-[1.2rem] text-[1.4rem]">✳</span>
        </div>
      </section>
      {admin ? (
        <>
          <div className="flex justify-between items-center text-[0.72rem] font-medium tracking-[0.08em] text-[var(--ink-muted)] mb-[0.85rem]">
            <span className="gap-[0.4rem] inline-flex items-center">
              <Activity size={15} /> HOẠT ĐỘNG HÔM NAY
            </span>
            <span className="gap-[0.4rem] inline-flex items-center">
              <CalendarDays size={14} />
              {new Date().toLocaleDateString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="gap-[1rem] grid grid-cols-[repeat(4,_minmax(0,_1fr))] mb-[1.35rem] [@media(640px<width<=1024px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=640px)]:grid-cols-[1fr]">
            <Metric
              label="Tổng số tài xế"
              value={loading ? '—' : drivers.data.length}
              note={`${drivers.data.filter((d) => d.is_active).length} hồ sơ đang hoạt động`}
              icon={<Users size={21} />}
              tone="lavender"
            />
            <Metric
              label="Tài xế đang trong ca"
              value={loading ? '—' : activeDrivers.size}
              note="Theo lượt điểm danh gần nhất"
              icon={<Truck size={21} />}
              tone="mint"
            />
            <Metric
              label="Lượt điểm danh hôm nay"
              value={loading ? '—' : todayLogs.length}
              note={`${todayLogs.filter((a) => a.check_type === 'CHECK_IN').length} check-in · ${todayLogs.filter((a) => a.check_type === 'CHECK_OUT').length} check-out`}
              icon={<ClipboardCheck size={21} />}
              tone="peach"
            />
            <Metric
              label="Thiết bị ghi nhận"
              value={loading ? '—' : deviceMap.size}
              note="Trong 50 bản tin gần nhất"
              icon={<Activity size={21} />}
              tone="yellow"
            />
          </div>
          <div className="gap-[1.15rem] grid grid-cols-[1.55fr_1fr] mb-[1.35rem] [@media(width<=1024px)]:grid-cols-[1fr]">
            <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)]">
              <div className="gap-[1rem] flex items-start justify-between mb-[1.1rem]">
                <div>
                  <h3 className="m-[0] font-medium text-[1.05rem]">Nhịp hoạt động</h3>
                  <p className="mx-[0] mt-[0.15rem] mb-[0] text-[0.83rem] text-[var(--ink-muted)]">
                    Lượt check-in trong 7 ngày gần nhất
                  </p>
                </div>
                <span className="px-[0.75rem] py-[0.3rem] rounded-[999px] border-[1.5px] border-solid [border-color:var(--border)] gap-[0.45rem] bg-none inline-flex items-center text-[0.7rem] font-medium tracking-[0.06em] uppercase bg-[var(--bg-subtle)] text-[var(--ink-secondary)]">
                  7 NGÀY QUA
                </span>
              </div>
              <div className="gap-[0.75rem] grid grid-cols-[28px_minmax(0,_1fr)] items-stretch pt-[0.5rem]">
                <div className="flex flex-col justify-between pb-[1.65rem] text-[0.72rem] text-[var(--ink-muted)] text-right">
                  <span>{max}</span>
                  <span>{Math.round(max / 2)}</span>
                  <span>0</span>
                </div>
                <div
                  className="gap-[0.65rem] grid grid-cols-[repeat(7,_minmax(0,_1fr))]"
                  role="img"
                  aria-label={days.map((d) => `${d.label}: ${d.count} check-in`).join(', ')}
                >
                  {days.map((d, i) => (
                    <div
                      className="gap-[0.45rem] flex flex-col items-center text-[0.75rem] font-medium text-[var(--ink-muted)]"
                      key={i}
                    >
                      <div className="p-[4px] rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none w-[100%] h-[168px] bg-[var(--bg-subtle)] flex items-end">
                        <svg
                          width="100%"
                          height={`${Math.max(d.count ? 6 : 0, (d.count / max) * 100)}%`}
                          className="min-h-[4px] overflow-visible [transition:height_0.25s_ease]"
                          aria-hidden="true"
                        >
                          <foreignObject width="100%" height="100%" className="overflow-visible">
                            <div
                              className={cx(
                                'rounded-[6px] border-[1.5px] border-solid [border-color:#11141c] bg-none w-[100%] h-full flex items-start justify-center min-h-[4px]',
                                d.today && 'bg-[var(--mint)]',
                                !d.today && 'bg-[var(--primary)]',
                              )}
                            >
                              <span className="text-[0.68rem] font-medium text-[#11141c] [transform:translateY(-18px)]">
                                {d.count}
                              </span>
                            </div>
                          </foreignObject>
                        </svg>
                      </div>
                      <span>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.75rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex flex-col">
              <span className="rounded-[12px] border-[2px] border-solid [border-color:#11141c] bg-none w-[46px] h-[46px] bg-[var(--mint)] text-[#11141c] [box-shadow:var(--shadow-hard-sm)] inline-flex items-center justify-center">
                <ShieldCheck size={27} />
              </span>
              <h3 className="m-[0] font-medium">Trạng thái kết nối</h3>
              <p className="m-[0] text-[0.84rem] text-[var(--ink-muted)]">
                Kiểm tra các dịch vụ phục vụ vận hành.
              </p>
              <div className="px-[0.85rem] py-[0.7rem] rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none flex justify-between items-center bg-[var(--bg-subtle)] text-[0.84rem] font-medium">
                <span>API & cơ sở dữ liệu</span>
                <Badge tone={error ? 'red' : loading ? 'neutral' : 'green'}>
                  {error ? 'Chưa kết nối' : loading ? 'Đang kiểm tra' : 'Đã kết nối'}
                </Badge>
              </div>
              <div className="px-[0.85rem] py-[0.7rem] rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none flex justify-between items-center bg-[var(--bg-subtle)] text-[0.84rem] font-medium">
                <span>Model khuôn mặt</span>
                <Badge tone={model.loading ? 'neutral' : model.data.available ? 'green' : 'yellow'}>
                  {model.loading
                    ? 'Đang kiểm tra'
                    : model.data.available
                      ? 'Sẵn sàng'
                      : 'Chưa kết nối'}
                </Badge>
              </div>
              <Link
                href="/admin/devices"
                className="p-[0] border-[0] border-none [border-color:currentColor] gap-[0.35rem] bg-none text-[var(--brand)] no-underline inline-flex items-center text-[0.84rem] font-medium bg-[transparent] [&:hover]:underline"
              >
                Xem giám sát thiết bị
                <ArrowRight size={14} />
              </Link>
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center text-[0.72rem] font-medium tracking-[0.08em] text-[var(--ink-muted)] mb-[0.85rem]">
            <span className="gap-[0.4rem] inline-flex items-center">
              <Fingerprint size={15} /> CÁC BƯỚC THỰC HIỆN
            </span>
            <span className="gap-[0.4rem] inline-flex items-center">3 BƯỚC</span>
          </div>
          <div className="gap-[1rem] grid grid-cols-[repeat(3,_minmax(0,_1fr))] mb-[1.35rem] [@media(width<=640px)]:grid-cols-[1fr]">
            {[
              {
                number: '01',
                title: 'Đăng ký hồ sơ',
                text: 'Thông tin cá nhân và giấy phép lái xe.',
                done: !!user.driver_id,
                href: driver ? '/driver/profile' : '/user/register-driver',
              },
              {
                number: '02',
                title: 'Thêm khuôn mặt',
                text: 'Đăng ký ảnh rõ nét để model nhận diện.',
                done: !!user.driver?.face_registered,
                href: driver ? '/driver/check-in' : '/user/register-driver',
              },
              {
                number: '03',
                title: 'Điểm danh ca làm',
                text: 'Xác minh khuôn mặt để check-in / check-out.',
                done: attendance.data.length > 0,
                href: driver ? '/driver/check-in' : '/user/register-driver',
              },
            ].map((step) => (
              <Link
                className="text-inherit p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.6rem] bg-none [font-size:inherit] no-underline bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex flex-col [transition:transform_0.15s_ease] [&:hover]:[transform:translate(-2px,_-2px)]"
                key={step.number}
                href={step.href}
              >
                <div className="flex justify-between items-center">
                  <span className="[font-family:var(--font-mono)] text-[1.2rem] font-medium text-[var(--brand)]">
                    {step.number}
                  </span>
                  {step.done ? (
                    <span className="rounded-[999px] border-[1.5px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[24px] h-[24px] bg-[var(--mint)] text-[#11141c] shrink-[0]">
                      <Check size={14} />
                    </span>
                  ) : (
                    <ArrowUpRight size={18} />
                  )}
                </div>
                <h3 className="m-[0] font-medium">{step.title}</h3>
                <p className="m-[0] text-[0.84rem] text-[var(--ink-muted)] grow-[1] shrink-[1] basis-[0%]">
                  {step.text}
                </p>
                <Badge tone={step.done ? 'green' : 'neutral'}>
                  {step.done ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                </Badge>
              </Link>
            ))}
          </div>
          {driver && (
            <div className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[1.1rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex items-center mb-[1.35rem] flex-wrap">
              <div className="[&:nth-child(2)]:grow-[1] [&:nth-child(2)]:shrink-[1] [&:nth-child(2)]:basis-[0%] [&:nth-child(2)]:min-w-[220px] rounded-[14px] border-[2px] border-solid [border-color:#11141c] bg-none w-[52px] h-[52px] bg-[var(--primary)] text-[#11141c] [box-shadow:var(--shadow-hard-sm)] flex items-center justify-center">
                <Truck size={26} />
              </div>
              <div className="[&:nth-child(2)]:grow-[1] [&:nth-child(2)]:shrink-[1] [&:nth-child(2)]:basis-[0%] [&:nth-child(2)]:min-w-[220px]">
                <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
                  TRẠNG THÁI CA LÀM
                </span>
                <h3 className="m-[0] font-medium">
                  {attendance.loading
                    ? 'Đang kiểm tra…'
                    : attendance.data[0]?.check_type === 'CHECK_IN'
                      ? 'Bạn đang trong ca'
                      : 'Bạn chưa bắt đầu ca mới'}
                </h3>
                <p className="m-[0]">
                  {user.driver?.is_active
                    ? 'Hồ sơ tài xế đang hoạt động.'
                    : 'Hồ sơ tài xế đang tạm ngưng. Vui lòng liên hệ quản trị viên.'}
                </p>
              </div>
              <Link
                className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none text-[var(--ink)] no-underline inline-flex items-center justify-center text-[0.84rem] font-medium [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                href="/driver/check-in"
              >
                Mở điểm danh
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </>
      )}
      {(admin || driver) && (
        <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] mt-[0.5rem]">
          <div className="gap-[1rem] flex items-start justify-between mb-[1.1rem]">
            <div>
              <h3 className="m-[0] font-medium text-[1.05rem]">Điểm danh gần đây</h3>
              <p className="mx-[0] mt-[0.15rem] mb-[0] text-[0.83rem] text-[var(--ink-muted)]">
                {admin
                  ? 'Các hoạt động mới nhất của đội ngũ tài xế'
                  : 'Những lần check-in và check-out của bạn'}
              </p>
            </div>
            <Link
              className="p-[0] border-[0] border-none [border-color:currentColor] gap-[0.35rem] bg-none text-[var(--brand)] no-underline inline-flex items-center text-[0.84rem] font-medium bg-[transparent] [&:hover]:underline"
              href={`/${user.role}/attendance`}
            >
              Xem tất cả
              <ArrowUpRight size={15} />
            </Link>
          </div>
          {attendance.loading ? (
            <Loading />
          ) : attendance.data.length ? (
            <AttendanceTable rows={attendance.data.slice(0, 5)} showDriver={admin} />
          ) : (
            <Empty title="Chưa có lượt điểm danh">
              Lượt điểm danh được xác minh sẽ hiển thị tại đây.
            </Empty>
          )}
        </section>
      )}
    </>
  );
}
