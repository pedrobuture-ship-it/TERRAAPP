import { useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { MobileNav } from '../components/layout/MobileNav';
import { Sidebar } from '../components/layout/Sidebar';
import { appRoutes } from '../routes/appRoutes';
import { getCurrent } from '../services/farmSettingsService';
import { useAuth } from '../contexts/AuthContext';

export function AppLayout() {
  const location = useLocation();
  const { hasCompletedFirstLogin } = useAuth();
  const activeRoute = appRoutes.find((route) => location.pathname.startsWith(route.path));

  if (!hasCompletedFirstLogin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  useEffect(() => {
    if (localStorage.getItem('terra_compact_mode') === 'true') {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }

    if (localStorage.getItem('terra_dark_mode') === 'true') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
          <Header title={activeRoute?.label ?? 'TERRA'} />
          <main className="flex flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
