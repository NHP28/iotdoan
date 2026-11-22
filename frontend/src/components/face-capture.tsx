'use client';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, LoaderCircle, Square, Video, X } from 'lucide-react';

export type FaceEnrollment = { images: string[]; capture_source: 'photos' | 'video'; enrollment_media?: string };
export const emptyEnrollment = (): FaceEnrollment => ({ images: [], capture_source: 'photos' });
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed';

function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Không đọc được tệp.')); reader.readAsDataURL(blob);
  });
}
function frame(source: CanvasImageSource, width: number, height: number) {
  if (width < 160 || height < 160) throw new Error('Ảnh/video cần có kích thước tối thiểu 160 × 160.');
  const canvas = document.createElement('canvas'), scale = Math.min(1, 800 / Math.max(width, height));
  canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d'); if (!context) throw new Error('Không tạo được ảnh mẫu.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', .86);
}
async function photo(file: File) {
  const url = URL.createObjectURL(file);
  try { const image = new Image(); image.src = url; await image.decode(); return frame(image, image.naturalWidth, image.naturalHeight); }
  finally { URL.revokeObjectURL(url); }
}
async function videoFrames(blob: Blob, knownDuration?: number) {
  const url = URL.createObjectURL(blob), video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  function event(name: 'loadedmetadata' | 'seeked', action: () => void) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Không đọc được video trong thời gian cho phép.')), 10000);
      function finish(error?: Error) { clearTimeout(timer); video.removeEventListener(name, ready); video.removeEventListener('error', fail); error ? reject(error) : resolve(); }
      function ready() { finish(); } function fail() { finish(new Error('Trình duyệt không đọc được video này. Hãy dùng MP4 hoặc WebM.')); }
      video.addEventListener(name, ready, { once: true }); video.addEventListener('error', fail, { once: true });
      try { action(); } catch { fail(); }
    });
  }
  try {
    await event('loadedmetadata', () => { video.src = url; });
    const duration = Number.isFinite(video.duration) ? video.duration : knownDuration;
    if (!duration || duration < 1 || duration > 20) throw new Error('Chọn video từ 1 đến 20 giây, hoặc quay trực tiếp bằng camera.');
    const images: string[] = [];
    for (let index = 0; index < 6; index++) {
      await event('seeked', () => { video.currentTime = duration * (index + .5) / 6; });
      images.push(frame(video, video.videoWidth, video.videoHeight));
    }
    return images;
  } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}

