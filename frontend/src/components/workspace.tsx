'use client';
import { cx } from '@/lib/styles';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  Truck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { pageTitles, roleLabel, sections, User } from '@/lib/types';
import Brand from './brand';
import Overview from './overview';
import { AccountsPage, AttendancePage, DevicesPage, DriversPage } from './admin-pages';
import { DriverRegistration, ProfilePage } from './profile-pages';
import CameraPage from './pi-attendance';
import DriverAlertHistorySection from './driver-alert-history';
import AdminViolationHistory from './admin-violation-history';

const icons: Record<string, typeof Activity> = {
  overview: LayoutDashboard,
  drivers: Truck,
  attendance: ClipboardList,
  alerts: CircleAlert,
  violations: CircleAlert,
  devices: Activity,
  accounts: Users,
  profile: UserRound,
  'check-in': Fingerprint,
  'register-driver': Plus,
};
export default function Workspace({ user, section }: { user: User; section: string }) {
  const router = useRouter();
  const [sidebar, setSidebar] = useState(false);
  const [dark, setDark] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    setDark(localStorage.getItem('driverhub-theme') === 'dark');
  }, []);
  useEffect(() => {
    setSidebar(false);
  }, [section]);
  function toggleTheme() {
    setDark(!dark);
    localStorage.setItem('driverhub-theme', !dark ? 'dark' : 'light');
  }
  async function logout() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await api('auth/logout', { method: 'POST', body: '{}' });
      router.replace('/login');
      router.refresh();
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : 'Không thể đăng xuất.');
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div
      data-theme={dark ? 'dark' : 'light'}
      className={cx(
        'bg-none min-h-[100vh] grid grid-cols-[268px_minmax(0,_1fr)] bg-[var(--bg-paper)] text-[var(--ink)] [@media(width<=1024px)]:grid-cols-[1fr]',
        dark &&
          '[--bg-paper:#0b0f19] [--bg-surface:#131926] [--bg-subtle:#1e293b] [--ink:#f8fafc] [--ink-secondary:#cbd5e1] [--ink-muted:#94a3b8] [--border:#334155] [--border-strong:#475569] [--shadow-hard-sm:2px_2px_0px_0px_#000000] [--shadow-hard:4px_4px_0px_0px_#000000] [--shadow-hard-lg:6px_6px_0px_0px_#000000]',
      )}
    >
      {sidebar && (
        <button
          className="text-inherit [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] cursor-pointer [@media(width<=1024px)]:border-[0] [@media(width<=1024px)]:border-none [@media(width<=1024px)]:[border-color:currentColor] [@media(width<=1024px)]:bg-none [@media(width<=1024px)]:fixed [@media(width<=1024px)]:top-[0] [@media(width<=1024px)]:right-[0] [@media(width<=1024px)]:bottom-[0] [@media(width<=1024px)]:left-[0] [@media(width<=1024px)]:bg-[rgba(15,_23,_42,_0.5)] [@media(width<=1024px)]:z-[35] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55]"
          onClick={() => setSidebar(false)}
          aria-label="Đóng menu"
        />
      )}
      <aside
        className={cx(
          'px-[1rem] py-[1.25rem] gap-[1rem] bg-none sticky top-[0] h-[100vh] overflow-y-auto bg-[var(--bg-surface)] [border-right-width:2px] [border-right-style:solid] [border-right-color:var(--border-strong)] flex flex-col z-[40] [@media(width<=1024px)]:fixed [@media(width<=1024px)]:left-[0] [@media(width<=1024px)]:bottom-[0] [@media(width<=1024px)]:w-[280px] [@media(width<=1024px)]:[transition:transform_0.2s_ease]',
          sidebar && '[@media(width<=1024px)]:[transform:translateX(0)]',
          !sidebar && '[@media(width<=1024px)]:[transform:translateX(-105%)]',
        )}
      >
        <div className="px-[0.25rem] py-[0] flex items-center justify-between">
          <Brand href={`/${user.role}/overview`} />
          <button
            className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer hidden items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [@media(width<=1024px)]:inline-flex [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
            onClick={() => setSidebar(false)}
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-[0.75rem] py-[0.65rem] rounded-[12px] border-[1.5px] border-solid [border-color:var(--border)] gap-[0.65rem] bg-none flex items-center bg-[var(--bg-subtle)]">
          <span className="rounded-[8px] border-[1.5px] border-solid [border-color:#11141c] bg-none w-[32px] h-[32px] bg-[var(--primary)] text-[#11141c] inline-flex items-center justify-center">
            <ShieldCheck size={17} />
          </span>
          <div className="grow-[1] shrink-[1] basis-[0%] min-w-[0]">
            <strong className="font-medium block text-[0.78rem]">Không gian làm việc</strong>
            <span className="block text-[0.72rem] text-[var(--ink-muted)]">
              {roleLabel[user.role]}
            </span>
          </div>
          <span className="rounded-[999px] bg-none inline-block w-[8px] h-[8px] bg-[#22c55e] [box-shadow:0_0_0_3px_rgba(34,_197,_94,_0.2)] shrink-[0]" />
        </div>
        <nav
          className="gap-[0.25rem] flex flex-col grow-[1] shrink-[1] basis-[0%]"
          aria-label="Điều hướng chính"
        >
          <div className="px-[0.5rem] gap-[0.5rem] flex items-center text-[0.66rem] font-medium tracking-[0.09em] text-[var(--ink-muted)] pt-[0.5rem] pb-[0.25rem]">
            KHÔNG GIAN CỦA BẠN{' '}
            <span className="bg-none grow-[1] shrink-[1] basis-[0%] h-[1px] bg-[var(--border)]" />
          </div>
          {sections[user.role]
            .filter((s) => s !== 'profile')
            .map((s) => {
              const Icon = icons[s];
              return (
                <Link
                  key={s}
                  href={`/${user.role}/${s}`}
                  className={cx(
                    'px-[0.8rem] py-[0.6rem] rounded-[12px] border-[2px] border-solid gap-[0.7rem] no-underline flex items-center text-[0.83rem] font-medium [transition:all_0.14s_ease]',
                    dark &&
                      section === s &&
                      '[border-color:#ffffff] bg-none text-[#11141c] bg-[var(--primary)] [box-shadow:2px_2px_0px_0px_#11141c]',
                    !(section === s) &&
                      '[border-color:transparent] text-[var(--ink-secondary)] [&:hover]:bg-none [&:hover]:text-[var(--ink)] [&:hover]:bg-[var(--bg-subtle)]',
                    !dark &&
                      section === s &&
                      '[border-color:#11141c] bg-none text-[#11141c] bg-[var(--primary)] [box-shadow:2px_2px_0px_0px_#11141c]',
                  )}
                  aria-current={section === s ? 'page' : undefined}
                >
                  <Icon size={18} />
                  <span className="grow-[1] shrink-[1] basis-[0%]">{pageTitles[s]}</span>
                  {section === s && <ChevronRight size={14} />}
                </Link>
              );
            })}
          <div className="px-[0.5rem] gap-[0.5rem] flex items-center text-[0.66rem] font-medium tracking-[0.09em] text-[var(--ink-muted)] pt-[0.5rem] pb-[0.25rem] mt-[0.65rem]">
            TÀI KHOẢN{' '}
            <span className="bg-none grow-[1] shrink-[1] basis-[0%] h-[1px] bg-[var(--border)]" />
          </div>
          <Link
            href={`/${user.role}/profile`}
            className={cx(
              'px-[0.8rem] py-[0.6rem] rounded-[12px] border-[2px] border-solid gap-[0.7rem] no-underline flex items-center text-[0.83rem] font-medium [transition:all_0.14s_ease]',
              dark &&
                section === 'profile' &&
                '[border-color:#ffffff] bg-none text-[#11141c] bg-[var(--primary)] [box-shadow:2px_2px_0px_0px_#11141c]',
              !(section === 'profile') &&
                '[border-color:transparent] text-[var(--ink-secondary)] [&:hover]:bg-none [&:hover]:text-[var(--ink)] [&:hover]:bg-[var(--bg-subtle)]',
              !dark &&
                section === 'profile' &&
                '[border-color:#11141c] bg-none text-[#11141c] bg-[var(--primary)] [box-shadow:2px_2px_0px_0px_#11141c]',
            )}
            aria-current={section === 'profile' ? 'page' : undefined}
          >
            <UserRound size={18} />
            <span className="grow-[1] shrink-[1] basis-[0%]">Hồ sơ của tôi</span>
          </Link>
        </nav>
        <div className="gap-[0.65rem] flex items-center pt-[0.75rem] [border-top-width:1.5px] [border-top-style:solid] [border-top-color:var(--border)]">
          <span className="rounded-[10px] border-[1.5px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--primary)] text-[#11141c] font-medium text-[0.88rem] shrink-[0]">
            {user.full_name.charAt(0).toUpperCase()}
          </span>
          <div className="grow-[1] shrink-[1] basis-[0%] min-w-[0]">
            <strong className="font-medium block text-[0.82rem] whitespace-nowrap overflow-x-hidden overflow-y-hidden [text-overflow:ellipsis]">
              {user.full_name}
            </strong>
            <small className="block text-[0.72rem] text-[var(--ink-muted)]">
              {roleLabel[user.role]}
            </small>
          </div>
          <button
            title="Đăng xuất"
            aria-label="Đăng xuất"
            onClick={logout}
            disabled={loggingOut}
            className="rounded-[9px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink-muted)] cursor-pointer inline-flex items-center justify-center w-[34px] h-[34px] bg-[transparent] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:hover]:[border-color:#dc2626] [&:hover]:text-[#dc2626] [&:hover]:bg-[var(--danger-bg)]"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="flex flex-col min-w-[0]">
        <header className="px-[1.75rem] py-[0.8rem] gap-[1rem] bg-none sticky top-[0] z-[20] bg-[var(--bg-surface)] [border-bottom-width:2px] [border-bottom-style:solid] [border-bottom-color:var(--border-strong)] flex items-center justify-between">
          <div className="gap-[0.5rem] flex items-center text-[0.85rem] text-[var(--ink-muted)]">
            <button
              className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer hidden items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [@media(width<=1024px)]:inline-flex [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
              aria-label="Mở menu"
              onClick={() => setSidebar(true)}
            >
              <Menu size={19} />
            </button>
            <span>Không gian làm việc</span>
            <ChevronRight size={14} />
            <strong className="font-medium text-[var(--ink)]">{pageTitles[section]}</strong>
          </div>
          <div className="gap-[0.75rem] flex items-center">
            <span className="px-[0.65rem] py-[0.3rem] rounded-[999px] border-[1.5px] border-solid [border-color:var(--border)] gap-[0.45rem] bg-none inline-flex items-center bg-[var(--bg-subtle)] text-[0.68rem] font-medium tracking-[0.06em] [@media(width<=640px)]:hidden">
              <span className="rounded-[999px] bg-none inline-block w-[8px] h-[8px] bg-[#22c55e] [box-shadow:0_0_0_3px_rgba(34,_197,_94,_0.2)] shrink-[0]" />{' '}
              DRIVERHUB CONSOLE
            </span>
            <button
              className="rounded-[10px] border-[1.5px] border-solid [border-color:var(--border)] bg-none [font-family:inherit] [font-size:inherit] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[var(--ink)] cursor-pointer inline-flex items-center justify-center w-[36px] h-[36px] bg-[var(--bg-surface)] [transition:all_0.15s_ease] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[border-color:var(--border-strong)] [&:not(:disabled):hover]:text-[#11141c] [&:not(:disabled):hover]:bg-[var(--primary)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard-sm)]"
              onClick={toggleTheme}
              aria-label={dark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className="bg-none w-[1px] h-[24px] bg-[var(--border)]" />
            <Link
              href={`/${user.role}/profile`}
              className="text-inherit gap-[0.55rem] [font-size:inherit] no-underline inline-flex items-center"
            >
              <span className="rounded-[10px] border-[1.5px] border-solid [border-color:#11141c] bg-none inline-flex items-center justify-center w-[32px] h-[32px] bg-[var(--primary)] text-[#11141c] font-medium text-[0.8rem] shrink-[0]">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
              <div>
                <strong className="font-medium block text-[0.8rem] leading-[1.2]">
                  {user.full_name}
                </strong>
                <small className="block text-[0.7rem] text-[var(--ink-muted)]">
                  {roleLabel[user.role]}
                </small>
              </div>
            </Link>
          </div>
        </header>
        <main
          className="p-[1.75rem] mx-[auto] my-[0] grow-[1] shrink-[1] basis-[0%] w-[100%] max-w-[1260px] [@media(width<=640px)]:p-[1.1rem]"
          key={section}
        >
          {logoutError && (
            <div
              className="px-[1rem] py-[0.8rem] rounded-[10px] border-[2px] border-solid [border-color:#dc2626] bg-none text-[0.85rem] font-medium mb-[1rem] bg-[var(--danger-bg)] text-[#991b1b]"
              role="alert"
            >
              {logoutError}
            </div>
          )}
          {section === 'overview' && <Overview user={user} />}
          {section === 'drivers' && <DriversPage />}
          {section === 'accounts' && <AccountsPage user={user} />}
          {section === 'devices' && <DevicesPage />}
          {section === 'attendance' && <AttendancePage user={user} />}
          {section === 'alerts' && <DriverAlertHistorySection />}
          {section === 'violations' && <AdminViolationHistory />}
          {section === 'profile' && <ProfilePage user={user} />}
          {section === 'register-driver' && <DriverRegistration user={user} />}
          {section === 'check-in' && <CameraPage user={user} />}
        </main>
        <footer className="px-[1.75rem] py-[1rem] gap-[0.5rem] [border-top-width:1.5px] [border-top-style:solid] [border-top-color:var(--border)] flex justify-between flex-wrap text-[0.75rem] text-[var(--ink-muted)]">
          <span>© {new Date().getFullYear()} DriverHub.</span>
          <span>THỜI GIAN VIỆT NAM · UTC+7</span>
        </footer>
      </div>
    </div>
  );
}
