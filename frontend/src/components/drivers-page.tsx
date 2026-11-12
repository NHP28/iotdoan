'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Fingerprint, ImagePlus, LoaderCircle, Mail, Pencil, Plus, RefreshCw, Search, ShieldCheck, Truck, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Driver } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { Badge, Empty, Loading, Notice } from './ui';

export default function DriversPage() {
  const { data, loading, error, refresh } = useData<Driver[]>('drivers', []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Driver | 'new' | null>(null);
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [success, setSuccess] = useState('');
  const [photo, setPhoto] = useState('');
  const [createAccount, setCreateAccount] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) dialog.current?.showModal(); else dialog.current?.close(); }, [editing]);
  useEffect(() => setPage(1), [search, status]);
  function open(driver: Driver | 'new') {
    setPhoto(''); setSaveError(''); setCreateAccount(driver === 'new'); setEditing(driver);
  }
  function close() { if (!busy && !reading) setEditing(null); }
  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setSaveError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setSaveError('Chọn ảnh JPG, PNG hoặc WebP.'); return; }
    if (file.size > 3_000_000) { setSaveError('Ảnh cần nhỏ hơn 3 MB. Vui lòng chọn ảnh khác.'); return; }
    setReading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = dataUrl; });
      if (image.naturalWidth < 160 || image.naturalHeight < 160) throw new Error('Ảnh quá nhỏ. Vui lòng dùng ảnh tối thiểu 160 × 160 pixel.');
      setPhoto(dataUrl);
    } catch (err) { setSaveError(err instanceof Error ? err.message : 'Không đọc được ảnh đã chọn.'); }
    finally { setReading(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing || busy || reading) return;
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(form);
    if (editing !== 'new') body.is_active = form.get('is_active') === 'true';
    if (photo) body.image = photo;
    setBusy(true); setSaveError(''); setSuccess('');
    try {
      const result = await api<{ account_created?: boolean }>(editing === 'new' ? 'drivers' : `drivers/${editing.id}`, {
        method: editing === 'new' ? 'POST' : 'PUT', body: JSON.stringify(body),
      });
      setEditing(null);
      setSuccess(`Đã lưu hồ sơ${photo ? ' và đăng ký khuôn mặt với model' : ''}.${result.account_created ? ` Tài xế có thể đăng nhập bằng ${String(body.account_email)} và mật khẩu vừa tạo.` : ''}`);
      void refresh();
    } catch (err) { setSaveError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ.'); }
    finally { setBusy(false); }
  }
  const filtered = data.filter(d => `${d.full_name} ${d.driver_code} ${d.phone || ''}`.toLowerCase().includes(search.toLowerCase()) && (!status || String(d.is_active) === status));
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  const isNew = editing === 'new';
  const driver = editing && editing !== 'new' ? editing : null;
  const preview = photo || driver?.avatar_url;
  const hasFace = !!(driver?.face_registered || driver?.face_embedding);
  const hasAccount = !!driver?.account_id;

  return <>
    <div className="page-heading">
      <div><span className="eyebrow">WORKSPACE / TÀI XẾ</span><h1>Đội ngũ của bạn.</h1><p>Hồ sơ, khuôn mặt nhận diện và tài khoản đăng nhập của từng tài xế.</p></div>
      <button className="button primary" onClick={() => open('new')}><Plus size={17} />Thêm hồ sơ</button>
    </div>
    <Notice error={error} success={success} />
    <div className="summary-strip"><div><span>Tất cả tài xế</span><strong>{data.length}</strong></div><div><span>Đang hoạt động</span><strong>{data.filter(d => d.is_active).length}</strong></div><div><span>Đã đăng ký khuôn mặt</span><strong>{data.filter(d => d.face_registered || d.face_embedding).length}</strong></div></div>
    <section className="panel">
      <div className="table-toolbar">
        <div className="search-field"><Search size={17} /><input aria-label="Tìm tài xế" placeholder="Tìm tên, mã tài xế, số điện thoại…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="toolbar-filters"><select aria-label="Lọc trạng thái tài xế" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="true">Đang hoạt động</option><option value="false">Tạm ngưng</option></select><button className="icon-button" aria-label="Tải lại danh sách tài xế" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /></button></div>
      </div>
      {loading ? <Loading /> : !filtered.length ? <Empty title={data.length ? 'Không tìm thấy tài xế' : 'Thêm thành viên đầu tiên'}>Tạo hồ sơ kèm ảnh khuôn mặt và tài khoản để tài xế đăng nhập điểm danh.</Empty> : <div className="table-scroll"><table><thead><tr><th>Tài xế</th><th>Liên hệ / tài khoản</th><th>Giấy phép lái xe</th><th>Khuôn mặt</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{filtered.slice((currentPage - 1) * 8, currentPage * 8).map(d => <tr key={d.id}>
        <td><div className="table-person">{d.avatar_url ? <img className="driver-table-photo" src={d.avatar_url} alt={`Ảnh hồ sơ ${d.full_name}`} /> : <span className="avatar table-avatar">{d.full_name.charAt(0)}</span>}<div><strong>{d.full_name}</strong><small>{d.driver_code}</small></div></div></td>
        <td><div className="table-contact"><span>{d.phone || '—'}</span><small>{d.account_email || 'Chưa có tài khoản'}</small></div></td>
        <td className="mono">{d.license_number || '—'}</td>
        <td><Badge tone={d.face_registered || d.face_embedding ? 'green' : 'yellow'}>{d.face_registered || d.face_embedding ? 'Đã đăng ký' : 'Chưa có ảnh'}</Badge></td>
        <td><Badge tone={d.is_active ? 'green' : 'neutral'}>{d.is_active ? 'Hoạt động' : 'Tạm ngưng'}</Badge></td>
        <td><button className="icon-button" aria-label={`Sửa hồ sơ ${d.full_name}`} onClick={() => open(d)}><Pencil size={15} /></button></td>
      </tr>)}</tbody></table></div>}
      <div className="table-footer"><span>{filtered.length ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, filtered.length)} trên ${filtered.length} kết quả` : '0 kết quả'}</span><div><button className="button secondary compact" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</button><span>{currentPage} / {pages}</span><button className="button secondary compact" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Sau</button></div></div>
    </section>
    <p className="footnote">Để điểm danh, tài xế cần hồ sơ đang hoạt động, khuôn mặt đã đăng ký và tài khoản đăng nhập liên kết.</p>

    <dialog ref={dialog} className="modal driver-modal" onCancel={event => { event.preventDefault(); close(); }} onClose={() => setEditing(null)}>
      <div className="modal-header"><div><span className="eyebrow">HỒ SƠ TÀI XẾ</span><h2>{isNew ? 'Thêm hồ sơ mới' : 'Chỉnh sửa hồ sơ'}</h2></div><button className="icon-button" aria-label="Đóng hộp thoại" disabled={busy || reading} onClick={close}><X size={19} /></button></div>
      {editing && <form key={isNew ? 'new' : driver?.id} onSubmit={save} className="modal-form">
        <section className="driver-photo-section">
          <div className="driver-photo-preview">{preview ? <img src={preview} alt="Ảnh hồ sơ tài xế" /> : <ScanFaceIcon />}{photo && <span className="photo-new-dot" />}</div>
          <div className="driver-photo-copy"><label>Ảnh hồ sơ & nhận diện</label><p>Một khuôn mặt rõ nét, nhìn thẳng.<br />JPG, PNG, WebP · tối đa 3 MB</p><button className="button secondary compact" type="button" disabled={busy || reading} onClick={() => photoInput.current?.click()}>{reading ? <LoaderCircle size={15} className="spin" /> : <ImagePlus size={15} />}{preview ? 'Đổi ảnh' : 'Thêm ảnh khuôn mặt'}</button></div>
          <input ref={photoInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} tabIndex={-1} disabled={busy || reading} aria-label="Ảnh khuôn mặt tài xế" />
        </section>
        {photo ? <div className="photo-enroll-hint"><Fingerprint size={16} /><span>Ảnh mới sẽ được model kiểm tra và đăng ký khi lưu hồ sơ.</span><button type="button" onClick={() => setPhoto('')} disabled={busy} aria-label="Bỏ ảnh mới"><X size={14} /></button></div> : <div className="photo-enroll-hint"><Fingerprint size={16} /><span>{hasFace ? 'Đã có khuôn mặt nhận diện. Có thể chọn ảnh mới để cập nhật.' : 'Chưa có khuôn mặt. Bạn có thể thêm ảnh ngay hoặc cập nhật sau.'}</span></div>}
        <div className="form-grid"><label>Mã tài xế<input name="driver_code" defaultValue={driver?.driver_code || ''} required maxLength={50} placeholder="VD: TX001" /></label><label>Họ và tên<input name="full_name" defaultValue={driver?.full_name || ''} required minLength={2} maxLength={100} placeholder="Họ tên đầy đủ" /></label></div>
        <div className="form-grid"><label>Số điện thoại<input name="phone" type="tel" defaultValue={driver?.phone || ''} maxLength={20} pattern="\+?[0-9]{9,15}" placeholder="0912345678" /></label><label>Số giấy phép lái xe<input name="license_number" defaultValue={driver?.license_number || ''} maxLength={50} placeholder="Nhập số GPLX" /></label></div>
        {driver && <label>Trạng thái<select name="is_active" defaultValue={String(driver.is_active)}><option value="true">Đang hoạt động</option><option value="false">Tạm ngưng</option></select></label>}
        <section className="driver-login-section">
          {hasAccount ? <div className="linked-login"><ShieldCheck size={19} /><div><strong>Đã liên kết tài khoản đăng nhập</strong><small>{driver?.account_email}</small></div></div> : <>
            <label className="checkbox-label"><input type="checkbox" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)} disabled={busy} />Tạo tài khoản đăng nhập cho tài xế</label>
            {createAccount ? <div className="form-grid"><label>Email đăng nhập<input name="account_email" type="email" placeholder="taixe@example.com" required maxLength={255} autoComplete="off" /></label><label>Mật khẩu<input name="account_password" type="password" placeholder="Tối thiểu 6 ký tự" required minLength={6} maxLength={128} autoComplete="new-password" /></label></div> : <p>Tài xế cần tài khoản liên kết để đăng nhập và điểm danh. Có thể bổ sung trong lần chỉnh sửa sau.</p>}
          </>}
        </section>
        <Notice error={saveError} />
        <div className="modal-actions"><button className="button secondary" type="button" disabled={busy || reading} onClick={close}>Hủy</button><button className="button primary" disabled={busy || reading}>{busy && <LoaderCircle size={16} className="spin" />}{busy && photo ? 'Đang nhận diện & lưu…' : 'Lưu hồ sơ'}</button></div>
      </form>}
    </dialog>
  </>;
}

function ScanFaceIcon() { return <Fingerprint size={40} strokeWidth={1.4} />; }
