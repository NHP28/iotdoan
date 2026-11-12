'use client';
import { SearchX, LoaderCircle } from 'lucide-react';
import { ReactNode } from 'react';
export function Empty({ title = 'Chưa có dữ liệu', children }: { title?: string; children?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><SearchX size={28} strokeWidth={1.5} /></span><strong>{title}</strong><p>{children || 'Dữ liệu sẽ xuất hiện tại đây khi có hoạt động mới.'}</p></div>;
}
export function Loading() { return <div className="loading-state" role="status"><LoaderCircle size={24} className="spin" /><span>Đang tải dữ liệu…</span></div>; }
export function Badge({ tone = 'neutral', children }: { tone?: 'green' | 'yellow' | 'red' | 'purple' | 'neutral'; children: ReactNode }) { return <span className={`badge ${tone}`}><span />{children}</span>; }
export function Metric({ label, value, note, icon, tone }: { label: string; value: ReactNode; note: string; icon: ReactNode; tone: string }) {
  return <div className="metric panel"><div className="metric-top"><span className={`metric-icon ${tone}`}>{icon}</span><span className="metric-decoration">↗</span></div><div className="metric-value">{value}</div><span className="metric-label">{label}</span><p>{note}</p></div>;
}
export function Notice({ error, success }: { error?: string; success?: string }) { return <>{error && <div className="notice error" role="alert">{error}</div>}{success && <div className="notice success" role="status">{success}</div>}</>; }
