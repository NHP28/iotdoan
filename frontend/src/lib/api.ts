export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1/${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, cache: 'no-store',
  });
  const body = await res.json().catch(() => null);
  if (res.status === 401) { window.location.assign('/login'); throw new Error('Phiên đăng nhập đã hết hạn.'); }
  if (!res.ok) throw new Error(Array.isArray(body?.message) ? body.message.join(' · ') : body?.message || 'Không thể kết nối máy chủ.');
  return body.data as T;
}
