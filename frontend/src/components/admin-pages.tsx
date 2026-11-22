'use client';
import { cx } from '@/lib/styles';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Attendance, Driver, formatTime, localDay, roleLabel, Telemetry, User } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { downloadCsv } from '@/lib/export';
import { Badge, Empty, Loading, Notice } from './ui';

function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="gap-[1rem] flex items-end justify-between flex-wrap mb-[1.4rem]">
      <div>
        <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
          WORKSPACE / {eyebrow}
        </span>
        <h1 className="m-[0] font-medium text-[clamp(1.45rem,_2.4vw,_1.95rem)] tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mx-[0] mt-[0.2rem] mb-[0] text-[var(--ink-muted)] text-[0.9rem]">
          {description}
        </p>
      </div>
      <div className="gap-[0.65rem] flex items-center">{children}</div>
    </div>
  );
}
function Pagination({
  page,
  setPage,
  total,
}: {
  page: number;
  setPage: (value: number) => void;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / 8));
  return (
    <div className="flex justify-between items-center pt-[1rem] mt-[0.5rem] text-[0.8rem] text-[var(--ink-muted)]">
      <span>
        {total
          ? `${(page - 1) * 8 + 1}–${Math.min(page * 8, total)} trên ${total} kết quả`
          : '0 kết quả'}
      </span>
      <div className="gap-[0.6rem] flex items-center font-medium text-[var(--ink)]">
        <button
          className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
          aria-label="Trang sau"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function AttendanceTable({
  rows,
  showDriver = true,
}: {
  rows: Attendance[];
  showDriver?: boolean;
}) {
  return (
    <div className="w-[100%] overflow-x-auto">
      <table className="w-[100%] [border-collapse:collapse] text-left text-[0.87rem]">
        <thead>
          <tr>
            {showDriver && (
              <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                Tài xế
              </th>
            )}
            <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
              Hoạt động
            </th>
            <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
              Thời gian
            </th>
            <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
              Độ tương đồng
            </th>
            <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
              Nguồn
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="[&:hover]:bg-none [&:hover]:bg-[var(--bg-subtle)]" key={row.id}>
              {showDriver && (
                <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                  <div className="gap-[0.65rem] flex items-center">
                    <span className="rounded-[10px] border-[1.5px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--primary)] text-[#11141c] font-medium text-[0.88rem] shrink-[0]">
                      {(row.driver_name || 'T').charAt(0)}
                    </span>
                    <div>
                      <strong className="font-medium block text-[0.88rem]">
                        {row.driver_name || `Tài xế #${row.driver_id}`}
                      </strong>
                      <small className="block text-[0.75rem] text-[var(--ink-muted)] [font-family:var(--font-mono)]">
                        {row.driver_code || `ID ${row.driver_id}`}
                      </small>
                    </div>
                  </div>
                </td>
              )}
              <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                <Badge tone={row.check_type === 'CHECK_IN' ? 'green' : 'purple'}>
                  {row.check_type === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
                </Badge>
              </td>
              <td className="p-[0.85rem] [font-family:var(--font-mono)] text-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                {formatTime(row.timestamp)}
              </td>
              <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                {row.confidence_score != null ? (
                  <span className="gap-[0.5rem] inline-flex items-center font-medium text-[0.82rem]">
                    <span className="rounded-[999px] border-[1px] border-solid [border-color:var(--border)] bg-none w-[64px] h-[8px] bg-[var(--bg-subtle)] overflow-x-hidden overflow-y-hidden">
                      <svg width="100%" height="100%" className="block" aria-hidden="true">
                        <rect
                          width={`${Math.min(100, Math.max(0, row.confidence_score))}%`}
                          height="100%"
                          className="fill-[#22c55e]"
                        />
                      </svg>
                    </span>
                    {Number(row.confidence_score).toFixed(1)}%
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                <span className="px-[0.55rem] py-[0.2rem] rounded-[6px] bg-none inline-block bg-[var(--bg-subtle)] [font-family:var(--font-mono)] text-[0.75rem]">
                  {row.device_id || '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AttendancePage({ user }: { user: User }) {
  const admin = user.role === 'admin';
  const { data, loading, error, refresh } = useData<Attendance[]>(
    admin ? 'attendance' : 'recognition/history',
    [],
  );
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const filtered = data.filter(
    (row) =>
      (!type || row.check_type === type) &&
      (!date || localDay(row.timestamp) === date) &&
      `${row.driver_name || ''} ${row.driver_code || ''} ${row.device_id || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  useEffect(() => setPage(1), [search, type, date]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  return (
    <>
      <PageHeading
        eyebrow="ĐIỂM DANH"
        title="Lịch sử điểm danh"
        description={
          admin
            ? 'Theo dõi và tra cứu lịch sử điểm danh của toàn bộ tài xế.'
            : 'Lịch sử check-in và check-out đã được xác minh của bạn.'
        }
      >
        <button
          className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
          onClick={() =>
            downloadCsv('driverhub-diem-danh.csv', [
              ['Tài xế', 'Mã', 'Loại', 'Thời gian', 'Tương đồng (%)', 'Thiết bị'],
              ...filtered.map((r) => [
                r.driver_name || user.full_name,
                r.driver_code || r.driver_id,
                r.check_type,
                formatTime(r.timestamp),
                r.confidence_score,
                r.device_id,
              ]),
            ])
          }
          disabled={!filtered.length}
        >
          <Download size={16} />
          Xuất CSV
        </button>
      </PageHeading>
      <Notice error={error} />
      <div className="gap-[1rem] grid grid-cols-[repeat(3,_minmax(0,_1fr))] mb-[1.15rem] [@media(width<=640px)]:grid-cols-[1fr]">
        <div className="px-[1.2rem] py-[1rem] rounded-[14px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)]">
          <span className="block text-[0.78rem] font-medium text-[var(--ink-muted)]">
            Tổng lượt điểm danh
          </span>
          <strong className="font-medium block text-[1.55rem] mt-[0.15rem]">{data.length}</strong>
        </div>
        <div className="px-[1.2rem] py-[1rem] rounded-[14px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)]">
          <span className="block text-[0.78rem] font-medium text-[var(--ink-muted)]">Check-in</span>
          <strong className="font-medium block text-[1.55rem] mt-[0.15rem]">
            {data.filter((r) => r.check_type === 'CHECK_IN').length}
          </strong>
        </div>
        <div className="px-[1.2rem] py-[1rem] rounded-[14px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)]">
          <span className="block text-[0.78rem] font-medium text-[var(--ink-muted)]">
            Check-out
          </span>
          <strong className="font-medium block text-[1.55rem] mt-[0.15rem]">
            {data.filter((r) => r.check_type === 'CHECK_OUT').length}
          </strong>
        </div>
      </div>
      <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)]">
        <div className="gap-[0.85rem] flex justify-between items-center flex-wrap mb-[1rem]">
          <div className="relative grow-[1] shrink-[1] basis-[0%] min-w-[220px] max-w-[380px] flex items-center">
            <Search
              className="absolute left-[0.8rem] text-[var(--ink-muted)] pointer-events-none"
              size={17}
            />
            <input
              className="py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] pr-[0.85rem] pl-[2.4rem]! bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Tìm điểm danh"
              placeholder={admin ? 'Tìm tên, mã tài xế, thiết bị…' : 'Tìm theo thiết bị…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="gap-[0.6rem] flex items-center flex-wrap">
            <input
              className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] min-w-[155px] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
              type="date"
              aria-label="Lọc ngày điểm danh"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <select
              className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[auto] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] min-w-[155px] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Lọc loại điểm danh"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Tất cả hoạt động</option>
              <option value="CHECK_IN">Check-in</option>
              <option value="CHECK_OUT">Check-out</option>
            </select>
            <button
              className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Tải lại điểm danh"
              onClick={() => void refresh()}
            >
              <RefreshCw
                size={16}
                className={cx(loading && 'animate-spin [animation-duration:0.9s]')}
              />
            </button>
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : filtered.length ? (
          <AttendanceTable
            rows={filtered.slice((safePage - 1) * 8, safePage * 8)}
            showDriver={admin}
          />
        ) : (
          <Empty title={data.length ? 'Không tìm thấy kết quả' : 'Chưa có lịch sử điểm danh'}>
            Thử thay đổi bộ lọc hoặc bắt đầu điểm danh bằng khuôn mặt.
          </Empty>
        )}
        <Pagination page={safePage} setPage={setPage} total={filtered.length} />
      </section>
      <p className="mx-[0] mt-[0.85rem] mb-[0] text-[0.8rem] text-[var(--ink-muted)]">
        Thời gian hiển thị theo múi giờ Việt Nam (UTC+7). Độ tương đồng là điểm so khớp từ model,
        không phải xác suất nhận diện.
      </p>
    </>
  );
}

export { default as DriversPage } from './drivers-page';

export function AccountsPage({ user }: { user: User }) {
  const { data, loading, error, refresh } = useData<User[]>('auth/accounts', []);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const filtered = data.filter((u) =>
    `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  useEffect(() => setPage(1), [search]);
  async function changeRole(account: User) {
    const next = account.role === 'admin' ? 'user' : 'admin';
    if (
      !window.confirm(
        `Đổi quyền của ${account.email} thành ${roleLabel[next]}? Các phiên đăng nhập hiện tại của tài khoản này sẽ bị kết thúc.`,
      )
    )
      return;
    setBusy(account.id);
    setSaveError('');
    setSuccess('');
    try {
      await api(`auth/accounts/${account.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: next }),
      });
      setSuccess('Đã cập nhật quyền và kết thúc phiên đăng nhập cũ.');
      void refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Không thể đổi quyền.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PHÂN QUYỀN"
        title="Tài khoản và phân quyền"
        description="Quản lý tài khoản và phạm vi truy cập vào hệ thống."
      />
      <Notice error={error || saveError} success={success} />
      <div className="gap-[1rem] grid grid-cols-[repeat(3,_minmax(0,_1fr))] mb-[1.25rem] [@media(width<=640px)]:grid-cols-[1fr]">
        {(['admin', 'user', 'driver'] as const).map((role) => (
          <div
            className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex flex-col"
            key={role}
          >
            <span
              className={cx(
                'rounded-[12px] border-[2px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[42px] h-[42px] text-[#11141c] [box-shadow:var(--shadow-hard-sm)]',
                role === 'admin' && 'bg-[var(--primary)]',
                role === 'driver' && 'bg-[var(--mint)]',
                !(role === 'driver') && !(role === 'admin') && 'bg-[var(--yellow)]',
              )}
            >
              {role === 'admin' ? (
                <ShieldCheck size={22} />
              ) : role === 'driver' ? (
                <Truck size={22} />
              ) : (
                <UsersIcon />
              )}
            </span>
            <h3 className="m-[0] font-medium">{roleLabel[role]}</h3>
            <p className="m-[0] text-[0.83rem] text-[var(--ink-muted)] grow-[1] shrink-[1] basis-[0%]">
              {role === 'admin'
                ? 'Quản lý tài xế, tài khoản, điểm danh và thiết bị.'
                : role === 'driver'
                  ? 'Đăng ký khuôn mặt, điểm danh và xem lịch sử cá nhân.'
                  : 'Quản lý hồ sơ và đăng ký trở thành tài xế.'}
            </p>
            <strong className="font-medium">
              {data.filter((u) => u.role === role).length} tài khoản
            </strong>
          </div>
        ))}
      </div>
      <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)]">
        <div className="gap-[0.85rem] flex justify-between items-center flex-wrap mb-[1rem]">
          <div className="relative grow-[1] shrink-[1] basis-[0%] min-w-[220px] max-w-[380px] flex items-center">
            <Search
              className="absolute left-[0.8rem] text-[var(--ink-muted)] pointer-events-none"
              size={17}
            />
            <input
              className="py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] pr-[0.85rem] pl-[2.4rem]! bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Tìm tài khoản"
              placeholder="Tìm theo tên hoặc email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
            aria-label="Tải lại tài khoản"
            onClick={() => void refresh()}
          >
            <RefreshCw
              size={16}
              className={cx(loading && 'animate-spin [animation-duration:0.9s]')}
            />
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : !filtered.length ? (
          <Empty title="Không tìm thấy tài khoản" />
        ) : (
          <div className="w-[100%] overflow-x-auto">
            <table className="w-[100%] [border-collapse:collapse] text-left text-[0.87rem]">
              <thead>
                <tr>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    Tài khoản
                  </th>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    Email
                  </th>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    Vai trò
                  </th>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((safePage - 1) * 8, safePage * 8).map((account) => (
                  <tr
                    className="[&:hover]:bg-none [&:hover]:bg-[var(--bg-subtle)]"
                    key={account.id}
                  >
                    <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      <strong className="font-medium">{account.full_name}</strong>
                      {account.id === user.id && (
                        <span className="px-[0.45rem] py-[0.1rem] rounded-[6px] bg-none inline-block ml-[0.45rem] bg-[var(--primary)] text-[#11141c] text-[0.65rem] font-medium">
                          BẠN
                        </span>
                      )}
                    </td>
                    <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      {account.email}
                    </td>
                    <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      <Badge
                        tone={
                          account.role === 'admin'
                            ? 'purple'
                            : account.role === 'driver'
                              ? 'green'
                              : 'neutral'
                        }
                      >
                        {roleLabel[account.role]}
                      </Badge>
                    </td>
                    <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      {account.id === user.id ? (
                        <span className="text-[var(--ink-muted)] text-[0.82rem]">
                          Tài khoản hiện tại
                        </span>
                      ) : account.driver_id ? (
                        <span className="text-[var(--ink-muted)] text-[0.82rem]">
                          Đã liên kết tài xế
                        </span>
                      ) : (
                        <button
                          className="text-inherit px-[0.75rem] py-[0.38rem] rounded-[8px] border-[1.5px] border-solid [border-color:var(--border-strong)] bg-none [font-family:inherit] text-[0.78rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] [font-size:inherit] cursor-pointer bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:hover]:text-[#11141c] [&:hover]:bg-[var(--primary)]"
                          disabled={busy !== null}
                          onClick={() => void changeRole(account)}
                        >
                          {busy === account.id
                            ? 'Đang cập nhật…'
                            : account.role === 'admin'
                              ? 'Chuyển thành người dùng'
                              : 'Cấp quyền admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={safePage} setPage={setPage} total={filtered.length} />
      </section>
    </>
  );
}
function UsersIcon() {
  return <ShieldCheck size={22} />;
}

export function DevicesPage() {
  const { data, loading, error, refresh } = useData<Telemetry[]>('telemetry?limit=200', []);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, refresh]);
  const devices = new Map<string, Telemetry>();
  data.forEach((row) => {
    if (!devices.has(row.device_id)) devices.set(row.device_id, row);
  });
  const filtered = [...devices.values()].filter((row) =>
    `${row.device_id} ${row.driver_name || ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="THIẾT BỊ IOT"
        title="Giám sát thiết bị"
        description="Bản tin mới nhất từ Raspberry Pi và hệ thống giám sát lái xe."
      >
        <button
          className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={cx(loading && 'animate-spin [animation-duration:0.9s]')}
          />
          Làm mới
        </button>
      </PageHeading>
      <Notice error={error} />
      <div className="gap-[0.85rem] flex justify-between items-center flex-wrap mb-[1rem]">
        <div className="relative grow-[1] shrink-[1] basis-[0%] min-w-[220px] max-w-[380px] flex items-center">
          <Search
            className="absolute left-[0.8rem] text-[var(--ink-muted)] pointer-events-none"
            size={17}
          />
          <input
            className="py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] pr-[0.85rem] pl-[2.4rem]! bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
            aria-label="Tìm thiết bị"
            placeholder="Tìm mã thiết bị, tài xế…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="gap-[0.5rem] font-medium inline-flex items-center text-[0.84rem] cursor-pointer">
          <input
            className="text-inherit [font-family:inherit] [font-size:inherit] [font-weight:inherit] leading-[inherit] [font-style:inherit] [font-variant:inherit] [&:disabled]:bg-none [&:disabled]:text-[var(--ink-muted)] [&:disabled]:bg-[var(--bg-subtle)]"
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Tự làm mới mỗi 30 giây
        </label>
      </div>
      {loading && !data.length ? (
        <Loading />
      ) : !filtered.length ? (
        <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)]">
          <Empty title="Chưa nhận được bản tin thiết bị">
            Khi Raspberry Pi gửi telemetry, thiết bị và dữ liệu giám sát sẽ xuất hiện tại đây.
          </Empty>
        </section>
      ) : (
        <div className="gap-[1.1rem] grid grid-cols-[repeat(auto-fill,_minmax(290px,_1fr))]">
          {filtered.map((device) => {
            const recent = Date.now() - new Date(device.created_at).getTime() < 120000;
            const warning = device.alert_level !== 'NORMAL';
            return (
              <section
                className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.65rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex flex-col"
                key={device.device_id}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={cx(
                      'rounded-[12px] border-[2px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[42px] h-[42px] text-[#11141c] [box-shadow:var(--shadow-hard-sm)]',
                      warning && 'bg-[var(--peach)]',
                      !warning && 'bg-[var(--mint)]',
                    )}
                  >
                    <Activity size={23} />
                  </span>
                  <Badge tone={recent ? 'green' : 'neutral'}>
                    {recent ? 'Có dữ liệu gần đây' : 'Chưa có bản tin mới'}
                  </Badge>
                </div>
                <h3 className="m-[0] font-medium">{device.device_id}</h3>
                <p className="m-[0]">{device.driver_name || 'Chưa gắn tài xế'}</p>
                <div className="p-[0.75rem] rounded-[10px] gap-[0.75rem] bg-none grid grid-cols-[1fr_1fr] bg-[var(--bg-subtle)] [&_span]:block [&_span]:mb-[0.2rem] [&_span]:text-[0.72rem] [&_span_span]:text-[var(--ink-muted)]">
                  <div>
                    <span className="block text-[0.72rem] text-[var(--ink-muted)] mb-[0.2rem]">
                      Tốc độ
                    </span>
                    <strong className="font-medium">
                      {device.speed ?? '—'}
                      <small> km/h</small>
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[0.72rem] text-[var(--ink-muted)] mb-[0.2rem]">
                      Cảnh báo
                    </span>
                    <Badge tone={warning ? 'red' : 'green'}>
                      {warning ? device.alert_level : 'Bình thường'}
                    </Badge>
                  </div>
                </div>
                <div className="gap-[0.45rem] flex flex-wrap text-[0.75rem]">
                  <span
                    className={cx(
                      'px-[0.55rem] py-[0.22rem] rounded-[6px] border-[1px] border-solid bg-none',
                      device.drowsiness_detected &&
                        '[border-color:#dc2626] bg-[#fee2e2] text-[#991b1b] font-medium',
                      !device.drowsiness_detected &&
                        '[border-color:var(--border)] bg-[var(--bg-subtle)]',
                    )}
                  >
                    Ngủ gật: {device.drowsiness_detected ? 'Có' : 'Không'}
                  </span>
                  <span
                    className={cx(
                      'px-[0.55rem] py-[0.22rem] rounded-[6px] border-[1px] border-solid bg-none',
                      device.distraction_detected &&
                        '[border-color:#dc2626] bg-[#fee2e2] text-[#991b1b] font-medium',
                      !device.distraction_detected &&
                        '[border-color:var(--border)] bg-[var(--bg-subtle)]',
                    )}
                  >
                    Mất tập trung: {device.distraction_detected ? 'Có' : 'Không'}
                  </span>
                  <span
                    className={cx(
                      'px-[0.55rem] py-[0.22rem] rounded-[6px] border-[1px] border-solid bg-none',
                      device.yawn_detected &&
                        '[border-color:#dc2626] bg-[#fee2e2] text-[#991b1b] font-medium',
                      !device.yawn_detected && '[border-color:var(--border)] bg-[var(--bg-subtle)]',
                    )}
                  >
                    Ngáp: {device.yawn_detected ? 'Có' : 'Không'}
                  </span>
                </div>
                <div className="text-[0.75rem] text-[var(--ink-muted)] pt-[0.4rem] [border-top-width:1px] [border-top-style:dashed] [border-top-color:var(--border)]">
                  Bản tin cuối: {formatTime(device.created_at)}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <p className="mx-[0] mt-[0.85rem] mb-[0] text-[0.8rem] text-[var(--ink-muted)]">
        Hiển thị mỗi thiết bị một bản tin mới nhất trong 200 bản tin gần đây. Trạng thái “có dữ liệu
        gần đây” dựa trên bản tin trong 2 phút, không phải kết nối trực tiếp.
      </p>
    </>
  );
}
