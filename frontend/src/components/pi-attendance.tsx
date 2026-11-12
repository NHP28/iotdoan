'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Check, CheckCircle2, Fingerprint, LoaderCircle, LogIn, LogOut, Radio, RefreshCw, ScanFace, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Attendance, formatTime, User } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Notice } from './ui';

type ModelStatus = { available: boolean; device_id?: string; mode?: string; devices?: { device_id: string; online: boolean }[] };
export default function PiAttendance({ user }: { user: User }) {
  const router = useRouter();
  const model = useData<ModelStatus>('recognition/status', { available: false });
  const history = useData<Attendance[]>('recognition/history', []);
  const [registered, setRegistered] = useState(!!user.driver?.face_registered);
  const [busy, setBusy] = useState<'ENROLL' | 'CHECK_IN' | 'CHECK_OUT' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inShift = history.data[0]?.check_type === 'CHECK_IN';
  const active = !!user.driver?.is_active;
  const ready = active && model.data.available && !model.loading && !history.loading && !history.error && !busy;

  useEffect(() => {
    if (busy) return;
    const timer = setInterval(() => { void model.refresh(); }, 15000);
    return () => clearInterval(timer);
  }, [busy, model.refresh]);

  async function request(operation: 'ENROLL' | 'CHECK_IN' | 'CHECK_OUT') {
    if (!ready) return;
    setBusy(operation); setError(''); setSuccess('');
    try {
      if (operation === 'ENROLL') {
        await api('recognition/enroll', { method: 'POST', body: JSON.stringify({ device_id: model.data.device_id }) });
        setRegistered(true); setSuccess('Đã đăng ký khuôn mặt từ camera Raspberry Pi vào hồ sơ của bạn.');
      } else {
        const record = await api<Attendance>('recognition/attendance', { method: 'POST', body: JSON.stringify({ check_type: operation, device_id: model.data.device_id }) });
        setSuccess(`${operation === 'CHECK_IN' ? 'Check-in' : 'Check-out'} thành công cho ${user.full_name} lúc ${formatTime(record.timestamp)}.`);
        await history.refresh();
      }
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể nhận diện. Vui lòng thử lại.'); }
    finally { setBusy(null); void model.refresh(); }
  }
  return <>
    <div className="page-heading"><div><span className="eyebrow">TÀI XẾ / ĐIỂM DANH</span><h1>Đứng trước camera. Bắt đầu hành trình.</h1><p>Đăng nhập trên web, xác minh khuôn mặt bằng camera gắn trên Raspberry Pi.</p></div><Badge tone={registered ? 'green' : 'yellow'}>{registered ? 'Đã đăng ký khuôn mặt' : 'Chưa có khuôn mặt'}</Badge></div>
    <Notice error={error || history.error || model.error} success={success} />
    {!active && <div className="notice error">Hồ sơ tài xế đang tạm ngưng. Vui lòng liên hệ quản trị viên.</div>}
    <div className="pi-attendance-grid">
      <section className="panel pi-camera-card">
        <div className="panel-heading"><div><h3>Camera tại thiết bị</h3><p>{model.data.device_id || 'Raspberry Pi'}</p></div><Badge tone={model.loading ? 'neutral' : model.data.available ? 'green' : 'yellow'}>{model.loading ? 'Đang kiểm tra' : model.data.available ? 'Đã kết nối' : 'Chưa kết nối'}</Badge></div>
        <div className={`pi-camera-stage ${busy ? 'scanning' : ''}`}>
          <span className="pi-stage-corner top-left" /><span className="pi-stage-corner top-right" /><span className="pi-stage-corner bottom-left" /><span className="pi-stage-corner bottom-right" />
          <div className="pi-face-symbol">{busy ? <ScanFace size={80} strokeWidth={1} /> : success ? <CheckCircle2 size={76} strokeWidth={1.1} /> : <Camera size={72} strokeWidth={1.1} />}</div>
          <h2>{busy ? 'Hãy nhìn thẳng vào camera Pi' : success ? 'Xác minh đã hoàn tất' : 'Sẵn sàng nhận diện tại Raspberry Pi'}</h2>
          <p>{busy ? 'Thiết bị đang chụp ảnh và đối chiếu khuôn mặt với hồ sơ của bạn. Giữ khuôn mặt trong vùng đủ sáng.' : 'Bấm thao tác bên cạnh, sau đó đứng trước camera được gắn trên thiết bị.'}</p>
          <span className="pi-stage-status">{busy ? <LoaderCircle size={14} className="spin" /> : <Radio size={14} />}{busy ? 'ĐANG CHỜ KẾT QUẢ TỪ PI' : 'CAMERA XỬ LÝ TẠI THIẾT BỊ'}</span>
        </div>
        <div className="pi-steps">{['Chọn check-in / check-out', 'Nhìn vào camera Pi', 'Nhận kết quả trên web'].map((text, i) => <div key={text}><span>{i + 1}</span><p>{text}</p>{i < 2 && <ArrowRight size={14} />}</div>)}</div>
      </section>
      <aside className="camera-aside"><section className="panel verification-card">
        <span className="metric-icon lavender"><Fingerprint size={25} /></span><span className="eyebrow">HỒ SƠ ĐANG XÁC MINH</span><h2>{user.full_name}</h2><p>Mã tài xế: {user.driver?.driver_code || '—'}</p>
        <div className="verification-status"><span>Trạng thái ca</span><Badge tone={inShift ? 'green' : 'neutral'}>{history.loading ? 'Đang tải' : inShift ? 'Đang trong ca' : 'Ngoài ca'}</Badge></div>
        <div className="verification-status"><span>Khuôn mặt</span><Badge tone={registered ? 'green' : 'yellow'}>{registered ? 'Đã đăng ký' : 'Chưa đăng ký'}</Badge></div>
        {!model.data.available && !model.loading && <div className="model-unavailable"><p>Pi chưa kết nối. Bật thiết bị và chạy chương trình nhận diện để tiếp tục.</p><button className="text-link" onClick={() => void model.refresh()} disabled={!!busy}><RefreshCw size={13} />Kiểm tra lại</button></div>}
        {registered ? <div className="check-actions"><button className="button primary full" disabled={!ready || inShift} onClick={() => void request('CHECK_IN')}>{busy === 'CHECK_IN' ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}Check-in · Bắt đầu ca</button><button className="button secondary full" disabled={!ready || !inShift} onClick={() => void request('CHECK_OUT')}>{busy === 'CHECK_OUT' ? <LoaderCircle className="spin" size={17} /> : <LogOut size={17} />}Check-out · Kết thúc ca</button></div> : <button className="button primary full" disabled={!ready} onClick={() => void request('ENROLL')}>{busy === 'ENROLL' ? <LoaderCircle className="spin" size={17} /> : <ScanFace size={17} />}Đăng ký khuôn mặt tại Pi</button>}
        <div className="verification-note"><ShieldCheck size={17} /><p>Kết quả chỉ được ghi cho hồ sơ liên kết với tài khoản đăng nhập và khuôn mặt khớp.</p></div>
      </section><div className="photo-tips"><strong>Để nhận diện tốt hơn</strong>{['Đứng trước camera gắn trên Pi.', 'Giữ khuôn mặt rõ nét và nhìn thẳng.', 'Bỏ khẩu trang, tránh ngược sáng.'].map(tip => <p key={tip}><Check size={14} />{tip}</p>)}</div></aside>
    </div>
  </>;
}
