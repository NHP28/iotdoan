import { NextRequest, NextResponse } from 'next/server';
import { BACKEND, SESSION_COOKIE } from '@/lib/server';

export const runtime = 'nodejs';
const allowed = /^(auth\/(login|register|logout|me|driver-profile|accounts(?:\/\d+\/role)?)|drivers(?:\/\d+)?|attendance|telemetry(?:\/my-alerts|\/snapshots\/\d+\/[a-f0-9-]{36}\.(?:jpg|png|webp))?|recognition\/(enroll|attendance|history|status))$/;
async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/');
  if (!allowed.test(path)) return NextResponse.json({ success: false, data: null, message: 'Không tìm thấy API.' }, { status: 404 });
  const read = request.method === 'GET';
  if (!read) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (origin && new URL(origin).host !== host) return NextResponse.json({ success: false, data: null, message: 'Yêu cầu không hợp lệ.' }, { status: 403 });
    if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ success: false, data: null, message: 'Yêu cầu cần có định dạng JSON.' }, { status: 415 });
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token && !['auth/login', 'auth/register'].includes(path)) return NextResponse.json({ success: false, data: null, message: 'Vui lòng đăng nhập.' }, { status: 401 });
  const raw = read ? undefined : await request.text();
  if (raw && Buffer.byteLength(raw) > 4_300_000) return NextResponse.json({ success: false, data: null, message: 'Ảnh quá lớn. Giới hạn 3 MB.' }, { status: 413 });
  try {
    const response = await fetch(`${BACKEND}/${path}${request.nextUrl.search}`, {
      method: request.method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: raw, cache: 'no-store', signal: AbortSignal.timeout(65000),
    });
    if (response.ok && path.startsWith('telemetry/snapshots/')) {
      const type = response.headers.get('content-type') || '';
      if (!/^image\/(jpeg|png|webp)(;|$)/.test(type)) throw new Error('Invalid snapshot response');
      return new NextResponse(response.body, { status: response.status, headers: {
        'Content-Type': type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      } });
    }
    const body = await response.json();
    let session: string | undefined;
    if (path === 'auth/login' && response.ok) {
      session = body.data.token;
      body.data = body.data.user;
    }
    const result = NextResponse.json(body, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
    if (session) result.cookies.set(SESSION_COOKIE, session, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
    if (path === 'auth/logout' && response.ok || response.status === 401 && path !== 'auth/login') result.cookies.delete(SESSION_COOKIE);
    return result;
  } catch {
    return NextResponse.json({ success: false, data: null, message: 'Không kết nối được backend. Vui lòng kiểm tra NestJS, MySQL và cấu hình BACKEND_URL.' }, { status: 503 });
  }
}
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
