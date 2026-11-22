import type { Metadata } from 'next';
import './tailwind.css';

export const metadata: Metadata = {
  title: { default: 'DriverHub — Quản lý tài xế', template: '%s | DriverHub' },
  description: 'Quản lý tài xế, điểm danh khuôn mặt và giám sát an toàn lái xe.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className="p-[0] m-[0] bg-none [--bg-paper:#f6f7fb] [--bg-surface:#ffffff] [--bg-subtle:#eef1f8] [--bg-story:#e8edff] [--ink:#11141c] [--ink-secondary:#475569] [--ink-muted:#64748b] [--primary:#a2b2ff] [--primary-strong:#7c93ff] [--brand:#2563eb] [--mint:#b2e5c1] [--peach:#ffd4b8] [--yellow:#ffe799] [--danger:#ef4444] [--danger-bg:#fef2f2] [--success:#16a34a] [--success-bg:#f0fdf4] [--border:#cbd5e1] [--border-strong:#11141c] [--shadow-hard-sm:2px_2px_0px_0px_#11141c] [--shadow-hard:4px_4px_0px_0px_#11141c] [--shadow-hard-lg:6px_6px_0px_0px_#11141c] [--radius-sm:8px] [--radius:12px] [--radius-lg:16px] [--font-sans:'Plus_Jakarta_Sans',_'Inter',_-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_sans-serif] [--font-mono:'JetBrains_Mono',_ui-monospace,_SFMono-Regular,_Menlo,_Monaco,_Consolas,_monospace] min-h-[100%] bg-[var(--bg-paper)] text-[var(--ink)] [font-family:var(--font-sans)] text-[15px] leading-[1.5] [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale] box-border [&_*]:box-border selection:bg-[#a2b2ff] selection:text-black [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar]:h-[6px] [&_*::-webkit-scrollbar]:w-[6px] [&_*::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&_*::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&_*::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-thumb]:rounded-[999px] [&_*::-webkit-scrollbar-thumb]:rounded-[999px] [&::-webkit-scrollbar-thumb:hover]:bg-[#94a3b8] [&_*::-webkit-scrollbar-thumb:hover]:bg-[#94a3b8] motion-reduce:[&_*]:[animation-duration:0.01ms]! motion-reduce:[&_*]:[animation-iteration-count:1]! motion-reduce:[&_*]:[transition-duration:0.01ms]!"
      lang="vi"
      suppressHydrationWarning
    >
      <body className="p-[0] m-[0] bg-none min-h-[100%] bg-[var(--bg-paper)] text-[var(--ink)] [font-family:var(--font-sans)] text-[15px] leading-[1.5] [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale]">
        {children}
      </body>
    </html>
  );
}
