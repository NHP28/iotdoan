'use client';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Check, Fingerprint, ImagePlus, LoaderCircle, LogIn, LogOut, RefreshCw, ScanFace, ShieldCheck, VideoOff, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Attendance, formatTime, User } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Notice } from './ui';

export default function CameraPage({ user }: { user: User }) {
  const router = useRouter();
  const [registered, setRegistered] = useState(!!user.driver?.face_registered);
  const [mode, setMode] = useState<'attendance' | 'enroll'>(user.driver?.face_registered ? 'attendance' : 'enroll');
  const [camera, setCamera] = useState(false); const [ready, setReady] = useState(false); const [starting, setStarting] = useState(false);
  const [image, setImage] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const alive = useRef(true);
  const history = useData<Attendance[]>('recognition/history', []);
  const model = useData<{ available: boolean }>('recognition/status', { available: false });
  const inShift = history.data[0]?.check_type === 'CHECK_IN';
  useEffect(() => { alive.current = true; return () => { alive.current = false; stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  function stop() { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; if (video.current) video.current.srcObject = null; setCamera(false); setReady(false); }
  async function start() {
    setError(''); setSuccess(''); setStarting(true); setImage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Trình duyệt chưa hỗ trợ camera. Hãy dùng HTTPS hoặc localhost, hoặc tải ảnh lên.');
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!alive.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media; setCamera(true); if (video.current) { video.current.srcObject = media; await video.current.play(); }
    } catch (err) {
      stop();
      setError(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Quyền camera bị từ chối. Hãy cho phép camera trong trình duyệt hoặc tải ảnh lên.' : err instanceof DOMException && err.name === 'NotFoundError' ? 'Không tìm thấy camera. Bạn có thể tải ảnh lên để tiếp tục.' : err instanceof Error ? err.message : 'Không mở được camera.');
    } finally { if (alive.current) setStarting(false); }
  }
  function capture() {
    if (!video.current || !ready) return;
    const canvas = document.createElement('canvas'); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
    const context = canvas.getContext('2d'); if (!context || !canvas.width) { setError('Camera chưa sẵn sàng. Vui lòng thử lại.'); return; }
    context.drawImage(video.current, 0, 0); setImage(canvas.toDataURL('image/jpeg', 0.88)); stop(); setError(''); setSuccess('');
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; setError(''); setSuccess('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Vui lòng chọn ảnh JPG, PNG hoặc WebP.'); return; }
    if (file.size > 3_000_000) { setError('Ảnh vượt quá 3 MB. Vui lòng chọn ảnh nhỏ hơn.'); return; }
    stop();
    try {
      const reader = new FileReader();
      const result = await new Promise<string>((resolve, reject) => { reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Không đọc được ảnh.')); reader.readAsDataURL(file); });
      setImage(result);
    } catch { setError('Không đọc được ảnh. Vui lòng thử ảnh khác.'); }
  }
  async function submit(checkType?: 'CHECK_IN' | 'CHECK_OUT') {
    if (!image || busy) return; setBusy(true); setError(''); setSuccess('');
    try {
      if (mode === 'enroll') {
        await api('recognition/enroll', { method: 'POST', body: JSON.stringify({ image }) });
        setRegistered(true); setMode('attendance'); setSuccess('Đã đăng ký khuôn mặt. Bạn có thể chụp ảnh mới để điểm danh.');
      } else {
        const record = await api<Attendance>('recognition/attendance', { method: 'POST', body: JSON.stringify({ image, check_type: checkType }) });
        setSuccess(`${record.check_type === 'CHECK_IN' ? 'Check-in' : 'Check-out'} thành công lúc ${formatTime(record.timestamp)}. Độ tương đồng: ${record.confidence_score?.toFixed(1)}%.`);
        void history.refresh();
      }
      setImage(''); stop(); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể xử lý nhận diện.'); }
    finally { setBusy(false); }
  }
  const canSubmit = !!image && !busy && !history.loading && !model.loading && model.data.available;
  return <><div className="page-heading"><div><span className="eyebrow">TÀI XẾ / ĐIỂM DANH</span><h1>{mode === 'enroll' ? 'Để hệ thống nhận ra bạn.' : 'Một lần quét. Sẵn sàng lên đường.'}</h1><p>{mode === 'enroll' ? 'Đăng ký khuôn mặt trước khi bắt đầu sử dụng điểm danh.' : 'Chụp ảnh và xác minh khuôn mặt để bắt đầu hoặc kết thúc ca làm.'}</p></div><Badge tone={registered ? 'green' : 'yellow'}>{registered ? 'Đã đăng ký khuôn mặt' : 'Chưa đăng ký khuôn mặt'}</Badge></div><Notice error={error || history.error} success={success} />
    {!user.driver?.is_active ? <div className="notice error" role="alert">Hồ sơ tài xế đang tạm ngưng. Vui lòng liên hệ quản trị viên để tiếp tục.</div> : <>
      <div className="camera-tabs" role="group" aria-label="Chọn chế độ nhận diện"><button className={mode === 'enroll' ? 'selected' : ''} disabled={busy} onClick={() => { setMode('enroll'); setImage(''); setError(''); setSuccess(''); }}><ScanFace size={17} />Đăng ký khuôn mặt</button><button className={mode === 'attendance' ? 'selected' : ''} disabled={busy || !registered} onClick={() => { setMode('attendance'); setImage(''); setError(''); setSuccess(''); }}><Fingerprint size={17} />Check-in / Check-out</button></div>
      <div className="camera-grid"><section className="panel camera-panel"><div className="panel-heading"><div><h3>{mode === 'enroll' ? 'Ảnh khuôn mặt đăng ký' : 'Xác minh danh tính'}</h3><p>Đảm bảo trong khung hình chỉ có bạn</p></div><Badge tone={camera ? 'green' : 'neutral'}>{camera ? 'Camera đang mở' : image ? 'Đã chọn ảnh' : 'Camera đang tắt'}</Badge></div><div className={`camera-stage ${image ? 'has-image' : ''}`}><video ref={video} autoPlay playsInline muted onLoadedData={() => setReady(true)} className={camera ? 'camera-video' : 'camera-video hidden'} />{image && <img src={image} alt="Ảnh khuôn mặt đã chọn để nhận diện" className="camera-preview" />}{!image && <div className={`face-frame ${camera ? 'live' : ''}`}><span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />{!camera && <><ScanFace size={70} strokeWidth={1} /><strong>Đưa khuôn mặt vào khung hình</strong><small>Nhìn thẳng · Đủ ánh sáng · Không che mặt</small></>}</div>}{image && <button className="image-remove" disabled={busy} onClick={() => setImage('')} aria-label="Xóa ảnh đã chọn"><X size={18} /></button>}<span className="camera-stage-label"><span className="status-dot" />{image ? 'ẢNH ĐÃ SẴN SÀNG' : camera ? 'LIVE CAMERA' : 'FACE RECOGNITION'}</span></div><div className="camera-controls">{camera ? <><button className="button primary" disabled={!ready || busy} onClick={capture}><Camera size={17} />Chụp ảnh</button><button className="button secondary" onClick={stop}><VideoOff size={17} />Tắt camera</button></> : <><button className="button secondary" onClick={() => void start()} disabled={starting || busy}>{starting ? <LoaderCircle size={17} className="spin" /> : <Camera size={17} />}{image ? 'Chụp lại' : 'Mở camera'}</button><label className={`button secondary upload-button ${busy ? 'disabled' : ''}`}><ImagePlus size={17} />Tải ảnh lên<input className="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy} /></label></>}<span>JPG, PNG, WebP · tối đa 3 MB</span></div></section>
      <aside className="camera-aside"><section className="panel verification-card"><span className="metric-icon lavender"><Fingerprint size={26} /></span><span className="eyebrow">{mode === 'enroll' ? 'ĐĂNG KÝ NHẬN DIỆN' : 'ĐIỂM DANH CA LÀM'}</span><h2>{mode === 'enroll' ? <>Khuôn mặt của bạn,<br />dấu nhận diện của bạn.</> : user.full_name}</h2><p>{mode === 'enroll' ? 'Model sẽ trích xuất đặc trưng khuôn mặt từ ảnh và liên kết với hồ sơ tài xế hiện tại.' : `Mã tài xế: ${user.driver?.driver_code || '—'}`}</p><div className="verification-status"><span>Trạng thái ca</span><Badge tone={inShift ? 'green' : 'neutral'}>{history.loading ? 'Đang tải' : inShift ? 'Đang trong ca' : 'Ngoài ca'}</Badge></div><div className="verification-status"><span>Model nhận diện</span><Badge tone={model.data.available ? 'green' : 'yellow'}>{model.loading ? 'Đang kiểm tra' : model.data.available ? 'Sẵn sàng' : 'Chưa kết nối'}</Badge></div>{!model.loading && !model.data.available && <div className="model-unavailable"><p>Vui lòng khởi động dịch vụ AI để đăng ký khuôn mặt và điểm danh.</p><button className="text-link" onClick={() => void model.refresh()}><RefreshCw size={13} />Kiểm tra lại</button></div>}{mode === 'enroll' ? <><button className="button primary full" disabled={!canSubmit} onClick={() => void submit()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ScanFace size={17} />}{registered ? 'Cập nhật khuôn mặt' : 'Đăng ký khuôn mặt'}<ArrowRight size={16} /></button>{registered && <p className="footnote">Ảnh mới sẽ thay thế khuôn mặt đã đăng ký.</p>}</> : <div className="check-actions"><button className="button primary full" disabled={!canSubmit || inShift} onClick={() => void submit('CHECK_IN')}>{busy ? <LoaderCircle size={17} className="spin" /> : <LogIn size={17} />}Check-in · Bắt đầu ca</button><button className="button secondary full" disabled={!canSubmit || !inShift} onClick={() => void submit('CHECK_OUT')}><LogOut size={17} />Check-out · Kết thúc ca</button></div>}<div className="verification-note"><ShieldCheck size={16} /><p>{image ? 'Ảnh sẵn sàng để gửi tới model xác minh.' : 'Chụp ảnh hoặc tải ảnh lên để tiếp tục.'}</p></div></section><div className="photo-tips"><strong>Để nhận diện tốt hơn</strong>{['Giữ khuôn mặt rõ nét và nhìn thẳng.', 'Chọn nơi đủ sáng, tránh ngược sáng.', 'Bỏ khẩu trang và kính che khuôn mặt.'].map(tip => <p key={tip}><Check size={14} />{tip}</p>)}</div></aside></div>
    </>}
  </>;
}
