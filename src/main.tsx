import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthService } from './services/authService';
import { startMetrics } from './services/metricsService';

// 운영자용 행동 로그 화면은 숨김 주소 /#admin에서만 따로 불러온다 (specs/025)
const isAdminRoute = window.location.hash === '#admin';
const AdminPage = lazy(() => import('./pages/Admin/AdminPage'));

// 분석·성능 기록은 게임 화면에서만 (specs/026). 운영자 화면은 기록하지 않는다
if (!isAdminRoute) {
  const current = AuthService.getCurrentUser();
  startMetrics(!!current && current.id !== 'guest');
}

// 같은 탭에서 #admin으로 들어가거나 나올 때 화면을 바꾸려고 새로고침한다
window.addEventListener('hashchange', () => {
  if ((window.location.hash === '#admin') !== isAdminRoute) window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdminRoute ? (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
