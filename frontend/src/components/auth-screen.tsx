'use client';
import { cx } from '@/lib/styles';

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
} from 'lucide-react';
import type { User } from '@/lib/types';

export default function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register';
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');

    const data: Record<string, unknown> = Object.fromEntries(
      new FormData(event.currentTarget),
    );
    if (register) data.role = 'driver';

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
              : result.message,
          );
        }

        setSuccess('Đăng ký tài xế thành công. Đang đăng nhập…');
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
            : result.message,
        );
      }

      const user = result.data as User;
      router.replace(
        register && user.role === 'driver'
          ? '/driver/profile'
          : `/${user.role}/overview`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể kết nối máy chủ.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-[16px] py-[24px] min-h-[100dvh] flex justify-center items-center w-full bg-[#f7f8fa] [@media(width<=520px)]:py-[16px]">
      <main
        className={cx(
          'm-0 flex w-full min-w-0 flex-col items-stretch justify-center',
          register ? 'max-w-[1040px]' : 'max-w-[480px]',
        )}
      >
        <div>
          <div className="gap-[0.65rem] flex justify-end items-center text-[0.85rem]">
            <span>{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span>
            <Link
              className="text-inherit px-[0.85rem] py-[0.4rem] rounded-[999px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.35rem] bg-none [font-size:inherit] no-underline inline-flex items-center font-medium bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-sm)]"
              href={register ? '/login' : '/register'}
            >
              {register ? 'Đăng nhập' : 'Đăng ký ngay'}
              <ArrowRight size={14} />
            </Link>
          </div>

          <div
            className={cx(
              'p-[2rem] mx-[auto] my-[1.5rem] rounded-[18px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none w-[100%] bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard-lg)] [@media(width<=520px)]:p-5',
              register && 'max-w-[1040px]',
              !register && 'max-w-[430px]',
            )}
          >
            <header className={cx(register && 'mb-6 flex items-center gap-4')}>
              <div
                className={cx(
                  'shrink-0 rounded-[12px] border-[2px] border-solid [border-color:var(--border-strong)] w-[48px] h-[48px] bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] flex items-center justify-center',
                  !register && 'mb-[1rem]',
                )}
              >
                {register ? <Truck size={25} /> : <Fingerprint size={27} />}
              </div>
              <div className="min-w-0">
                <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
                  {register ? 'ĐĂNG KÝ TÀI XẾ' : 'ĐĂNG NHẬP'}
                </span>

                <h2 className="m-[0] font-medium text-[1.55rem] tracking-[-0.02em]">
                  {register ? 'Tạo tài khoản mới' : 'Đăng nhập DriverHub'}
                </h2>

                <p
                  className={cx(
                    'mx-0 mt-[0.35rem] text-[0.88rem] text-[var(--ink-muted)]',
                    register ? 'mb-0' : 'mb-[1.35rem]',
                  )}
                >
                  {register
                    ? 'Tạo tài khoản để quản lý hồ sơ và điểm danh.'
                    : 'Đăng nhập để truy cập hệ thống.'}
                </p>
              </div>
            </header>

            <form onSubmit={submit} className="gap-[0.95rem] flex flex-col">
              <div
                className={cx(
                  'grid min-w-0 gap-[0.95rem]',
                  register && '[@media(width>=640px)]:grid-cols-2',
                )}
              >
                {register && (
                  <label className="col-span-full gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                    Họ và tên
                    <input
                      className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                      name="full_name"
                      placeholder="Nguyễn Văn An"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </label>
                )}

                <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                  {register ? 'Email' : 'Tài khoản hoặc Email'}
                  <input
                    className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                    name="email"
                    type={register ? 'email' : 'text'}
                    placeholder={
                      register ? 'ban@example.com' : 'Nhập email hoặc tài khoản'
                    }
                    required
                    autoComplete={register ? 'email' : 'username'}
                    maxLength={255}
                  />
                </label>

                <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                  Mật khẩu
                  <div className="relative flex items-center">
                    <input
                      className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={
                        register ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu của bạn'
                      }
                      required
                      minLength={register ? 6 : 1}
                      maxLength={128}
                      autoComplete={
                        register ? 'new-password' : 'current-password'
                      }
                    />
                    <button
                      className="p-[0.25rem] border-[0] border-none [border-color:currentColor] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink-muted)] cursor-pointer absolute right-[0.55rem] bg-[transparent] inline-flex [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:hover]:text-[var(--ink)]"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {register && (
                  <div className="col-span-full gap-[0.85rem] grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<640px)]:grid-cols-[1fr]">
                    <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                      Số điện thoại
                      <input
                        className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                        name="phone"
                        type="tel"
                        placeholder="0912345678"
                        required
                        pattern="\+?[0-9]{9,15}"
                        autoComplete="tel"
                      />
                    </label>
                    <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
                      Số giấy phép lái xe
                      <input
                        className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                        name="license_number"
                        placeholder="Nhập số GPLX"
                        required
                        minLength={5}
                        maxLength={50}
                      />
                    </label>
                  </div>
                )}
              </div>
              {error && (
                <div
                  className="px-[1rem] py-[0.8rem] rounded-[10px] border-[2px] border-solid [border-color:#dc2626] bg-none text-[0.85rem] font-medium mb-[1rem] bg-[var(--danger-bg)] text-[#991b1b]"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  className="px-[1rem] py-[0.8rem] rounded-[10px] border-[2px] border-solid [border-color:#16a34a] bg-none text-[0.85rem] font-medium mb-[1rem] bg-[var(--success-bg)] text-[#166534]"
                  role="status"
                >
                  {success}
                </div>
              )}

              <button
                className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] w-[100%] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                disabled={busy}
              >
                {busy && (
                  <LoaderCircle
                    className="animate-spin [animation-duration:0.9s]"
                    size={18}
                  />
                )}
                {busy
                  ? 'Đang xử lý…'
                  : register
                    ? 'Đăng ký tài xế'
                    : 'Đăng nhập'}
                {!busy && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="gap-[0.5rem] flex items-center mt-[1.15rem] pt-[1rem] [border-top-width:1px] [border-top-style:dashed] [border-top-color:var(--border)] text-[0.78rem] text-[var(--ink-muted)]">
              <ShieldCheck size={15} />
              <span>
                {register
                  ? 'Sau khi đăng ký, vào hồ sơ để bắt đầu xác nhận khuôn mặt.'
                  : 'Quyền truy cập được xác định theo tài khoản của bạn.'}
              </span>
            </div>

            {!register && (
              <div className="gap-[0.55rem] flex items-center justify-center mt-[0.85rem] text-[0.68rem] font-medium tracking-[0.08em] text-[var(--ink-muted)]">
                <span className="rounded-[999px] bg-none inline-block w-[5px] h-[5px] bg-[var(--border-strong)]" />{' '}
                ADMIN
                <span className="rounded-[999px] bg-none inline-block w-[5px] h-[5px] bg-[var(--border-strong)]" />{' '}
                NGƯỜI DÙNG
                <span className="rounded-[999px] bg-none inline-block w-[5px] h-[5px] bg-[var(--border-strong)]" />{' '}
                TÀI XẾ
              </div>
            )}
          </div>
        </div>

        <footer className="text-center text-[0.78rem] text-[var(--ink-muted)]">
          Hệ thống điểm danh & giám sát an toàn lái xe
        </footer>
      </main>
    </div>
  );
}