export default function FaceCapture({ value, onChange, disabled = false, onBusyChange }:
  { value: FaceEnrollment; onChange: (value: FaceEnrollment) => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const [error, setError] = useState(''), [processing, setProcessing] = useState(false);
  const [cameraOn, setCameraOn] = useState(false), [recording, setRecording] = useState(false), [seconds, setSeconds] = useState(0);
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null), timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const blocked = disabled || processing || recording;
  useEffect(() => { onBusyChange?.(processing || recording); }, [processing, recording, onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
      if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); }
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);
  useEffect(() => {
    if (cameraOn && video.current && stream.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => setError('Không phát được camera.')); }
  }, [cameraOn]);
  function stopCamera() {
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCameraOn(false);
  }
  async function startCamera() {
    setError(''); setProcessing(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera cần HTTPS hoặc localhost. Bạn vẫn có thể tải ảnh/video từ máy.');
      const media = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media; setCameraOn(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Không mở được camera.'); }
    finally { if (mounted.current) setProcessing(false); }
  }
  async function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files || [])]; event.target.value = ''; if (!files.length) return;
    setError(''); setProcessing(true);
    try {
      if (files.length > 8) throw new Error('Mỗi lần đăng ký chọn tối đa 8 ảnh.');
      if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8_000_000)) throw new Error('Chọn ảnh JPG, PNG hoặc WebP, mỗi ảnh nhỏ hơn 8 MB.');
      const images = [];
      for (const file of files) images.push(await photo(file));
      if (mounted.current) onChange({ images, capture_source: 'photos' });
    } catch (err) { setError(err instanceof Error ? err.message : 'Không đọc được ảnh.'); }
    finally { if (mounted.current) setProcessing(false); }
  }
  async function processVideo(blob: Blob, duration?: number) {
    setProcessing(true); setError('');
    try {
      const mime = blob.type.split(';')[0];
      if (!['video/mp4', 'video/webm'].includes(mime) || blob.size > 8_000_000) throw new Error('Chọn video MP4/WebM nhỏ hơn 8 MB.');
      const images = await videoFrames(blob, duration);
      const media = (await dataUrl(blob)).replace(/^data:[^,]+,/, `data:${mime};base64,`);
      if (mounted.current) onChange({ images, capture_source: 'video', enrollment_media: media });
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : 'Không xử lý được video.'); }
    finally { if (mounted.current) setProcessing(false); }
  }
  async function chooseVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (file) await processVideo(file);
  }
  function capture() {
    if (!video.current) return;
    try {
      const image = frame(video.current, video.current.videoWidth, video.current.videoHeight);
      const images = value.capture_source === 'photos' ? value.images : [];
      if (images.length >= 8) throw new Error('Đã đủ 8 mẫu. Xóa bớt mẫu để chụp lại.');
      onChange({ images: [...images, image], capture_source: 'photos' }); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa chụp được ảnh.'); }
  }
  function record() {
    setError('');
    if (!stream.current || typeof MediaRecorder === 'undefined') { setError('Trình duyệt chưa hỗ trợ quay video. Hãy tải video có sẵn hoặc dùng ảnh.'); return; }
    try {
      const mime = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error('Trình duyệt chưa hỗ trợ ghi MP4/WebM.');
      const chunks: Blob[] = [], started = performance.now();
      const recordingDevice = new MediaRecorder(stream.current, { mimeType: mime, videoBitsPerSecond: 900_000 });
      recorder.current = recordingDevice;
      recordingDevice.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recordingDevice.onerror = () => { setError('Quay video bị gián đoạn. Hãy thử lại.'); if (recordingDevice.state !== 'inactive') recordingDevice.stop(); };
      recordingDevice.onstop = () => {
        if (timer.current) clearInterval(timer.current); timer.current = null;
        if (!mounted.current) return;
        setRecording(false); stopCamera();
        void processVideo(new Blob(chunks, { type: mime.split(';')[0] }), Math.min(8, (performance.now() - started) / 1000));
      };
      recordingDevice.start(); setRecording(true); setSeconds(0);
      timer.current = setInterval(() => {
        const elapsed = (performance.now() - started) / 1000; setSeconds(Math.min(8, Math.floor(elapsed)));
        if (elapsed >= 8 && recordingDevice.state !== 'inactive') recordingDevice.stop();
      }, 250);
    } catch (err) { setError(err instanceof Error ? err.message : 'Không quay được video.'); }
  }
  return <section className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
    <div><h3 className="m-0 text-base font-medium">Ảnh chân dung hoặc video khuôn mặt</h3>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">Chỉ một người, đủ sáng. Quay chậm từ nhìn thẳng sang hơi nghiêng trái/phải. Ảnh mẫu sẽ được kiểm tra khi bạn xác nhận.</p></div>
    <div className="flex flex-wrap gap-2">
      <label className={button}><ImagePlus size={17} /> Chọn 1–8 ảnh<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={blocked} onChange={choosePhotos} /></label>
      <label className={button}><Video size={17} /> Tải video<input className="sr-only" type="file" accept="video/mp4,video/webm" disabled={blocked} onChange={chooseVideo} /></label>
      {!cameraOn && <button type="button" className={button} disabled={blocked} onClick={startCamera}><Camera size={17} /> Bật camera</button>}
    </div>
    {cameraOn && <div className="space-y-3"><video ref={video} autoPlay muted playsInline className="max-h-72 w-full rounded-lg bg-black object-contain" aria-label="Camera đăng ký khuôn mặt" />
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={blocked} onClick={capture}>Chụp ảnh mẫu</button>
        {recording ? <button type="button" className={button} onClick={() => recorder.current?.stop()}><Square size={16} /> Dừng quay ({seconds}/8 giây)</button>
          : <button type="button" className={button} disabled={blocked} onClick={record}><Video size={17} /> Quay 8 giây</button>}
        <button type="button" className={button} disabled={recording || processing} onClick={stopCamera}>Tắt camera</button></div></div>}
    {processing && <p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle className="animate-spin" size={17} /> Đang chuẩn bị ảnh mẫu…</p>}
    {value.images.length > 0 && <><div className="grid grid-cols-4 gap-2">{value.images.map((image, index) => <div key={index} className="relative">
      <img src={image} alt={`Mẫu khuôn mặt ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />
      <button type="button" aria-label={`Xóa mẫu ${index + 1}`} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" disabled={blocked}
        onClick={() => { const images = value.images.filter((_, i) => i !== index); onChange(images.length ? { ...value, images } : emptyEnrollment()); }}><X size={16} /></button>
    </div>)}</div><p className="text-sm text-[var(--ink-muted)]">Đã chuẩn bị {value.images.length} ảnh mẫu{value.capture_source === 'video' ? ' từ video' : ''}. Mẫu sẽ được kiểm tra khi bạn bấm xác nhận.</p></>}
    <p className="text-sm text-[var(--ink-muted)]">Video MP4/WebM: 1–20 giây, dưới 8 MB. Bộ mẫu mới sẽ thay bộ mẫu đã đăng ký trước đó.</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </section>;
}
