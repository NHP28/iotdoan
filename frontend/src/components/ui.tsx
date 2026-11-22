'use client';
import { cx } from '@/lib/styles';

import { SearchX, LoaderCircle } from 'lucide-react';
import { ReactNode } from 'react';
export function Empty({
  title = 'Chưa có dữ liệu',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-[1.25rem] py-[2.75rem] gap-[0.5rem] flex flex-col items-center justify-center text-center text-[var(--ink-muted)]">
      <span className="rounded-[14px] border-[1.5px] border-solid [border-color:var(--border)] bg-none inline-flex items-center justify-center w-[52px] h-[52px] bg-[var(--bg-subtle)] text-[var(--ink)] mb-[0.35rem]">
        <SearchX size={28} strokeWidth={1.5} />
      </span>
      <strong className="font-medium text-[var(--ink)] text-[0.98rem]">{title}</strong>
      <p className="m-[0] max-w-[360px] text-[0.84rem]">
        {children || 'Dữ liệu sẽ xuất hiện tại đây khi có hoạt động mới.'}
      </p>
    </div>
  );
}
export function Loading() {
  return (
    <div
      className="px-[1.25rem] py-[2.75rem] gap-[0.5rem] flex flex-col items-center justify-center text-center text-[var(--ink-muted)]"
      role="status"
    >
      <LoaderCircle size={24} className="animate-spin [animation-duration:0.9s]" />
      <span>Đang tải dữ liệu…</span>
    </div>
  );
}
export function Badge({
  tone = 'neutral',
  children,
  compact = false,
}: {
  tone?: 'green' | 'yellow' | 'red' | 'purple' | 'neutral';
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <span
      className={cx(
        'px-[0.65rem] py-[0.22rem] rounded-[999px] border-[1.5px] border-solid gap-[0.4rem] bg-none inline-flex items-center font-medium whitespace-nowrap',
        compact ? 'text-[9px] [@media(width<=480px)]:mt-[2px]' : 'text-[0.72rem]',
        tone === 'green' && '[border-color:var(--border-strong)] bg-[#dcfce7] text-[#14532d]',
        tone === 'yellow' && '[border-color:var(--border-strong)] bg-[#fef3c7] text-[#78350f]',
        tone === 'red' && '[border-color:var(--border-strong)] bg-[#fee2e2] text-[#7f1d1d]',
        tone === 'purple' && '[border-color:var(--border-strong)] bg-[#e0e7ff] text-[#1e1b4b]',
        tone === 'neutral' &&
          '[border-color:var(--border)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]',
      )}
    >
      <span className="rounded-[999px] w-[6px] h-[6px] bg-current" />
      {children}
    </span>
  );
}
export function Metric({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  note: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.35rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex flex-col">
      <div className="flex justify-between items-center mb-[0.35rem]">
        <span
          className={cx(
            'rounded-[12px] border-[2px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[42px] h-[42px] text-[#11141c] [box-shadow:var(--shadow-hard-sm)]',
            tone === 'lavender' && 'bg-[var(--primary)]',
            tone === 'mint' && 'bg-[var(--mint)]',
            tone === 'peach' && 'bg-[var(--peach)]',
            tone === 'yellow' && 'bg-[var(--yellow)]',
          )}
        >
          {icon}
        </span>
        <span className="font-medium text-[var(--ink-muted)]">↗</span>
      </div>
      <div className="text-[1.9rem] font-medium leading-[1.1]">{value}</div>
      <span className="text-[0.85rem] font-medium">{label}</span>
      <p className="m-[0] text-[0.76rem] text-[var(--ink-muted)]">{note}</p>
    </div>
  );
}
export function Notice({ error, success }: { error?: string; success?: string }) {
  return (
    <>
      {error && (
        <div
          className="px-[1rem] py-[0.8rem] rounded-[10px] border-[2px] border-solid [border-color:#dc2626] bg-none text-[0.85rem] font-medium mb-[1rem] bg-[var(--danger-bg)] text-[#991b1b]"
          role="alert"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="px-[1rem] py-[0.8rem] rounded-[10px] border-[2px] border-solid [border-color:#16a34a] bg-none text-[0.85rem] font-medium mb-[1rem] bg-[var(--success-bg)] text-[#166534]"
          role="status"
        >
          {success}
        </div>
      )}
    </>
  );
}
