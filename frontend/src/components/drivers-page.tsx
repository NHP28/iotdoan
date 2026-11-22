'use client';
import { cx } from '@/lib/styles';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Fingerprint,
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Driver } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Empty, Loading, Notice } from './ui';
import FaceCapture, { emptyEnrollment } from './face-capture';

export default function DriversPage() {
  const { data, loading, error, refresh } = useData<Driver[]>('drivers', []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Driver | 'new' | null>(null);
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [success, setSuccess] = useState('');
  const [enrollment, setEnrollment] = useState(emptyEnrollment);
  const photo = enrollment.images[0] || '';
  const [createAccount, setCreateAccount] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (editing) dialog.current?.showModal();
    else dialog.current?.close();
  }, [editing]);
  useEffect(() => setPage(1), [search, status]);
  function open(driver: Driver | 'new') {
    setEnrollment(emptyEnrollment());
    setSaveError('');
    setCreateAccount(driver === 'new');
    setEditing(driver);
  }
  function close() {
    if (!busy && !reading) setEditing(null);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy || reading) return;
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(form);
    if (editing !== 'new') body.is_active = form.get('is_active') === 'true';
    if (enrollment.images.length) Object.assign(body, enrollment);
    setBusy(true);
    setSaveError('');
    setSuccess('');
    try {
      const result = await api<{ account_created?: boolean }>(
        editing === 'new' ? 'drivers' : `drivers/${editing.id}`,
        {
          method: editing === 'new' ? 'POST' : 'PUT',
          body: JSON.stringify(body),
        },
      );
      setEditing(null);
      setSuccess(
        `${photo ? 'Đăng ký nhân viên thành công: model đã nhận diện và lưu bộ mẫu vào MySQL' : 'Đã lưu hồ sơ'}.${result.account_created ? ` Tài xế có thể đăng nhập bằng ${String(body.account_email)} và mật khẩu vừa tạo.` : ''}`,
      );
      void refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ.');
    } finally {
      setBusy(false);
    }
  }
  const filtered = data.filter(
    (d) =>
      `${d.full_name} ${d.driver_code} ${d.phone || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!status || String(d.is_active) === status),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  const isNew = editing === 'new';
  const driver = editing && editing !== 'new' ? editing : null;
  const hasFace = !!(driver?.face_registered || driver?.face_embedding);
  const hasAccount = !!driver?.account_id;

  return (
    <>
      <div className="gap-[1rem] flex items-end justify-between flex-wrap mb-[1.4rem]">
        <div>
          <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
            WORKSPACE / TÀI XẾ
          </span>
          <h1 className="m-[0] font-medium text-[clamp(1.45rem,_2.4vw,_1.95rem)] tracking-[-0.02em]">
            Quản lý tài xế
          </h1>
          <p className="mx-[0] mt-[0.2rem] mb-[0] text-[var(--ink-muted)] text-[0.9rem]">
            Hồ sơ, khuôn mặt nhận diện và tài khoản đăng nhập của từng tài xế.
          </p>
        </div>
        <button
          className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
          onClick={() => open('new')}
        >
          <Plus size={17} />
          Thêm hồ sơ
        </button>
      </div>
      <Notice error={error} success={success} />
      <div className="gap-[1rem] grid grid-cols-[repeat(3,_minmax(0,_1fr))] mb-[1.15rem] [@media(width<=640px)]:grid-cols-[1fr]">
        <div className="px-[1.2rem] py-[1rem] rounded-[14px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)]">
          <span className="block text-[0.78rem] font-medium text-[var(--ink-muted)]">
            Tất cả tài xế
          </span>
          <strong className="font-medium block text-[1.55rem] mt-[0.15rem]">{data.length}</strong>
        </div>
        <div className="px-[1.2rem] py-[1rem] rounded-[14px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)]">
          <span className="block text-[0.78rem] font-medium text-[var(--ink-muted)]">
            Đang hoạt động
          </span>
          <strong className="font-medium block text-[1.55rem] mt-[0.15rem]">
            {data.filter((d) => d.is_active).length}
          </strong>
        </div>
        <div className="px-[1.2rem] py-[1rem] rounded-[14px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)]">
          <span className="block text-[0.78rem] font-medium text-[var(--ink-muted)]">
            Đã đăng ký khuôn mặt
          </span>
          <strong className="font-medium block text-[1.55rem] mt-[0.15rem]">
            {data.filter((d) => d.face_registered || d.face_embedding).length}
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
              aria-label="Tìm tài xế"
              placeholder="Tìm tên, mã tài xế, số điện thoại…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="gap-[0.6rem] flex items-center flex-wrap">
            <select
              className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[auto] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] min-w-[155px] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Lọc trạng thái tài xế"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Tạm ngưng</option>
            </select>
            <button
              className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Tải lại danh sách tài xế"
              onClick={() => void refresh()}
              disabled={loading}
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
        ) : !filtered.length ? (
          <Empty title={data.length ? 'Không tìm thấy tài xế' : 'Chưa có tài xế'}>
            Tạo hồ sơ kèm ảnh khuôn mặt và tài khoản để tài xế đăng nhập điểm danh.
          </Empty>
        ) : (
          <div className="w-[100%] overflow-x-auto">
            <table className="w-[100%] [border-collapse:collapse] text-left text-[0.87rem]">
              <thead>
                <tr>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    Tài xế
                  </th>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    Liên hệ / tài khoản
                  </th>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    Giấy phép lái xe
                  </th>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    Khuôn mặt
                  </th>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    Trạng thái
                  </th>
                  <th className="px-[0.85rem] py-[0.75rem] bg-none font-medium text-[0.72rem] uppercase tracking-[0.06em] text-[var(--ink-muted)] bg-[var(--bg-subtle)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border)]">
                    <span className="p-[0] m-[-1px] border-[0] border-none [border-color:currentColor] absolute w-[1px] h-[1px] overflow-x-hidden overflow-y-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap">
                      Thao tác
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((currentPage - 1) * 8, currentPage * 8).map((d) => (
                  <tr className="[&:hover]:bg-none [&:hover]:bg-[var(--bg-subtle)]" key={d.id}>
                    <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      <div className="gap-[0.65rem] flex items-center">
                        {d.avatar_url ? (
                          <img
                            className="rounded-[9px] border-[1px] border-solid [border-color:var(--border)] w-[36px] h-[40px] grow-[0] shrink-[0] basis-[36px] object-cover"
                            src={d.avatar_url}
                            alt={`Ảnh hồ sơ ${d.full_name}`}
                          />
                        ) : (
                          <span className="rounded-[10px] border-[1.5px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--primary)] text-[#11141c] font-medium text-[0.88rem] shrink-[0]">
                            {d.full_name.charAt(0)}
                          </span>
                        )}
                        <div>
                          <strong className="font-medium block text-[0.88rem]">
                            {d.full_name}
                          </strong>
                          <small className="block text-[0.75rem] text-[var(--ink-muted)] [font-family:var(--font-mono)]">
                            {d.driver_code}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      <div>
                        <span>{d.phone || '—'}</span>
                        <small className="block text-[10px] text-[var(--ink-muted)] mt-[4px]">
                          {d.account_email || 'Chưa có tài khoản'}
                        </small>
                      </div>
                    </td>
                    <td className="p-[0.85rem] [font-family:var(--font-mono)] text-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      {d.license_number || '—'}
                    </td>
                    <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      <Badge tone={d.face_registered || d.face_embedding ? 'green' : 'yellow'}>
                        {d.face_registered || d.face_embedding ? 'Đã đăng ký' : 'Chưa có ảnh'}
                      </Badge>
                    </td>
                    <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      <Badge tone={d.is_active ? 'green' : 'neutral'}>
                        {d.is_active ? 'Hoạt động' : 'Tạm ngưng'}
                      </Badge>
                    </td>
                    <td className="p-[0.85rem] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [vertical-align:middle]">
                      <div className="flex items-center gap-[0.5rem]">
                        <Link
                          href={`/admin/violations?driver=${d.id}`}
                          aria-label={`Xem vi phạm của ${d.full_name}`}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-[8px] border-[1.5px] border-solid [border-color:var(--border-strong)] bg-[var(--bg-surface)] px-[0.75rem] py-[0.38rem] text-[0.78rem] font-medium text-[var(--ink)] no-underline [box-shadow:var(--shadow-hard-sm)] hover:bg-[var(--primary)] hover:text-[#11141c]"
                        >
                          Vi phạm
                        </Link>
                        <button
                          className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
                          aria-label={`Sửa hồ sơ ${d.full_name}`}
                          onClick={() => open(d)}
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-between items-center pt-[1rem] mt-[0.5rem] text-[0.8rem] text-[var(--ink-muted)]">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, filtered.length)} trên ${filtered.length} kết quả`
              : '0 kết quả'}
          </span>
          <div className="gap-[0.6rem] flex items-center font-medium text-[var(--ink)]">
            <button
              className="px-[10px] py-[6px] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[11px] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] min-h-[32px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Trước
            </button>
            <span>
              {currentPage} / {pages}
            </span>
            <button
              className="px-[10px] py-[6px] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[11px] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] min-h-[32px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
              disabled={currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </section>
      <p className="mx-[0] mt-[0.85rem] mb-[0] text-[0.8rem] text-[var(--ink-muted)]">
        Để điểm danh, tài xế cần hồ sơ đang hoạt động, khuôn mặt đã đăng ký và tài khoản đăng nhập
        liên kết.
      </p>

      <dialog
        ref={dialog}
        className="p-[1.5rem] rounded-[18px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none w-[min(620px,_calc(100vw_-_32px))] bg-[var(--bg-surface)] text-[var(--ink)] [box-shadow:var(--shadow-hard-lg)] max-h-[calc(100dvh_-_48px)] overflow-y-auto [&::backdrop]:bg-[rgba(15,_23,_42,_0.55)] [&::backdrop]:[backdrop-filter:blur(2px)]"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => setEditing(null)}
      >
        <div className="flex justify-between items-start mb-[1.15rem]">
          <div>
            <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
              HỒ SƠ TÀI XẾ
            </span>
            <h2 className="m-[0] font-medium">{isNew ? 'Thêm hồ sơ mới' : 'Chỉnh sửa hồ sơ'}</h2>
          </div>
          <button
            className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
            aria-label="Đóng hộp thoại"
            disabled={busy || reading}
            onClick={close}
          >
            <X size={19} />
          </button>
        </div>
        {editing && (
          <form
            key={isNew ? 'new' : driver?.id}
            onSubmit={save}
            className="gap-[0.9rem] flex flex-col"
          >
            <FaceCapture value={enrollment} onChange={setEnrollment} disabled={busy} onBusyChange={setReading} />
            {hasFace && !photo && <p className="text-sm text-[var(--ink-muted)]">Đã có mẫu khuôn mặt. Thêm ảnh hoặc quay video để thay bộ mẫu khi lưu hồ sơ.</p>}
            <div className="gap-[0.85rem] grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=640px)]:grid-cols-[1fr]">
              <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                Mã tài xế
                <input
                  className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                  name="driver_code"
                  defaultValue={driver?.driver_code || ''}
                  required
                  maxLength={50}
                  placeholder="VD: TX001"
                />
              </label>
              <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                Họ và tên
                <input
                  className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                  name="full_name"
                  defaultValue={driver?.full_name || ''}
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Họ tên đầy đủ"
                />
              </label>
            </div>
            <div className="gap-[0.85rem] grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=640px)]:grid-cols-[1fr]">
              <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                Số điện thoại
                <input
                  className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                  name="phone"
                  type="tel"
                  defaultValue={driver?.phone || ''}
                  maxLength={20}
                  pattern="\+?[0-9]{9,15}"
                  placeholder="0912345678"
                />
              </label>
              <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                Số giấy phép lái xe
                <input
                  className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                  name="license_number"
                  defaultValue={driver?.license_number || ''}
                  maxLength={50}
                  placeholder="Nhập số GPLX"
                />
              </label>
            </div>
            {driver && (
              <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                Trạng thái
                <select
                  className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                  name="is_active"
                  defaultValue={String(driver.is_active)}
                >
                  <option value="true">Đang hoạt động</option>
                  <option value="false">Tạm ngưng</option>
                </select>
              </label>
            )}
            <section className="[border-top-width:1px] [border-top-style:solid] [border-top-color:var(--border)] pt-[15px] mt-[2px]">
              {hasAccount ? (
                <div className="gap-[10px] flex items-center text-[var(--ink-secondary)]">
                  <ShieldCheck size={19} />
                  <div>
                    <strong className="font-medium block text-[12px]">
                      Đã liên kết tài khoản đăng nhập
                    </strong>
                    <small className="block text-[11px] text-[var(--ink-muted)] mt-[3px]">
                      {driver?.account_email}
                    </small>
                  </div>
                </div>
              ) : (
                <>
                  <label className="gap-[0.5rem] font-medium flex items-center text-[0.84rem] cursor-pointer">
                    <input
                      className="text-inherit p-[0] [font-family:inherit] [font-size:inherit] [font-weight:inherit] leading-[inherit] [font-style:inherit] [font-variant:inherit] w-[15px] h-[15px] [accent-color:#7c8cdd] [&:disabled]:bg-none [&:disabled]:text-[var(--ink-muted)] [&:disabled]:bg-[var(--bg-subtle)]"
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      disabled={busy}
                    />
                    Tạo tài khoản đăng nhập cho tài xế
                  </label>
                  {createAccount ? (
                    <div className="gap-[0.85rem] grid grid-cols-[repeat(2,_minmax(0,_1fr))] mt-[12px] [@media(width<=640px)]:grid-cols-[1fr]">
                      <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                        Email đăng nhập
                        <input
                          className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                          name="account_email"
                          type="email"
                          placeholder="taixe@example.com"
                          required
                          maxLength={255}
                          autoComplete="off"
                        />
                      </label>
                      <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                        Mật khẩu
                        <input
                          className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                          name="account_password"
                          type="password"
                          placeholder="Tối thiểu 6 ký tự"
                          required
                          minLength={6}
                          maxLength={128}
                          autoComplete="new-password"
                        />
                      </label>
                    </div>
                  ) : (
                    <p className="mx-[0] mt-[8px] mb-[0] text-[11px] text-[var(--ink-muted)] leading-[1.7]">
                      Tài xế cần tài khoản liên kết để đăng nhập và điểm danh. Có thể bổ sung trong
                      lần chỉnh sửa sau.
                    </p>
                  )}
                </>
              )}
            </section>
            <Notice error={saveError} />
            <div className="gap-[0.65rem] flex justify-end mt-[0.5rem]">
              <button
                className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                type="button"
                disabled={busy || reading}
                onClick={close}
              >
                Hủy
              </button>
              <button
                className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                disabled={busy || reading}
              >
                {busy && (
                  <LoaderCircle size={16} className="animate-spin [animation-duration:0.9s]" />
                )}
                {busy && photo ? 'Model đang nhận diện và lưu…' : photo ? 'Nhận diện & đăng ký nhân viên' : 'Lưu hồ sơ'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

function ScanFaceIcon() {
  return <Fingerprint size={40} strokeWidth={1.4} />;
}
