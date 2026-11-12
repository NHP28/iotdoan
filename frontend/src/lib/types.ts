export type Role = 'admin' | 'user' | 'driver';
export type Driver = {
  id: number; driver_code: string; full_name: string; phone: string | null;
  license_number: string | null; is_active: boolean; face_registered?: boolean;
  face_embedding?: string | null; created_at: string;
  avatar_url?: string | null; account_id?: number | null; account_email?: string | null;
};
export type User = { id: number; email: string; full_name: string; role: Role; driver_id: number | null; driver: Driver | null };
export type Attendance = { id: number; driver_id: number; driver_name?: string; driver_code?: string; check_type: 'CHECK_IN' | 'CHECK_OUT'; timestamp: string; confidence_score: number | null; device_id: string | null; notes: string | null };
export type Telemetry = { id: number; device_id: string; driver_id: number | null; driver_name?: string; alert_level: string; drowsiness_detected: boolean; distraction_detected: boolean; yawn_detected: boolean; speed: number | null; created_at: string };
export type DriverAlert = Telemetry & { snapshot_url: string | null; eye_aspect_ratio: number | null; head_pose: string | null };
export type AlertType = 'all' | 'drowsiness' | 'distraction' | 'yawn';
export type AlertLevel = 'all' | 'WARNING' | 'CRITICAL';
export type DriverAlertHistory = {
  date: string; time_zone: string; updated_at: string;
  filters: { type: AlertType; level: AlertLevel };
  summary: { total: number; critical: number; warning: number; drowsiness: number; distraction: number; yawn: number };
  records: DriverAlert[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
};
export const roleLabel: Record<Role, string> = { admin: 'Quản trị viên', user: 'Người dùng', driver: 'Tài xế' };
export const sections: Record<Role, string[]> = {
  admin: ['overview', 'drivers', 'attendance', 'devices', 'accounts', 'profile'],
  user: ['overview', 'register-driver', 'profile'],
  driver: ['overview', 'check-in', 'attendance', 'alerts', 'profile'],
};
export const pageTitles: Record<string, string> = { overview: 'Tổng quan', drivers: 'Quản lý tài xế', attendance: 'Lịch sử điểm danh', alerts: 'Lịch sử cảnh báo', devices: 'Giám sát thiết bị', accounts: 'Tài khoản & phân quyền', profile: 'Hồ sơ của tôi', 'check-in': 'Điểm danh khuôn mặt', 'register-driver': 'Đăng ký tài xế' };

export function formatTime(value: string, timeOnly = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', ...(timeOnly ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) });
}
export function localDay(value: string) { return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); }
