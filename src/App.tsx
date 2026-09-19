import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { appRoutes } from './routes/appRoutes';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<Navigate to="/login" replace />} />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {appRoutes.map((route) => (
            <Route key={route.path} path={route.path.slice(1)} element={<route.Component />} />
          ))}
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}