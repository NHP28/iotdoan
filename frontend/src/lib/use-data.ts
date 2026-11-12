'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
export function useData<T>(path: string | null, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState('');
  const request = useRef(0);
  const refresh = useCallback(async () => {
    if (!path) return;
    const current = ++request.current;
    setLoading(true); setError('');
    try { const value = await api<T>(path); if (current === request.current) setData(value); }
    catch (err) { if (current === request.current) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.'); }
    finally { if (current === request.current) setLoading(false); }
  }, [path]);
  useEffect(() => { void refresh(); return () => { request.current++; }; }, [refresh]);
  return { data, loading, error, refresh };
}
