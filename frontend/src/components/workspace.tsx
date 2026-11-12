'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowUpRight, ChevronRight, CircleAlert, ClipboardList, Fingerprint, LayoutDashboard, LogOut, Menu, Moon, Plus, ShieldCheck, Sun, Truck, UserRound, Users, X } from 'lucide-react';
import { api } from '@/lib/api';
import { pageTitles, roleLabel, sections, User } from '@/lib/types';
import Brand from './brand';
import Overview from './overview';
import { AccountsPage, AttendancePage, DevicesPage, DriversPage } from './admin-pages';
import { DriverRegistration, ProfilePage } from './profile-pages';
import CameraPage from './pi-attendance';
import DriverAlertHistorySection from './driver-alert-history';

const icons: Record<string, typeof Activity> = { overview: LayoutDashboard, drivers: Truck, attendance: ClipboardList, alerts: CircleAlert, devices: Activity, accounts: Users, profile: UserRound, 'check-in': Fingerprint, 'register-driver': Plus };
export default function Workspace({ user, section }: { user: User; section: string }) {
  const router = useRouter();
  const [sidebar, setSidebar] = useState(false);
  const [dark, setDark] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => { setDark(localStorage.getItem('driverhub-theme') === 'dark'); }, []);
  useEffect(() => { setSidebar(false); }, [section]);
  function toggleTheme() { setDark(!dark); localStorage.setItem('driverhub-theme', !dark ? 'dark' : 'light'); }
  async function logout() {
    setLoggingOut(true); setLogoutError('');
    try { await api('auth/logout', { method: 'POST', body: '{}' }); router.replace('/login'); router.refresh(); }
    catch (err) { setLogoutError(err instanceof Error ? err.message : 'Không thể đăng xuất.'); }
    finally { setLoggingOut(false); }
  }
  return <div className={`workspace ${dark ? 'dark' : ''}`}>
    {sidebar && <button className="sidebar-backdrop" onClick={() => setSidebar(false)} aria-label="Đóng menu" />}
    <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
      <div className="sidebar-brand"><Brand href={`/${user.role}/overview`} /><button className="icon-button mobile-close" onClick={() => setSidebar(false)} aria-label="Đóng menu"><X size={18} /></button></div>
      <div className="workspace-label"><span className="workspace-icon"><ShieldCheck size={17} /></span><div><strong>Không gian làm việc</strong><span>{roleLabel[user.role]}</span></div><span className="status-dot" /></div>
      <nav className="sidebar-nav" aria-label="Điều hướng chính"><div className="nav-caption">KHÔNG GIAN CỦA BẠN <span /></div>{sections[user.role].filter(s => s !== 'profile').map(s => { const Icon = icons[s]; return <Link key={s} href={`/${user.role}/${s}`} className={`nav-link ${section === s ? 'active' : ''}`} aria-current={section === s ? 'page' : undefined}><Icon size={18} /><span>{pageTitles[s]}</span>{section === s && <ChevronRight size={14} />}</Link>; })}
        <div className="nav-caption nav-caption-second">TÀI KHOẢN <span /></div><Link href={`/${user.role}/profile`} className={`nav-link ${section === 'profile' ? 'active' : ''}`} aria-current={section === 'profile' ? 'page' : undefined}><UserRound size={18} /><span>Hồ sơ của tôi</span></Link>
      </nav>
      <div className="sidebar-bottom"><span className="avatar">{user.full_name.charAt(0).toUpperCase()}</span><div><strong>{user.full_name}</strong><small>{roleLabel[user.role]}</small></div><button title="Đăng xuất" aria-label="Đăng xuất" onClick={logout} disabled={loggingOut} className="logout-button"><LogOut size={18} /></button></div>
      </aside>
    <div className="workspace-main">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Mở menu" onClick={() => setSidebar(true)}><Menu size={19} /></button><span>Không gian làm việc</span><ChevronRight size={14} /><strong>{pageTitles[section]}</strong></div><div className="topbar-actions"><span className="console-tag"><span className="status-dot" /> DRIVERHUB CONSOLE</span><button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={dark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><span className="topbar-divider" /><Link href={`/${user.role}/profile`} className="topbar-user"><span className="avatar small">{user.full_name.charAt(0).toUpperCase()}</span><div><strong>{user.full_name}</strong><small>{roleLabel[user.role]}</small></div></Link></div></header>
      <main className="content" key={section}>{logoutError && <div className="notice error" role="alert">{logoutError}</div>}
        {section === 'overview' && <Overview user={user} />}
        {section === 'drivers' && <DriversPage />}
        {section === 'accounts' && <AccountsPage user={user} />}
        {section === 'devices' && <DevicesPage />}
        {section === 'attendance' && <AttendancePage user={user} />}
        {section === 'alerts' && <DriverAlertHistorySection />}
        {section === 'profile' && <ProfilePage user={user} />}
        {section === 'register-driver' && <DriverRegistration user={user} />}
        {section === 'check-in' && <CameraPage user={user} />}
      </main>
      <footer className="workspace-footer"><span>© {new Date().getFullYear()} DriverHub. Mỗi hành trình, thêm an tâm.</span><span>THỜI GIAN VIỆT NAM · UTC+7</span></footer>
    </div>
  </div>;
}
