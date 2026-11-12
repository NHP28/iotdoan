
'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  LoaderCircle,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';
import type { User } from '@/lib/types';

export default function AuthScreen({
  mode,
}: {
  mode: 'login' | 'register';
}) {
  const register = mode === 'register';
  const router = useRouter();

  const [role, setRole] = useState<'user' | 'driver'>('driver');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (register) data.role = role;

    try {
      if (register) {
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(
            Array.isArray(result.message)
              ? result.message.join(' · ')
              : result.message
          );
        }

        setSuccess('Đăng ký thành công. Đang đăng nhập…');
      }

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          Array.isArray(result.message)
            ? result.message.join(' · ')
            : result.message
        );
      }

      const user = result.data as User;
      router.replace(`/${user.role}/overview`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối máy chủ.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page auth-centered">
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-top">
            <span>
              {register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            </span>
            <Link href={register ? '/login' : '/register'}>
              {register ? 'Đăng nhập' : 'Đăng ký ngay'}
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className={`auth-form-wrap ${register ? 'register-wrap' : ''}`}>
            <div className="auth-symbol">
              {register ? <Truck size={25} /> : <Fingerprint size={27} />}
            </div>

            <span className="eyebrow">
              {register ? 'BẮT ĐẦU HÀNH TRÌNH' : 'CHÀO MỪNG TRỞ LẠI'}
            </span>

            <h2>
              {register ? 'Tạo tài khoản mới' : 'Đăng nhập DriverHub'}
            </h2>

            <p className="auth-description">
              {register
                ? 'Đăng ký hồ sơ hôm nay, sẵn sàng cho ca làm tiếp theo.'
                : 'Đăng nhập để tiếp tục quản lý hành trình của bạn.'}
            </p>

            <form onSubmit={submit} className="auth-form">
              {register && (
                <>
                  <fieldset className="role-fieldset">
                    <legend>Bạn muốn tham gia với vai trò</legend>
                    <div className="role-options">
                      <button
                        type="button"
                        aria-pressed={role === 'driver'}
                        className={`role-option ${role === 'driver' ? 'selected' : ''}`}
                        onClick={() => setRole('driver')}
                      >
                        <Truck size={20} />
                        <span>
                          Tài xế
                          <small>Đăng ký & điểm danh</small>
                        </span>
                        <span className="radio-dot" />
                      </button>

                      <button
                        type="button"
                        aria-pressed={role === 'user'}
                        className={`role-option ${role === 'user' ? 'selected' : ''}`}
                        onClick={() => setRole('user')}
                      >
                        <UserRound size={20} />
                        <span>
                          Người dùng
                          <small>Tài khoản cá nhân</small>
                        </span>
                        <span className="radio-dot" />
                      </button>
                    </div>
                  </fieldset>

                  <label>
                    Họ và tên
                    <input
                      name="full_name"
                      placeholder="Nguyễn Văn An"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </label>
                </>
              )}

              <label>
                {register ? 'Email' : 'Tài khoản hoặc Email'}
                <input
                  name="email"
                  type={register ? 'email' : 'text'}
                  placeholder={
                    register
                      ? 'ban@example.com'
                      : 'Nhập email hoặc tài khoản'
                  }
                  required
                  autoComplete={register ? 'email' : 'username'}
                  maxLength={255}
                />
              </label>

              <label>
                Mật khẩu
                <div className="password-input">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={
                      register
                        ? 'Tối thiểu 6 ký tự'
                        : 'Nhập mật khẩu của bạn'
                    }
                    required
                    minLength={register ? 6 : 1}
                    maxLength={128}
                    autoComplete={
                      register ? 'new-password' : 'current-password'
                    }
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                    }
                  >
                    {showPassword
                      ? <EyeOff size={18} />
                      : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {register && role === 'driver' && (
                <div className="form-grid">
                  <label>
                    Số điện thoại
                    <input
                      name="phone"
                      type="tel"
                      placeholder="0912345678"
                      required
                      pattern="\+?[0-9]{9,15}"
                      autoComplete="tel"
                    />
                  </label>
                  <label>
                    Số giấy phép lái xe
                    <input
                      name="license_number"
                      placeholder="Nhập số GPLX"
                      required
                      minLength={5}
                      maxLength={50}
                    />
                  </label>
                </div>
              )}

              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}

              {success && (
                <div className="notice success" role="status">
                  {success}
                </div>
              )}

              <button className="button primary full" disabled={busy}>
                {busy && <LoaderCircle className="spin" size={18} />}
                {busy
                  ? 'Đang xử lý…'
                  : register
                    ? 'Tạo tài khoản'
                    : 'Đăng nhập'}
                {!busy && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="auth-safe">
              <ShieldCheck size={15} />
              <span>
                {register
                  ? 'Sau đăng ký, đăng nhập để thêm khuôn mặt nhận diện.'
                  : 'Quyền truy cập được xác định theo tài khoản của bạn.'}
              </span>
            </div>

            <div className="auth-role-note">
              <span className="tiny-dot" /> ADMIN
              <span className="tiny-dot" /> NGƯỜI DÙNG
              <span className="tiny-dot" /> TÀI XẾ
            </div>
          </div>
        </div>

        <footer className="auth-footer">
          Hệ thống điểm danh & giám sát an toàn lái xe
        </footer>
      </main>
    </div>
  );
}
