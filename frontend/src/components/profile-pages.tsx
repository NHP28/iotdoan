'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Fingerprint, LoaderCircle, ShieldCheck, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { roleLabel, User } from '@/lib/types';
import { Badge, Notice } from './ui';
import FaceCapture, { emptyEnrollment } from './face-capture';
import FaceVerification from './face-verification';

export function ProfilePage({ user }: { user: User }) {
  return (
    <>
      <div className="gap-[1rem] flex items-end justify-between flex-wrap mb-[1.4rem]">
        <div>
          <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
            TÀI KHOẢN / CÁ NHÂN
          </span>
          <h1 className="m-[0] font-medium text-[clamp(1.45rem,_2.4vw,_1.95rem)] tracking-[-0.02em]">
            Hồ sơ cá nhân
          </h1>
          <p className="mx-[0] mt-[0.2rem] mb-[0] text-[var(--ink-muted)] text-[0.9rem]">
            Thông tin tài khoản và hồ sơ tài xế đã liên kết.
          </p>
        </div>
      </div>
      <div className="gap-[1.25rem] grid grid-cols-[320px_minmax(0,_1fr)] [align-items:start] [@media(width<=1024px)]:grid-cols-[1fr]">
        <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.55rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex flex-col items-center text-center">
          <span className="rounded-[18px] border-[2px] border-solid [border-color:#11141c] bg-none w-[72px] h-[72px] bg-[var(--primary)] text-[#11141c] text-[1.75rem] font-medium [box-shadow:var(--shadow-hard-sm)] flex items-center justify-center mb-[0.35rem]">
            {user.full_name.charAt(0).toUpperCase()}
          </span>
          <h2 className="m-[0] font-medium">{user.full_name}</h2>
          <p className="m-[0]">{user.email}</p>
          <Badge tone="purple">{roleLabel[user.role]}</Badge>
          <div className="mx-[0] my-[0.65rem] bg-none w-[100%] h-[1px] bg-[var(--border)]" />
          <ShieldCheck size={25} />
          <strong className="font-medium">Tài khoản đã đăng nhập</strong>
          <p className="m-[0]">Quyền truy cập được kiểm tra ở máy chủ theo vai trò của bạn.</p>
        </section>
        <div className="gap-[1.15rem] flex flex-col">
          {user.role === 'driver' && user.driver && <FaceVerification user={user} />}
          <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)]">
            <div className="gap-[1rem] flex items-start justify-between mb-[1.1rem]">
              <div>
                <h3 className="m-[0] font-medium text-[1.05rem]">Thông tin tài khoản</h3>
                <p className="mx-[0] mt-[0.15rem] mb-[0] text-[0.83rem] text-[var(--ink-muted)]">
                  Dữ liệu gắn với tài khoản hiện tại
                </p>
              </div>
            </div>
            <dl className="m-[0] gap-[0.9rem] grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=640px)]:grid-cols-[1fr]">
              <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none bg-[var(--bg-subtle)]">
                <dt className="text-[0.73rem] font-medium text-[var(--ink-muted)] mb-[0.2rem]">
                  Họ và tên
                </dt>
                <dd className="m-[0] font-medium">{user.full_name}</dd>
              </div>
              <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none bg-[var(--bg-subtle)]">
                <dt className="text-[0.73rem] font-medium text-[var(--ink-muted)] mb-[0.2rem]">
                  Email
                </dt>
                <dd className="m-[0] font-medium">{user.email}</dd>
              </div>
              <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none bg-[var(--bg-subtle)]">
                <dt className="text-[0.73rem] font-medium text-[var(--ink-muted)] mb-[0.2rem]">
                  Vai trò
                </dt>
                <dd className="m-[0] font-medium">{roleLabel[user.role]}</dd>
              </div>
              <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none bg-[var(--bg-subtle)]">
                <dt className="text-[0.73rem] font-medium text-[var(--ink-muted)] mb-[0.2rem]">
                  Mã tài khoản
                </dt>
                <dd className="m-[0] [font-family:var(--font-mono)] text-[0.85rem] font-medium">
                  #{user.id}
                </dd>
              </div>
            </dl>
          </section>
          {user.driver ? (
            <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)]">
              <div className="gap-[1rem] flex items-start justify-between mb-[1.1rem]">
                <div>
                  <h3 className="m-[0] font-medium text-[1.05rem]">Hồ sơ tài xế</h3>
                  <p className="mx-[0] mt-[0.15rem] mb-[0] text-[0.83rem] text-[var(--ink-muted)]">
                    Thông tin phục vụ điểm danh ca làm
                  </p>
                </div>
                <Truck size={22} />
              </div>
              <dl className="m-[0] gap-[0.9rem] grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=640px)]:grid-cols-[1fr]">
                <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none bg-[var(--bg-subtle)]">
                  <dt className="text-[0.73rem] font-medium text-[var(--ink-muted)] mb-[0.2rem]">
                    Mã tài xế
                  </dt>
                  <dd className="m-[0] [font-family:var(--font-mono)] text-[0.85rem] font-medium">
                    {user.driver.driver_code}
                  </dd>
                </div>
                <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none bg-[var(--bg-subtle)]">
                  <dt className="text-[0.73rem] font-medium text-[var(--ink-muted)] mb-[0.2rem]">
                    Số điện thoại
                  </dt>
                  <dd className="m-[0] font-medium">{user.driver.phone || '—'}</dd>
                </div>
                <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none bg-[var(--bg-subtle)]">
                  <dt className="text-[0.73rem] font-medium text-[var(--ink-muted)] mb-[0.2rem]">
                    Giấy phép lái xe
                  </dt>
                  <dd className="m-[0] font-medium">{user.driver.license_number || '—'}</dd>
                </div>
                <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none bg-[var(--bg-subtle)]">
                  <dt className="text-[0.73rem] font-medium text-[var(--ink-muted)] mb-[0.2rem]">
                    Trạng thái hồ sơ
                  </dt>
                  <dd className="m-[0] font-medium">
                    <Badge tone={user.driver.is_active ? 'green' : 'red'}>
                      {user.driver.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </Badge>
                  </dd>
                </div>
                <div className="px-[0.9rem] py-[0.75rem] rounded-[10px] border-[1px] border-solid [border-color:var(--border)] bg-none bg-[var(--bg-subtle)]">
                  <dt className="text-[0.73rem] font-medium text-[var(--ink-muted)] mb-[0.2rem]">
                    Khuôn mặt nhận diện
                  </dt>
                  <dd className="m-[0] font-medium">
                    <Badge tone={user.driver.face_registered ? 'green' : 'yellow'}>
                      {user.driver.face_registered ? 'Đã đăng ký' : 'Chưa đăng ký'}
                    </Badge>
                  </dd>
                </div>
              </dl>
              <div className="mt-[1.25rem] pt-[1rem] [border-top-width:1px] [border-top-style:dashed] [border-top-color:var(--border)]">
                <Link
                  className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none text-[#11141c] no-underline inline-flex items-center justify-center text-[0.84rem] font-medium [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                  href="/driver/check-in"
                >
                  <Fingerprint size={17} />
                  Mở điểm danh
                  <ArrowRight size={16} />
                </Link>
              </div>
            </section>
          ) : (
            user.role === 'user' && (
              <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.7rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] flex flex-col items-start">
                <span className="rounded-[12px] border-[2px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[42px] h-[42px] text-[#11141c] [box-shadow:var(--shadow-hard-sm)] bg-[var(--mint)]">
                  <Truck size={24} />
                </span>
                <h3 className="m-[0] font-medium">Bắt đầu với vai trò tài xế</h3>
                <p className="m-[0]">
                  Thêm số điện thoại và giấy phép lái xe để tạo hồ sơ. Sau đó, đăng ký khuôn mặt để
                  điểm danh ca làm.
                </p>
                <Link
                  href="/user/register-driver"
                  className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none text-[#11141c] no-underline inline-flex items-center justify-center text-[0.84rem] font-medium [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
                >
                  Đăng ký tài xế
                  <ArrowRight size={16} />
                </Link>
              </section>
            )
          )}
          <p className="mx-[0] mt-[0.85rem] mb-[0] text-[0.8rem] text-[var(--ink-muted)]">
            Cần điều chỉnh thông tin hồ sơ tài xế? Vui lòng liên hệ quản trị viên.
          </p>
        </div>
      </div>
    </>
  );
}

