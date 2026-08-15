import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocaleProvider } from '@/hooks/useLocale';
import { PortalAuthProvider } from '@/hooks/usePortalAuth';
import { StaffAuthProvider } from '@/hooks/useStaffAuth';
import App from './App';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <LocaleProvider>
          <PortalAuthProvider>
            <StaffAuthProvider>
              <App />
            </StaffAuthProvider>
          </PortalAuthProvider>
        </LocaleProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || sessionStorage.getItem('raya-sw-refresh-on-controller') !== '1') return;
    reloading = true;
    sessionStorage.removeItem('raya-sw-refresh-on-controller');
    window.location.reload();
  });

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        const announceUpdate = () => window.dispatchEvent(new Event('raya:sw-update'));
        if (registration.waiting && navigator.serviceWorker.controller) announceUpdate();
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) announceUpdate();
          });
        });
        return registration.update();
      })
      .catch(() => undefined);
  });
}
