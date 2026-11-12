import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { User } from './types';

const backendOrigin = (process.env.BACKEND_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
export const BACKEND = backendOrigin.endsWith('/api/v1') ? backendOrigin : `${backendOrigin}/api/v1`;
export const SESSION_COOKIE = 'driverhub_session';
export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let response: Response;
  try {
    response = await fetch(`${BACKEND}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
  } catch { throw new Error('Không kết nối được backend. Vui lòng kiểm tra dịch vụ NestJS và MySQL.'); }
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Backend chưa sẵn sàng. Vui lòng kiểm tra MySQL và khởi tạo database.');
  return (await response.json()).data;
});