export function DriverRegistration({ user }: { user: User }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enrollment, setEnrollment] = useState(emptyEnrollment);
  const [captureBusy, setCaptureBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || captureBusy) return;
    setBusy(true);
    setError('');
    try {
      if (!enrollment.images.length) throw new Error('Vui lòng thêm ảnh chân dung hoặc quay video khuôn mặt.');
      await api('auth/driver-profile', {
        method: 'POST',
        body: JSON.stringify({ ...Object.fromEntries(new FormData(event.currentTarget)), ...enrollment }),
      });
      router.replace('/driver/check-in');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng ký hồ sơ.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="gap-[1rem] flex items-end justify-between flex-wrap mb-[1.4rem]">
        <div>
          <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
            HỒ SƠ / ĐĂNG KÝ TÀI XẾ
          </span>
          <h1 className="m-[0] font-medium text-[clamp(1.45rem,_2.4vw,_1.95rem)] tracking-[-0.02em]">
            Đăng ký tài xế
          </h1>
          <p className="mx-[0] mt-[0.2rem] mb-[0] text-[var(--ink-muted)] text-[0.9rem]">
            Hoàn thiện hồ sơ và đăng ký ảnh hoặc video khuôn mặt để chấm công bằng Raspberry Pi.
          </p>
        </div>
      </div>
      <div className="gap-[1.25rem] grid grid-cols-[1.25fr_1fr] [align-items:start] [@media(width<=1024px)]:grid-cols-[1fr]">
        <section className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)]">
          <div className="gap-[1rem] flex items-start justify-between mb-[1.1rem]">
            <div>
              <h3 className="m-[0] font-medium text-[1.05rem]">Thông tin tài xế</h3>
              <p className="mx-[0] mt-[0.15rem] mb-[0] text-[0.83rem] text-[var(--ink-muted)]">
                Hồ sơ sẽ liên kết trực tiếp với tài khoản hiện tại.
              </p>
            </div>
            <Truck size={24} />
          </div>
          <form className="gap-[0.95rem] flex flex-col" onSubmit={submit}>
            <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
              Họ và tên
              <input
                className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                value={user.full_name}
                disabled
              />
            </label>
            <label className="gap-[0.4rem] font-medium flex flex-col text-[0.82rem] text-[var(--ink)]">
              Email tài khoản
              <input
                className="px-[0.85rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] text-[0.9rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] w-[100%] bg-[var(--bg-surface)] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--border-strong)] [&:focus]:[outline:none] [&:focus]:[box-shadow:var(--shadow-hard-sm)]"
                value={user.email}
                disabled
              />
            </label>
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
                required
                minLength={5}
                maxLength={50}
                placeholder="Nhập số trên giấy phép lái xe"
              />
            </label>
            <FaceCapture value={enrollment} onChange={setEnrollment} disabled={busy} onBusyChange={setCaptureBusy} />
            <Notice error={error} />
            <button
              className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
              disabled={busy || captureBusy}
            >
              {busy ? (
                <LoaderCircle size={17} className="animate-spin [animation-duration:0.9s]" />
              ) : (
                <PlusIcon />
              )}
              {busy ? 'Model đang nhận diện và lưu…' : 'Đăng ký nhân viên'}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
        <aside className="p-[1.5rem] rounded-[16px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.95rem] bg-none bg-[var(--bg-story)] text-[#11141c] [box-shadow:var(--shadow-hard)] flex flex-col">
          <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
            CHỈ VÀI BƯỚC ĐƠN GIẢN
          </span>
          <h2 className="m-[0] font-medium">Các bước đăng ký</h2>
          {[
            'Tạo hồ sơ tài xế với thông tin của bạn.',
            'Đăng ký ảnh khuôn mặt rõ nét với model AI.',
            'Đăng nhập và xác minh để check-in / check-out.',
          ].map((text, index) => (
            <div
              className="px-[0.85rem] py-[0.7rem] rounded-[12px] border-[1.5px] border-solid [border-color:#11141c] gap-[0.75rem] bg-none flex items-center bg-[#ffffff]"
              key={text}
            >
              <span className="rounded-[999px] border-[1.5px] border-solid [border-color:#11141c] bg-none w-[26px] h-[26px] bg-[var(--primary)] text-[0.78rem] font-medium inline-flex items-center justify-center shrink-[0]">
                {index + 1}
              </span>
              <p className="m-[0]">{text}</p>
            </div>
          ))}
          <div className="gap-[0.6rem] flex items-start text-[0.82rem] pt-[0.5rem]">
            <ShieldCheck size={21} />
            <p className="m-[0]">
              Tài khoản hiện tại sẽ chuyển sang vai trò tài xế sau khi tạo hồ sơ thành công.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function PlusIcon() {
  return <Check size={17} />;
}
