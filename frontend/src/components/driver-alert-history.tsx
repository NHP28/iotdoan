'use client';
import { cx } from '@/lib/styles';

import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Cpu,
  Expand,
  EyeOff,
  Gauge,
  ImageOff,
  Moon,
  RefreshCw,
  Wind,
  X,
} from 'lucide-react';
import {
  AlertLevel,
  AlertType,
  DriverAlert,
  Driver,
  DriverAlertHistory,
  formatTime,
  localDay,
} from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Empty, Loading, Notice } from './ui';

const categories = [
  { type: 'all', title: 'Bản tin cảnh báo', icon: CircleAlert, tone: 'lavender', key: 'total' },
  { type: 'drowsiness', title: 'Ngủ gật', icon: Moon, tone: 'peach', key: 'drowsiness' },
  { type: 'distraction', title: 'Mất tập trung', icon: EyeOff, tone: 'yellow', key: 'distraction' },
  { type: 'yawn', title: 'Ngáp', icon: Wind, tone: 'mint', key: 'yawn' },
] as const;

function alertLabels(record: DriverAlert) {
  return [
    record.drowsiness_detected && 'Ngủ gật',
    record.distraction_detected && 'Mất tập trung',
    record.yawn_detected && 'Ngáp',
  ].filter(Boolean) as string[];
}
function snapshotSource(record: DriverAlert) {
  return record.snapshot_url &&
    /^\/api\/v1\/telemetry\/snapshots\/\d+\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(
      record.snapshot_url,
    )
    ? record.snapshot_url
    : null;
}
function clock(value: string) {
  return new Date(value).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function AlertPhoto({ record, open }: { record: DriverAlert; open: () => void }) {
  const [failed, setFailed] = useState(false);
  const src = snapshotSource(record);
  if (!src || failed)
    return (
      <div className="rounded-[10px] border-[1px] border-dashed [border-color:var(--border)] gap-[7px] bg-none w-[148px] h-[88px] [@media(width<=780px)]:[grid-column:2] [@media(width<=780px)]:w-[180px] [@media(width<=780px)]:h-[105px] [@media(width<=480px)]:max-w-[100%] flex flex-col items-center justify-center text-[var(--ink-muted)] bg-[var(--bg-subtle)] text-[9px]">
        <ImageOff size={20} strokeWidth={1.5} />
        <span>{failed ? 'Không tải được ảnh' : 'Chưa có ảnh'}</span>
      </div>
    );
  return (
    <button
      className="text-inherit p-[0] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] cursor-pointer relative block w-[148px] h-[88px] [@media(width<=780px)]:[grid-column:2] [@media(width<=780px)]:w-[180px] [@media(width<=780px)]:h-[105px] [@media(width<=480px)]:max-w-[100%] overflow-x-hidden overflow-y-hidden bg-[var(--bg-subtle)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] group/photo"
      onClick={open}
      aria-label={`Xem ảnh cảnh báo lúc ${clock(record.created_at)}`}
    >
      <img
        className="w-[100%] h-[100%] block object-cover [transition:transform_180ms_ease] group-[:hover]/photo:[transform:scale(1.04)]"
        src={src}
        alt={`Ảnh cảnh báo ${alertLabels(record).join(', ') || 'an toàn lái xe'} lúc ${clock(record.created_at)}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <span className="px-[8px] py-[6px] gap-[5px] absolute top-[auto] right-[0] bottom-[0] left-[0] flex items-center justify-center [background-image:linear-gradient(transparent,_#111827bd)] bg-[transparent] text-[white] text-[9px] font-medium">
        <Expand size={12} /> Xem ảnh
      </span>
    </button>
  );
}

export default function DriverAlertHistorySection({
  driver,
}: {
  driver?: Pick<Driver, 'id' | 'full_name' | 'driver_code'>;
}) {
  const today = localDay(new Date().toISOString());
  const [date, setDate] = useState(today);
  const [type, setType] = useState<AlertType>('all');
  const [level, setLevel] = useState<AlertLevel>('all');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<DriverAlert | null>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const query = new URLSearchParams({ date, type, level, page: String(page), page_size: '8' });
  const { data, loading, error, refresh } = useData<DriverAlertHistory | null>(
    `${driver ? `telemetry/drivers/${driver.id}/alerts` : 'telemetry/my-alerts'}?${query}`,
    null,
  );
  const current =
    data?.date === date &&
    data.filters.type === type &&
    data.filters.level === level &&
    data.pagination.page === Math.min(page, data.pagination.total_pages)
      ? data
      : null;
  const summary = current?.summary;

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, refresh]);
  useEffect(() => {
    if (selectedPhoto) photoDialog.current?.showModal();
    else photoDialog.current?.close();
  }, [selectedPhoto]);

  function changeDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    setDate(value);
    setPage(1);
  }
  function shiftDay(offset: number) {
    changeDate(
      localDay(
        new Date(new Date(`${date}T00:00:00+07:00`).getTime() + offset * 86400000).toISOString(),
      ),
    );
  }

  return (
    <section className="min-w-[0] font-medium" aria-labelledby="driver-alert-title">
      <div className="gap-[20px] flex items-center justify-between flex-wrap mb-[1.4rem] [@media(width<=480px)]:items-start [@media(width<=480px)]:flex-col">
        <div>
          <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
            {driver ? 'QUẢN TRỊ / LỊCH SỬ VI PHẠM' : 'TÀI XẾ / AN TOÀN LÁI XE'}
          </span>
          <h1
            className="m-[0] font-medium text-[clamp(1.45rem,_2.4vw,_1.95rem)] tracking-[-0.02em]"
            id="driver-alert-title"
          >
            {driver ? `Vi phạm của ${driver.full_name}` : 'Lịch sử cảnh báo'}
          </h1>
          <p className="mx-[0] mt-[0.2rem] mb-[0] text-[var(--ink-muted)] text-[0.9rem]">
            {driver
              ? `Mã tài xế: ${driver.driver_code}. Các cảnh báo và ảnh Raspberry Pi ghi nhận cho tài xế này.`
              : 'Các bản tin Raspberry Pi ghi nhận cho hồ sơ tài xế của bạn.'}
          </p>
        </div>
        <button
          className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)] [@media(width<=480px)]:[align-self:flex-start] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--bg-subtle)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={cx(loading && 'animate-spin [animation-duration:0.9s]')}
          />
          Làm mới
        </button>
      </div>
      <div className="p-[0] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] overflow-x-hidden overflow-y-hidden">
        <div className="px-[24px] py-[22px] gap-[18px] flex items-center justify-between flex-wrap [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [@media(480px<width<=780px)]:gap-[14px] [@media(480px<width<=780px)]:items-start [@media(480px<width<=780px)]:flex-col [@media(width<=480px)]:p-[16px] [@media(width<=480px)]:gap-[14px] [@media(width<=480px)]:items-start [@media(width<=480px)]:flex-col">
          <div className="gap-[8px] flex items-center min-w-[0] [@media(width<=480px)]:gap-[5px] [@media(width<=480px)]:w-[100%]">
            <button
              className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[34px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] shrink-[0] [@media(width<=480px)]:w-[28px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Ngày trước"
              disabled={date <= '2000-01-01'}
              onClick={() => shiftDay(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <label className="px-[12px] py-[8px] rounded-[9px] border-[1px] border-solid [border-color:var(--border)] gap-[9px] bg-none font-medium flex flex-row items-center bg-[var(--bg-surface)] [@media(width<=480px)]:px-[8px] [@media(width<=480px)]:gap-[6px] [@media(width<=480px)]:grow-[1] [@media(width<=480px)]:shrink-[1] [@media(width<=480px)]:basis-[0%] [@media(width<=480px)]:min-w-[0]">
              <CalendarDays
                size={16}
                className="shrink-0 text-[var(--ink-muted)] [@media(width<=480px)]:hidden"
              />
              <span className="p-[0] m-[-1px] border-[0] border-none [border-color:currentColor] absolute w-[1px] h-[1px] overflow-x-hidden overflow-y-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap">
                Ngày xem cảnh báo
              </span>
              <input
                className="p-[0] rounded-[0] border-[0] border-none [border-color:currentColor] bg-none [font-family:inherit] text-[12px] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[135px] bg-[transparent] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [box-shadow:none] min-w-[0] h-[20px] [color-scheme:light] [[data-theme=dark]_&]:[color-scheme:dark] [@media(width<=480px)]:text-[11px] [@media(width<=480px)]:w-[100%] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                type="date"
                aria-label="Ngày xem cảnh báo"
                value={date}
                min="2000-01-01"
                max={today}
                onChange={(event) => changeDate(event.target.value)}
              />
            </label>
            <button
              className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[34px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] shrink-[0] [@media(width<=480px)]:w-[28px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Ngày sau"
              disabled={date >= today}
              onClick={() => shiftDay(1)}
            >
              <ChevronRight size={17} />
            </button>
            <button
              className="px-[11px] py-[7px] rounded-[8px] border-[1px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[11px] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink-secondary)] cursor-pointer bg-[var(--bg-subtle)] whitespace-nowrap [@media(width<=480px)]:px-[7px] [@media(width<=480px)]:text-[10px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55]"
              disabled={date === today}
              onClick={() => changeDate(today)}
            >
              Hôm nay
            </button>
          </div>
          <label className="m-[0] gap-[7px] font-medium inline-flex items-center text-[11px] cursor-pointer flex-row text-[var(--ink-muted)] whitespace-nowrap">
            <input
              className="text-inherit p-[0] m-[0] border-[0] border-none [border-color:currentColor] [font-family:inherit] [font-size:inherit] [font-weight:inherit] leading-[inherit] [font-style:inherit] [font-variant:inherit] w-[14px] h-[14px] [box-shadow:none] [accent-color:#7a8bd7] [&:disabled]:bg-none [&:disabled]:text-[var(--ink-muted)] [&:disabled]:bg-[var(--bg-subtle)]"
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            Tự cập nhật mỗi 30 giây
          </label>
        </div>
        <div
          className="px-[24px] py-[22px] gap-[12px] grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(780px<width<=1200px)]:gap-[10px] [@media(480px<width<=780px)]:gap-[10px] [@media(480px<width<=780px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=480px)]:p-[16px] [@media(width<=480px)]:gap-[10px] [@media(width<=480px)]:grid-cols-[repeat(2,_minmax(0,_1fr))]"
          aria-label="Thống kê cảnh báo trong ngày"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.type}
                className={cx(
                  'p-[16px] rounded-[12px] border-[1px] border-solid gap-[13px] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer flex items-center text-left [transition:background_150ms_ease,_border-color_150ms_ease,_box-shadow_150ms_ease] [@media(width<=1200px)]:p-[12px] [@media(width<=1200px)]:gap-[10px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55]',
                  type === category.type &&
                    '[border-color:var(--border-strong)] bg-[var(--bg-subtle)] [box-shadow:2px_2px_0_var(--border-strong)]',
                  !(type === category.type) &&
                    '[border-color:var(--border)] bg-[var(--bg-surface)] [&:hover]:bg-[var(--bg-subtle)]',
                )}
                aria-pressed={type === category.type}
                onClick={() => {
                  setType(category.type);
                  setPage(1);
                }}
              >
                <span
                  className={cx(
                    'm-[0] rounded-[12px] border-[1px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[36px] h-[36px] text-[#11141c] [box-shadow:none] grow-[0] shrink-[0] basis-[36px] [@media(width<=1200px)]:w-[32px] [@media(width<=1200px)]:h-[32px] [@media(width<=1200px)]:basis-[32px]',
                    category.tone === 'lavender' && 'bg-[var(--primary)]',
                    category.tone === 'mint' && 'bg-[var(--mint)]',
                    category.tone === 'peach' && 'bg-[var(--peach)]',
                    category.tone === 'yellow' && 'bg-[var(--yellow)]',
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="gap-[3px] flex flex-col min-w-[0]">
                  <strong className="font-medium text-[24px] leading-[1.2] tracking-[-0.8px] [@media(width<=480px)]:text-[22px]">
                    {summary ? summary[category.key] : '—'}
                  </strong>
                  <span className="text-[11px] text-[var(--ink-muted)] font-medium leading-[1.6] [@media(width<=480px)]:text-[10px]">
                    {category.title}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="px-[24px] gap-[14px] flex justify-between items-center pt-[0] pb-[18px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [@media(width<=480px)]:px-[16px] [@media(width<=480px)]:items-stretch [@media(width<=480px)]:pb-[16px] [@media(width<=480px)]:flex-col">
          <div className="gap-[10px] flex items-center flex-wrap text-[11px] text-[var(--ink-muted)]">
            <span className="rounded-[50%] bg-none w-[6px] h-[6px] bg-[#99a9e1] shrink-[0]" />
            <span>
              {current
                ? `${current.pagination.total} bản tin phù hợp`
                : error
                  ? 'Chưa tải được dữ liệu'
                  : 'Đang tải cảnh báo…'}
            </span>
            {summary && summary.critical > 0 && (
              <Badge tone="red">{summary.critical} nghiêm trọng trong ngày</Badge>
            )}
          </div>
          <label className="font-medium">
            <span className="p-[0] m-[-1px] border-[0] border-none [border-color:currentColor] absolute w-[1px] h-[1px] overflow-x-hidden overflow-y-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap">
              Lọc mức độ cảnh báo
            </span>
            <select
              className="py-[8px] rounded-[8px] border-[1px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[11px] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] pr-[30px] pl-[10px] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] min-w-[160px] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Lọc mức độ cảnh báo"
              value={level}
              onChange={(event) => {
                setLevel(event.target.value as AlertLevel);
                setPage(1);
              }}
            >
              <option value="all">Tất cả mức độ</option>
              <option value="WARNING">Cảnh báo</option>
              <option value="CRITICAL">Nghiêm trọng</option>
            </select>
          </label>
        </div>
        {error && (
          <div className="px-[24px] pt-[16px] pb-[0] text-[12px] [@media(width<=480px)]:px-[16px] [@media(width<=480px)]:pt-[14px]">
            <Notice error={error} />
            <button
              className="p-[0] border-[0] border-none [border-color:currentColor] gap-[0.35rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--brand)] cursor-pointer inline-flex items-center bg-[transparent] mt-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:hover]:underline"
              onClick={() => void refresh()}
            >
              Thử tải lại
              <RefreshCw size={13} />
            </button>
          </div>
        )}
        <div className="min-h-[200px]" aria-busy={loading}>
          {!current ? (
            loading ? (
              <Loading />
            ) : null
          ) : current.records.length ? (
            <ol className="m-[0] px-[24px] py-[0] list-none [@media(width<=480px)]:px-[16px]">
              {current.records.map((record) => {
                const labels = alertLabels(record);
                const critical = record.alert_level === 'CRITICAL';
                const Icon = record.drowsiness_detected
                  ? Moon
                  : record.distraction_detected
                    ? EyeOff
                    : record.yawn_detected
                      ? Wind
                      : CircleAlert;
                return (
                  <li
                    key={record.id}
                    className="px-[0] py-[24px] grid grid-cols-[74px_minmax(0,_1fr)_148px] [align-items:start] gap-x-[18px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [@media(480px<width<=780px)]:gap-[12px] [@media(480px<width<=780px)]:grid-cols-[64px_minmax(0,_1fr)] [@media(width<=480px)]:py-[20px] [@media(width<=480px)]:gap-[12px] [@media(width<=480px)]:grid-cols-[52px_minmax(0,_1fr)] [&:last-child]:[border-bottom-width:0] [&:last-child]:[border-bottom-style:none] [&:last-child]:[border-bottom-color:currentColor]"
                  >
                    <div className="gap-[10px] flex items-center pt-[8px] text-[var(--ink-muted)] text-[10px] [font-variant-numeric:tabular-nums] [@media(width<=480px)]:gap-[6px] [@media(width<=480px)]:text-[9px]">
                      <time dateTime={record.created_at}>{clock(record.created_at)}</time>
                      <span
                        className={cx(
                          'rounded-[50%] border-[1px] border-solid bg-none w-[7px] h-[7px] shrink-[0] [@media(width<=480px)]:w-[5px] [@media(width<=480px)]:h-[5px]',
                          critical && '[border-color:#da8c80] bg-[#fbbfb7]',
                          !critical && '[border-color:#c7a473] bg-[#ffe8b8]',
                        )}
                      />
                    </div>
                    <div className="min-w-[0]">
                      <div className="gap-[9px] flex items-center flex-wrap [@media(width<=480px)]:gap-[7px]">
                        <span
                          className={cx(
                            'rounded-[8px] bg-none w-[30px] h-[30px] grid place-items-center shrink-[0]',
                            critical && 'bg-[#fce9e5] text-[#be6d60]',
                            !critical && 'bg-[#fff3d8] text-[#927446]',
                          )}
                        >
                          <Icon size={17} />
                        </span>
                        <h3 className="m-[0] font-medium text-[12px] leading-[1.7]">
                          {labels.join(' · ') || 'Cảnh báo an toàn lái xe'}
                        </h3>
                        <Badge tone={critical ? 'red' : 'yellow'} compact>
                          {critical ? 'Nghiêm trọng' : 'Cảnh báo'}
                        </Badge>
                      </div>
                      <p className="mx-[0] mt-[7px] mb-[10px] text-[var(--ink-muted)] text-[11px] leading-[1.8]">
                        {critical
                          ? 'Thiết bị ghi nhận tình huống cần chú ý ngay.'
                          : 'Thiết bị ghi nhận dấu hiệu cần chú ý trong ca lái xe.'}
                      </p>
                      <div className="flex items-center flex-wrap gap-x-[14px] gap-y-[7px] text-[var(--ink-muted)] [@media(width<=480px)]:gap-[8px]">
                        <span className="gap-[5px] inline-flex items-center text-[10px] [overflow-wrap:anywhere]">
                          <Cpu size={13} />
                          {record.device_id}
                        </span>
                        {record.speed != null && (
                          <span className="gap-[5px] inline-flex items-center text-[10px] [overflow-wrap:anywhere]">
                            <Gauge size={13} />
                            {Number(record.speed).toLocaleString('vi-VN')} km/h
                          </span>
                        )}
                        {record.eye_aspect_ratio != null && (
                          <span className="gap-[5px] inline-flex items-center text-[10px] [overflow-wrap:anywhere]">
                            EAR {Number(record.eye_aspect_ratio).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <AlertPhoto
                      key={`${record.id}-${record.snapshot_url}`}
                      record={record}
                      open={() => setSelectedPhoto(record)}
                    />
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty
              title={
                summary?.total ? 'Không có cảnh báo phù hợp' : 'Chưa ghi nhận cảnh báo trong ngày'
              }
            >
              {summary?.total
                ? 'Thử chọn loại cảnh báo hoặc mức độ khác.'
                : driver
                  ? 'Chưa có bản tin vi phạm của tài xế này trong ngày đã chọn.'
                  : 'Khi Raspberry Pi gửi cảnh báo kèm ID tài xế của bạn, dữ liệu và ảnh sẽ xuất hiện tại đây.'}
            </Empty>
          )}
        </div>
        <div className="px-[24px] py-[15px] gap-[12px] flex items-center justify-between [border-top-width:1px] [border-top-style:solid] [border-top-color:var(--border)] text-[var(--ink-muted)] text-[10px] [@media(width<=480px)]:px-[16px] [@media(width<=480px)]:py-[14px]">
          <span>
            {current ? `Cập nhật lúc ${clock(current.updated_at)}` : 'Dữ liệu từ Raspberry Pi'}
          </span>
          <div className="gap-[10px] flex items-center [font-variant-numeric:tabular-nums]">
            <button
              className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[30px] h-[30px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Trang cảnh báo trước"
              disabled={loading || !current || current.pagination.page <= 1}
              onClick={() => setPage((current?.pagination.page || 1) - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {current?.pagination.page || 1} / {current?.pagination.total_pages || 1}
            </span>
            <button
              className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[30px] h-[30px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Trang cảnh báo sau"
              disabled={
                loading || !current || current.pagination.page >= current.pagination.total_pages
              }
              onClick={() => setPage((current?.pagination.page || 1) + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      <p className="mx-[0] mt-[0.85rem] mb-[0] text-[0.8rem] text-[var(--ink-muted)]">
        Một bản tin có thể chứa nhiều dấu hiệu cảnh báo. Ảnh chỉ hiển thị khi thiết bị đã gửi ảnh
        kèm bản tin.
      </p>
      <dialog
        ref={photoDialog}
        className="p-[1.5rem] rounded-[18px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none w-[min(880px,_calc(100vw_-_32px))] bg-[var(--bg-surface)] text-[var(--ink)] [box-shadow:var(--shadow-hard-lg)] max-h-[calc(100dvh_-_48px)] overflow-y-auto [&::backdrop]:bg-[rgba(15,_23,_42,_0.55)] [&::backdrop]:[backdrop-filter:blur(2px)]"
        onCancel={() => setSelectedPhoto(null)}
        onClose={() => setSelectedPhoto(null)}
      >
        {selectedPhoto && (
          <>
            <div className="flex justify-between items-start mb-[1.15rem]">
              <div>
                <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
                  ẢNH CẢNH BÁO
                </span>
                <h2 className="m-[0] font-medium text-[18px]">
                  {alertLabels(selectedPhoto).join(' · ') || 'An toàn lái xe'}
                </h2>
              </div>
              <button
                className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Đóng ảnh cảnh báo"
              >
                <X size={19} />
              </button>
            </div>
            <img
              className="rounded-[10px] bg-none block w-[100%] max-h-[65dvh] object-contain bg-[#111827]"
              src={snapshotSource(selectedPhoto) || ''}
              alt={`Ảnh cảnh báo lúc ${formatTime(selectedPhoto.created_at)}`}
            />
            <div className="flex flex-wrap gap-y-[12px] gap-x-[24px] mt-[14px] text-[11px] text-[var(--ink-muted)]">
              <span className="gap-[7px] flex items-center [overflow-wrap:anywhere]">
                <CalendarDays size={14} />
                {formatTime(selectedPhoto.created_at)}
              </span>
              <span className="gap-[7px] flex items-center [overflow-wrap:anywhere]">
                <Camera size={14} />
                {selectedPhoto.device_id}
              </span>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
