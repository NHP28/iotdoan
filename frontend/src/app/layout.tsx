import type { Metadata } from 'next';
import './globals.css';
import './driver-alert-history.css';
export const metadata: Metadata = { title: { default: 'DriverHub — Vận hành an tâm', template: '%s | DriverHub' }, description: 'Quản lý tài xế, điểm danh khuôn mặt và giám sát an toàn lái xe.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" suppressHydrationWarning><body>{children}</body></html>;
}
