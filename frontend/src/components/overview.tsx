'use client';
import Link from 'next/link';
import { Activity, ArrowRight, ArrowUpRight, CalendarDays, Check, ClipboardCheck, Fingerprint, Plus, RefreshCw, ShieldCheck, Truck, Users } from 'lucide-react';
import { Attendance, Driver, localDay, Telemetry, User } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Empty, Loading, Metric, Notice } from './ui';
import { AttendanceTable } from './admin-pages';

export default function Overview({ user }: { user: User }) {
  const admin = user.role === 'admin';
  const driver = user.role === 'driver';
  const drivers = useData<Driver[]>(admin ? 'drivers' : null, []);
  const attendance = useData<Attendance[]>(admin ? 'attendance' : driver ? 'recognition/history' : null, []);
  const telemetry = useData<Telemetry[]>(admin ? 'telemetry?limit=50' : null, []);
  const model = useData<{ available: boolean }>('recognition/status', { available: false });
  const loading = drivers.loading || attendance.loading || telemetry.loading;
  const error = drivers.error || attendance.error || telemetry.error;
  const today = localDay(new Date().toISOString());
  const todayLogs = attendance.data.filter(a => localDay(a.timestamp) === today);
  const activeDrivers = new Set<number>();
  const latest = new Map<number, Attendance>();
  attendance.data.forEach(a => { if (!latest.has(a.driver_id)) latest.set(a.driver_id, a); });
  latest.forEach(a => { if (a.check_type === 'CHECK_IN') activeDrivers.add(a.driver_id); });
  const deviceMap = new Map<string, Telemetry>();
  telemetry.data.forEach(t => { if (!deviceMap.has(t.device_id)) deviceMap.set(t.device_id, t); });
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - i));
    const day = localDay(date.toISOString());
    return { label: new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date), count: attendance.data.filter(a => localDay(a.timestamp) === day && a.check_type === 'CHECK_IN').length, today: i === 6 };
  });
  const max = Math.max(1, ...days.map(d => d.count));
  const firstName = user.full_name.trim();
  return <>
    <div className="page-heading"><div><span className="eyebrow">WORKSPACE / TỔNG QUAN</span><h1>Chào {firstName}<span className="greeting-spark">✳</span></h1><p>{admin ? 'Nắm bắt hoạt động đội ngũ và mỗi hành trình trong ngày.' : driver ? 'Ca làm mới bắt đầu bằng một lần điểm danh.' : 'Quản lý tài khoản và bắt đầu hành trình của bạn tại đây.'}</p></div><button className="button secondary" onClick={() => { void drivers.refresh(); void attendance.refresh(); void telemetry.refresh(); void model.refresh(); }} disabled={loading || model.loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Làm mới</button></div>
    <Notice error={error} />
    <section className="welcome-banner"><div className="welcome-copy"><span className="pill paper"><span className="status-dot" /> {admin ? 'TRUNG TÂM ĐIỀU HÀNH' : 'MỖI HÀNH TRÌNH ĐỀU QUAN TRỌNG'}</span><h2>{admin ? <>Đội ngũ kết nối.<br />Hành trình an tâm.</> : driver ? <>Sẵn sàng cho<br />hành trình tiếp theo?</> : <>Một tài khoản.<br />Nhiều hành trình mới.</>}</h2><p>{admin ? 'Quản lý hồ sơ, theo dõi điểm danh và dữ liệu thiết bị trong cùng một không gian.' : driver ? 'Kiểm tra hồ sơ, xác minh khuôn mặt và điểm danh trước khi bắt đầu ca làm.' : 'Đăng ký hồ sơ tài xế để sử dụng điểm danh bằng nhận diện khuôn mặt.'}</p><Link className="button ink" href={`/${user.role}/${admin ? 'drivers' : driver ? 'check-in' : 'register-driver'}`}>{admin ? 'Quản lý tài xế' : driver ? 'Điểm danh ngay' : 'Đăng ký tài xế'}<ArrowUpRight size={17} /></Link></div><div className="banner-visual" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="banner-id"><div className="id-top"><span>DRIVER ID</span><ShieldCheck size={19} /></div><div className="id-photo"><Truck size={51} strokeWidth={1.4} /></div><div className="id-lines"><span /><span /></div><div className="id-bottom"><span className="status-dot" /> READY FOR THE ROAD</div></div><div className="floating-tag tag-one"><Fingerprint size={22} /> FACE RECOGNITION</div><div className="floating-tag tag-two"><span className="round-check"><Check size={14} /></span> DRIVE WITH CONFIDENCE</div><span className="banner-star">✳</span></div></section>
    {admin ? <>
      <div className="section-kicker"><span><Activity size={15} /> HOẠT ĐỘNG HÔM NAY</span><span><CalendarDays size={14} />{new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })}</span></div>
      <div className="metrics-grid"><Metric label="Tổng số tài xế" value={loading ? '—' : drivers.data.length} note={`${drivers.data.filter(d => d.is_active).length} hồ sơ đang hoạt động`} icon={<Users size={21} />} tone="lavender" /><Metric label="Tài xế đang trong ca" value={loading ? '—' : activeDrivers.size} note="Theo lượt điểm danh gần nhất" icon={<Truck size={21} />} tone="mint" /><Metric label="Lượt điểm danh hôm nay" value={loading ? '—' : todayLogs.length} note={`${todayLogs.filter(a => a.check_type === 'CHECK_IN').length} check-in · ${todayLogs.filter(a => a.check_type === 'CHECK_OUT').length} check-out`} icon={<ClipboardCheck size={21} />} tone="peach" /><Metric label="Thiết bị ghi nhận" value={loading ? '—' : deviceMap.size} note="Trong 50 bản tin gần nhất" icon={<Activity size={21} />} tone="yellow" /></div>
      <div className="overview-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h3>Nhịp hoạt động</h3><p>Lượt check-in trong 7 ngày gần nhất</p></div><span className="pill subtle">7 NGÀY QUA</span></div><div className="chart-area"><div className="chart-guides"><span>{max}</span><span>{Math.round(max / 2)}</span><span>0</span></div><div className="bar-chart" role="img" aria-label={days.map(d => `${d.label}: ${d.count} check-in`).join(', ')}>{days.map((d, i) => <div className="bar-column" key={i}><div className="bar-track"><div className={`bar ${d.today ? 'current' : ''}`} style={{ height: `${Math.max(d.count ? 6 : 0, d.count / max * 100)}%` }}><span>{d.count}</span></div></div><span>{d.label}</span></div>)}</div></div></section><section className="panel system-panel"><span className="system-icon"><ShieldCheck size={27} /></span><h3>Trạng thái kết nối</h3><p>Kiểm tra các dịch vụ phục vụ vận hành.</p><div className="system-row"><span>API & cơ sở dữ liệu</span><Badge tone={error ? 'red' : loading ? 'neutral' : 'green'}>{error ? 'Chưa kết nối' : loading ? 'Đang kiểm tra' : 'Đã kết nối'}</Badge></div><div className="system-row"><span>Model khuôn mặt</span><Badge tone={model.loading ? 'neutral' : model.data.available ? 'green' : 'yellow'}>{model.loading ? 'Đang kiểm tra' : model.data.available ? 'Sẵn sàng' : 'Chưa kết nối'}</Badge></div><Link href="/admin/devices" className="text-link">Xem giám sát thiết bị<ArrowRight size={14} /></Link></section></div>
    </> : <>
      <div className="section-kicker"><span><Fingerprint size={15} /> LỘ TRÌNH CỦA BẠN</span><span>3 BƯỚC ĐỂ SẴN SÀNG</span></div><div className="steps-grid">{[
        { number: '01', title: 'Đăng ký hồ sơ', text: 'Thông tin cá nhân và giấy phép lái xe.', done: !!user.driver_id, href: driver ? '/driver/profile' : '/user/register-driver' },
        { number: '02', title: 'Thêm khuôn mặt', text: 'Đăng ký ảnh rõ nét để model nhận diện.', done: !!user.driver?.face_registered, href: driver ? '/driver/check-in' : '/user/register-driver' },
        { number: '03', title: 'Điểm danh ca làm', text: 'Xác minh khuôn mặt để check-in / check-out.', done: attendance.data.length > 0, href: driver ? '/driver/check-in' : '/user/register-driver' },
      ].map(step => <Link className="panel step-card" key={step.number} href={step.href}><div><span className="step-number">{step.number}</span>{step.done ? <span className="round-check"><Check size={14} /></span> : <ArrowUpRight size={18} />}</div><h3>{step.title}</h3><p>{step.text}</p><Badge tone={step.done ? 'green' : 'neutral'}>{step.done ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</Badge></Link>)}</div>
      {driver && <div className="driver-summary panel"><div className="driver-summary-icon"><Truck size={26} /></div><div><span className="eyebrow">TRẠNG THÁI CA LÀM</span><h3>{attendance.loading ? 'Đang kiểm tra…' : attendance.data[0]?.check_type === 'CHECK_IN' ? 'Bạn đang trong ca' : 'Bạn chưa bắt đầu ca mới'}</h3><p>{user.driver?.is_active ? 'Hồ sơ tài xế đang hoạt động.' : 'Hồ sơ tài xế đang tạm ngưng. Vui lòng liên hệ quản trị viên.'}</p></div><Link className="button secondary" href="/driver/check-in">Mở điểm danh<ArrowRight size={16} /></Link></div>}
    </>}
    {(admin || driver) && <section className="panel recent-panel"><div className="panel-heading"><div><h3>Điểm danh gần đây</h3><p>{admin ? 'Các hoạt động mới nhất của đội ngũ tài xế' : 'Những lần check-in và check-out của bạn'}</p></div><Link className="text-link" href={`/${user.role}/attendance`}>Xem tất cả<ArrowUpRight size={15} /></Link></div>{attendance.loading ? <Loading /> : attendance.data.length ? <AttendanceTable rows={attendance.data.slice(0, 5)} showDriver={admin} /> : <Empty title="Chưa có lượt điểm danh">Lượt điểm danh được xác minh sẽ hiển thị tại đây.</Empty>}</section>}
  </>;
}
