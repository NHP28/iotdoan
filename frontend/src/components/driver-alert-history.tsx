'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Camera, ChevronLeft, ChevronRight, CircleAlert, Cpu, Expand, EyeOff, Gauge, ImageOff, Moon, RefreshCw, Wind, X } from 'lucide-react';
import { AlertLevel, AlertType, DriverAlert, DriverAlertHistory, formatTime, localDay } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Empty, Loading, Notice } from './ui';

const categories = [
  { type: 'all', title: 'Bản tin cảnh báo', icon: CircleAlert, tone: 'lavender', key: 'total' },
  { type: 'drowsiness', title: 'Ngủ gật', icon: Moon, tone: 'peach', key: 'drowsiness' },
  { type: 'distraction', title: 'Mất tập trung', icon: EyeOff, tone: 'yellow', key: 'distraction' },
  { type: 'yawn', title: 'Ngáp', icon: Wind, tone: 'mint', key: 'yawn' },
] as const;

function alertLabels(record: DriverAlert) {
  return [record.drowsiness_detected && 'Ngủ gật', record.distraction_detected && 'Mất tập trung', record.yawn_detected && 'Ngáp'].filter(Boolean) as string[];
}
function snapshotSource(record: DriverAlert) {
  return record.snapshot_url && /^\/api\/v1\/telemetry\/snapshots\/\d+\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(record.snapshot_url) ? record.snapshot_url : null;
}
function clock(value: string) {
  return new Date(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function AlertPhoto({ record, open }: { record: DriverAlert; open: () => void }) {
  const [failed, setFailed] = useState(false);
  const src = snapshotSource(record);
  if (!src || failed) return <div className="alert-no-photo"><ImageOff size={20} strokeWidth={1.5} /><span>{failed ? 'Không tải được ảnh' : 'Chưa có ảnh'}</span></div>;
  return <button className="alert-photo-button" onClick={open} aria-label={`Xem ảnh cảnh báo lúc ${clock(record.created_at)}`}>
    <img src={src} alt={`Ảnh cảnh báo ${alertLabels(record).join(', ') || 'an toàn lái xe'} lúc ${clock(record.created_at)}`} loading="lazy" onError={() => setFailed(true)} />
    <span><Expand size={12} /> Xem ảnh</span>
  </button>;
}

export default function DriverAlertHistorySection() {
  const today = localDay(new Date().toISOString());
  const [date, setDate] = useState(today);
  const [type, setType] = useState<AlertType>('all');
  const [level, setLevel] = useState<AlertLevel>('all');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<DriverAlert | null>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const query = new URLSearchParams({ date, type, level, page: String(page), page_size: '8' });
  const { data, loading, error, refresh } = useData<DriverAlertHistory | null>(`telemetry/my-alerts?${query}`, null);
  const current = data?.date === date && data.filters.type === type && data.filters.level === level && data.pagination.page === Math.min(page, data.pagination.total_pages) ? data : null;
  const summary = current?.summary;

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, refresh]);
  useEffect(() => { if (selectedPhoto) photoDialog.current?.showModal(); else photoDialog.current?.close(); }, [selectedPhoto]);

  function changeDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    setDate(value); setPage(1);
  }
  function shiftDay(offset: number) { changeDate(localDay(new Date(new Date(`${date}T00:00:00+07:00`).getTime() + offset * 86400000).toISOString())); }

  return <section className="driver-alert-history" aria-labelledby="driver-alert-title">
    <div className="page-heading alert-history-heading"><div><span className="eyebrow">TÀI XẾ / AN TOÀN LÁI XE</span><h1 id="driver-alert-title">Lịch sử cảnh báo</h1><p>Các bản tin Raspberry Pi ghi nhận cho hồ sơ tài xế của bạn.</p></div><button className="button secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Làm mới</button></div>
    <div className="panel alert-history-panel">
      <div className="alert-date-toolbar">
        <div className="alert-day-picker"><button className="icon-button" aria-label="Ngày trước" disabled={date <= '2000-01-01'} onClick={() => shiftDay(-1)}><ChevronLeft size={17} /></button><label><CalendarDays size={16} /><span className="sr-only">Ngày xem cảnh báo</span><input type="date" aria-label="Ngày xem cảnh báo" value={date} min="2000-01-01" max={today} onChange={event => changeDate(event.target.value)} /></label><button className="icon-button" aria-label="Ngày sau" disabled={date >= today} onClick={() => shiftDay(1)}><ChevronRight size={17} /></button><button className="alert-today-button" disabled={date === today} onClick={() => changeDate(today)}>Hôm nay</button></div>
        <label className="checkbox-label alert-auto-refresh"><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} />Tự cập nhật mỗi 30 giây</label>
      </div>
      <div className="alert-day-summary" aria-label="Thống kê cảnh báo trong ngày">{categories.map(category => {
        const Icon = category.icon;
        return <button key={category.type} className={`alert-summary-card ${type === category.type ? 'selected' : ''}`} aria-pressed={type === category.type} onClick={() => { setType(category.type); setPage(1); }}>
          <span className={`metric-icon ${category.tone}`}><Icon size={18} /></span><span className="alert-summary-copy"><strong>{summary ? summary[category.key] : '—'}</strong><span>{category.title}</span></span>
        </button>;
      })}</div>
      <div className="alert-list-toolbar"><div><span className="alert-list-dot" /><span>{current ? `${current.pagination.total} bản tin phù hợp` : error ? 'Chưa tải được dữ liệu' : 'Đang tải cảnh báo…'}</span>{summary && summary.critical > 0 && <Badge tone="red">{summary.critical} nghiêm trọng trong ngày</Badge>}</div><label><span className="sr-only">Lọc mức độ cảnh báo</span><select aria-label="Lọc mức độ cảnh báo" value={level} onChange={event => { setLevel(event.target.value as AlertLevel); setPage(1); }}><option value="all">Tất cả mức độ</option><option value="WARNING">Cảnh báo</option><option value="CRITICAL">Nghiêm trọng</option></select></label></div>
      {error && <div className="alert-history-error"><Notice error={error} /><button className="text-link" onClick={() => void refresh()}>Thử tải lại<RefreshCw size={13} /></button></div>}
      <div className="alert-history-content" aria-busy={loading}>
        {!current ? loading ? <Loading /> : null : current.records.length ? <ol className="alert-timeline">{current.records.map(record => {
          const labels = alertLabels(record);
          const critical = record.alert_level === 'CRITICAL';
          const Icon = record.drowsiness_detected ? Moon : record.distraction_detected ? EyeOff : record.yawn_detected ? Wind : CircleAlert;
          return <li key={record.id} className={`alert-timeline-item ${critical ? 'critical' : ''}`}>
            <div className="alert-time"><time dateTime={record.created_at}>{clock(record.created_at)}</time><span /></div>
            <div className="alert-event"><div className="alert-event-title"><span className="alert-event-icon"><Icon size={17} /></span><h3>{labels.join(' · ') || 'Cảnh báo an toàn lái xe'}</h3><Badge tone={critical ? 'red' : 'yellow'}>{critical ? 'Nghiêm trọng' : 'Cảnh báo'}</Badge></div><p>{critical ? 'Thiết bị ghi nhận tình huống cần chú ý ngay.' : 'Thiết bị ghi nhận dấu hiệu cần chú ý trong ca lái xe.'}</p><div className="alert-event-meta"><span><Cpu size={13} />{record.device_id}</span>{record.speed != null && <span><Gauge size={13} />{Number(record.speed).toLocaleString('vi-VN')} km/h</span>}{record.eye_aspect_ratio != null && <span>EAR {Number(record.eye_aspect_ratio).toFixed(2)}</span>}</div></div>
            <AlertPhoto key={`${record.id}-${record.snapshot_url}`} record={record} open={() => setSelectedPhoto(record)} />
          </li>;
        })}</ol> : <Empty title={summary?.total ? 'Không có cảnh báo phù hợp' : 'Chưa ghi nhận cảnh báo trong ngày'}>{summary?.total ? 'Thử chọn loại cảnh báo hoặc mức độ khác.' : 'Khi Raspberry Pi gửi cảnh báo kèm ID tài xế của bạn, dữ liệu và ảnh sẽ xuất hiện tại đây.'}</Empty>}
      </div>
      <div className="alert-history-footer"><span>{current ? `Cập nhật lúc ${clock(current.updated_at)}` : 'Dữ liệu từ Raspberry Pi'}</span><div className="alert-pagination"><button className="icon-button" aria-label="Trang cảnh báo trước" disabled={loading || !current || current.pagination.page <= 1} onClick={() => setPage((current?.pagination.page || 1) - 1)}><ChevronLeft size={16} /></button><span>{current?.pagination.page || 1} / {current?.pagination.total_pages || 1}</span><button className="icon-button" aria-label="Trang cảnh báo sau" disabled={loading || !current || current.pagination.page >= current.pagination.total_pages} onClick={() => setPage((current?.pagination.page || 1) + 1)}><ChevronRight size={16} /></button></div></div>
    </div>
    <p className="footnote">Một bản tin có thể chứa nhiều dấu hiệu cảnh báo. Ảnh chỉ hiển thị khi thiết bị đã gửi ảnh kèm bản tin.</p>
    <dialog ref={photoDialog} className="modal alert-photo-modal" onCancel={() => setSelectedPhoto(null)} onClose={() => setSelectedPhoto(null)}>
      {selectedPhoto && <><div className="modal-header"><div><span className="eyebrow">ẢNH CẢNH BÁO</span><h2>{alertLabels(selectedPhoto).join(' · ') || 'An toàn lái xe'}</h2></div><button className="icon-button" onClick={() => setSelectedPhoto(null)} aria-label="Đóng ảnh cảnh báo"><X size={19} /></button></div><img src={snapshotSource(selectedPhoto) || ''} alt={`Ảnh cảnh báo lúc ${formatTime(selectedPhoto.created_at)}`} /><div className="alert-photo-caption"><span><CalendarDays size={14} />{formatTime(selectedPhoto.created_at)}</span><span><Camera size={14} />{selectedPhoto.device_id}</span></div></>}
    </dialog>
  </section>;
}
