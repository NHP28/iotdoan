'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpRight, RefreshCw, Search, Truck } from 'lucide-react';
import type { Driver } from '@/lib/types';
import { useData } from '@/lib/use-data';
import DriverAlertHistorySection from './driver-alert-history';
import { Empty, Loading, Notice } from './ui';

export default function AdminViolationHistory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: drivers, loading, error, refresh } = useData<Driver[]>('drivers', []);
  const [search, setSearch] = useState('');
  const requested = searchParams.get('driver');
  const selectedId = requested ?? String(drivers[0]?.id ?? '');
  const selected = drivers.find((driver) => String(driver.id) === selectedId);
  const normalize = (value: string) =>
    value
      .trim()
      .toLocaleLowerCase('vi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  const filtered = drivers.filter((driver) =>
    normalize(`${driver.full_name} ${driver.driver_code} ${driver.phone || ''}`).includes(
      normalize(search),
    ),
  );
  const selectedInResults = filtered.some((driver) => driver.id === selected?.id);

  function selectDriver(id: string) {
    const query = new URLSearchParams(searchParams.toString());
    query.set('driver', id);
    router.replace(`/admin/violations?${query}`, { scroll: false });
  }

  return (
    <>
      <section
        aria-label="Chọn tài xế xem lịch sử vi phạm"
        className="mb-[1.4rem] flex flex-wrap items-end justify-between gap-[1rem] rounded-[16px] border-2 border-solid [border-color:var(--border-strong)] bg-[var(--bg-surface)] p-[1.35rem] [box-shadow:var(--shadow-hard)]"
      >
        <label className="flex min-w-0 basis-[240px] flex-1 flex-col gap-[0.5rem] text-[0.82rem] font-medium text-[var(--ink)]">
          Tìm tài xế
          <span className="relative flex items-center">
            <Search
              size={17}
              className="pointer-events-none absolute left-[0.85rem] text-[var(--ink-muted)]"
            />
            <input
              type="search"
              aria-label="Tìm tài xế trong lịch sử vi phạm"
              placeholder="Tên, mã tài xế hoặc số điện thoại…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-[10px] border-2 border-solid [border-color:var(--border)] bg-[var(--bg-surface)] py-[0.65rem] pl-[2.4rem] pr-[0.85rem] [font:inherit] text-[0.9rem] text-[var(--ink)] focus:[border-color:var(--border-strong)] focus:outline-none focus:[box-shadow:var(--shadow-hard-sm)]"
            />
          </span>
          <span role="status" className="text-[0.75rem] text-[var(--ink-muted)]">
            {loading ? 'Đang tải tài xế…' : `${filtered.length} / ${drivers.length} tài xế`}
          </span>
        </label>
        <label className="flex min-w-0 basis-[240px] flex-1 flex-col gap-[0.5rem] self-start text-[0.82rem] font-medium text-[var(--ink)]">
          <span className="inline-flex items-center gap-[0.5rem]">
            <Truck size={17} /> Chọn tài xế
          </span>
          <select
            aria-label="Tài xế xem lịch sử vi phạm"
            value={selectedInResults && selected ? String(selected.id) : ''}
            disabled={loading || !filtered.length}
            onChange={(event) => selectDriver(event.target.value)}
            className="w-full rounded-[10px] border-2 border-solid [border-color:var(--border)] bg-[var(--bg-surface)] px-[0.85rem] py-[0.65rem] [font:inherit] text-[0.9rem] text-[var(--ink)] focus:[border-color:var(--border-strong)] focus:outline-none focus:[box-shadow:var(--shadow-hard-sm)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
          >
            {!selectedInResults && (
              <option value="">
                {loading
                  ? 'Đang tải tài xế…'
                  : !drivers.length
                    ? 'Chưa có tài xế'
                    : !filtered.length
                      ? 'Không tìm thấy tài xế'
                      : 'Chọn trong kết quả tìm kiếm'}
              </option>
            )}
            {filtered.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.driver_code} · {driver.full_name}
                {driver.is_active ? '' : ' · Tạm ngưng'}
              </option>
            ))}
          </select>
        </label>
        <Link
          href="/admin/drivers"
          className="inline-flex items-center gap-[0.35rem] pb-[0.65rem] text-[0.84rem] font-medium text-[var(--brand)] no-underline hover:underline"
        >
          Quản lý tài xế <ArrowUpRight size={16} />
        </Link>
      </section>
      <Notice error={error} />
      {error && (
        <button
          type="button"
          onClick={() => void refresh()}
          className="mb-[1rem] inline-flex cursor-pointer items-center gap-[0.35rem] border-0 bg-transparent p-0 [font:inherit] text-[0.84rem] text-[var(--brand)] hover:underline"
        >
          Thử tải lại <RefreshCw size={14} />
        </button>
      )}
      {loading ? (
        <Loading />
      ) : selected ? (
        <DriverAlertHistorySection key={selected.id} driver={selected} />
      ) : (
        !error && (
          <Empty title={drivers.length ? 'Không tìm thấy tài xế đã chọn' : 'Chưa có hồ sơ tài xế'}>
            {drivers.length
              ? 'Chọn một hồ sơ trong danh sách để xem lịch sử vi phạm.'
              : 'Thêm hồ sơ tài xế để theo dõi các cảnh báo từ Raspberry Pi.'}
          </Empty>
        )
      )}
    </>
  );
}
