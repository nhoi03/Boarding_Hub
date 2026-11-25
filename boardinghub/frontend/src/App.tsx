import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DemoProvider } from './demo';
import { ListingDetail, Marketplace, ViewingRequests } from './Marketplace';
import AccountPage from './AccountPage';
import { AuthProvider, RequireAuth } from './auth';
import { Link } from 'react-router-dom';

const TenantPortal = lazy(() => import('./TenantPortal'));
const OwnerPortal = lazy(() => import('./OwnerPortal'));
const loading = <p className="route-loading" role="status">Đang mở không gian…</p>;

const themeStorageKey = 'boardinghub-theme';

function preferredDarkMode() {
  try {
    const savedTheme = localStorage.getItem(themeStorageKey);
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme === 'dark';
  } catch {
    // The system preference still applies when storage is blocked.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function App() {
  const [dark, setDark] = useState(preferredDarkMode);
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  useEffect(() => {
    if (hash === '#ket-qua') document.getElementById('ket-qua')?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem(themeStorageKey, next ? 'dark' : 'light');
    } catch {
      // The theme can still be changed for this session.
    }
  }

  const controls = { dark, toggleTheme };
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: dark ? '#6253dd' : '#5642cf',
          colorBgBase: dark ? '#141520' : '#ffffff',
          colorBgContainer: dark ? '#1d1e30' : '#ffffff',
          colorBgElevated: dark ? '#24253b' : '#ffffff',
          colorBorder: dark ? '#36374f' : '#ddddec',
          colorBorderSecondary: dark ? '#313248' : '#e8e8f2',
          colorTextPlaceholder: dark ? '#aaa9c2' : '#656981',
          borderRadius: 9,
          controlHeight: 38,
          fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
        },
        components: {
          Table: { headerBg: dark ? '#24253b' : '#f6f6fc', cellPaddingBlock: 13 },
          Card: { bodyPadding: 22 },
        },
      }}
    >
      <AntApp className="app-surface">
        <AuthProvider><DemoProvider>
          <Routes>
            <Route path="/" element={<Marketplace controls={controls} />} />
            <Route path="/tim-phong" element={<Navigate to="/" replace />} />
            <Route path="/tim-phong/:id" element={<ListingDetail key={pathname} controls={controls} />} />
            <Route path="/lich-xem" element={<ViewingRequests controls={controls} />} />
            <Route path="/login" element={<AccountPage controls={controls} />} />
            <Route path="/register" element={<AccountPage key="register" controls={controls} register />} />
            <Route path="/forbidden" element={<div className="product-panel"><h1>Không có quyền truy cập</h1><p>Tài khoản của bạn chưa có quyền mở trang này.</p><Link to="/login">Về không gian của tôi</Link></div>} />
            <Route path="/nguoi-thue/*" element={<RequireAuth><Suspense fallback={loading}><TenantPortal controls={controls} /></Suspense></RequireAuth>} />
            <Route path="/search" element={<Navigate to="/" replace />} />
            <Route path="/person-days" element={<Navigate to="/nguoi-thue/ngay-nguoi" replace />} />
            <Route path="/room-fund" element={<Navigate to="/nguoi-thue/quy-phong" replace />} />
            <Route path="/chu-tro" element={<Navigate to="/dashboard" replace />} />
            <Route path="/*" element={<RequireAuth owner><Suspense fallback={loading}><OwnerPortal controls={controls} /></Suspense></RequireAuth>} />
          </Routes>
        </DemoProvider></AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
