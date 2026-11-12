import Link from 'next/link';
export default function NotFound() { return <main className="standalone"><div className="panel error-page"><span className="eyebrow">404 / DRIVERHUB</span><h1>Không tìm thấy trang</h1><p>Trang bạn đang tìm không tồn tại hoặc không thuộc quyền truy cập của bạn.</p><Link className="button primary" href="/">Về trang tổng quan</Link></div></main>; }
