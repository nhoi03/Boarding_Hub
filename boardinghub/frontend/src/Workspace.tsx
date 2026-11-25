import { useState } from 'react';
import type { ReactNode } from 'react';
import { App, Avatar, Button, Drawer } from 'antd';
import { ArrowUpRight, ChevronRight, LogOut, Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Brand, ThemeButton } from './ui';
import type { ThemeControls } from './ui';
import { accountHome, authError, useAuth } from './auth';

export type NavGroup = { label: string; items: readonly (readonly [string, string, LucideIcon])[] };

export function Workspace({ controls, groups, name, initials, role, home, label, tools, children }: {
  controls: ThemeControls; groups: readonly NavGroup[]; name: string; initials: string; role: string;
  home: string; label: string; tools?: ReactNode; children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const {user,logout} = useAuth();
  const {message} = App.useApp();
  async function signOut() {
    setSigningOut(true);
    try { await logout(); }
    catch (error) { void message.error(authError(error)); }
    finally { setSigningOut(false); }
  }
  const { pathname } = useLocation();
  const current = groups.flatMap(group => [...group.items]).find(([path]) => path === pathname)?.[1] ?? 'Tổng quan';

  function sidebar(onNavigate?: () => void) {
    return <>
      <Brand to={home} caption={label} onClick={onNavigate} />
      <nav className="sidebar-nav" aria-label="Điều hướng không gian">
        {groups.map(group => <div className="nav-group" key={group.label}>
          <p>{group.label}</p>
          {group.items.map(([path, title, Icon]) => (
            <NavLink to={path} end key={path} onClick={onNavigate}><Icon size={17} /><span>{title}</span></NavLink>
          ))}
        </div>)}
      </nav>
      <div className="sidebar-footer">
        <span>{['/dashboard','/tenants','/invoices','/checkout','/nguoi-thue/ho-so-thue'].includes(pathname)?'Luồng thuê · dữ liệu thật':'Dữ liệu minh họa'}</span>
        {user && <Link to={accountHome(user)} onClick={onNavigate}>Tài khoản của tôi <ArrowUpRight size={15} /></Link>}
        <Link to="/" onClick={onNavigate}>Tìm phòng công khai <ArrowUpRight size={15} /></Link>
      </div>
    </>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">{sidebar()}</aside>
      <Drawer title="Điều hướng" placement="left" open={menuOpen} onClose={() => setMenuOpen(false)} size={280} className="mobile-drawer">
        {sidebar(() => setMenuOpen(false))}
      </Drawer>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-location">
            <Button className="mobile-menu-button" type="text" icon={<Menu size={21} />} aria-label="Mở điều hướng" onClick={() => setMenuOpen(true)} />
            <span className="workspace-label">{label}</span><ChevronRight size={14} className="workspace-chevron" aria-hidden="true" /><span>{current}</span>
          </div>
          <div className="topbar-actions">
            {tools}<ThemeButton {...controls} />
            <div className="topbar-account">
              <Avatar className="account-avatar" size={36}>{user?.fullName.split(' ').map(part=>part[0]).join('').slice(-2).toUpperCase() || initials}</Avatar><span><strong>{user?.fullName || name}</strong><small>{user ? (user.role==='ADMIN'?'Quản trị viên':user.role==='OWNER'?'Chủ trọ':'Người dùng') : role}</small></span>
            </div>
            <Button type="text" icon={<LogOut size={17}/>} aria-label="Đăng xuất" title="Đăng xuất" loading={signingOut} onClick={()=>void signOut()}/>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
