'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="standalone"><div className="panel error-page"><span className="eyebrow">DRIVERHUB / KẾT NỐI</span><h1>Máy chủ chưa sẵn sàng</h1><p>Vui lòng kiểm tra backend, kết nối MySQL và cấu hình BACKEND_URL, sau đó thử lại.</p><button className="button primary" onClick={reset}>Thử kết nối lại</button><a href="/login">Về trang đăng nhập</a></div></main>;
}
