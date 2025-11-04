// frontend/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.tsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <BrowserRouter future={{ 
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// PWA Setup - Service Worker registracija
// NAPOMENA: Manifest link se dodaje dinamički kroz BrandingContext i pwaUtils.ts
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Service Worker registracija
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          if (import.meta.env.DEV) console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          if (import.meta.env.DEV) console.log('SW registration failed: ', registrationError);
        });
    }
  });

  // Globalni handler: reload ako zakaže dinamički import/chunk
  (function setupChunkFailureReload() {
    let reloaded = false;
    window.addEventListener(
      'error',
      (e: ErrorEvent) => {
        const msg = e?.message ?? '';
        const err: unknown = e?.error;
        interface ChunkErrorShape { name?: string; message?: string }
        const errObj: ChunkErrorShape = (err && typeof err === 'object') ? (err as ChunkErrorShape) : {};
        const isChunkError =
          /Failed to fetch dynamically imported module/i.test(msg) ||
          /ChunkLoadError/i.test(String(errObj?.name ?? '')) ||
          /Loading chunk [\w-]+ failed/i.test(String(errObj?.message ?? ''));
        if (isChunkError && !reloaded) {
          reloaded = true;
          window.location.reload();
        }
      },
      true
    );
  })();

  // Version check: detektiraj novu verziju i ponudi reload
  (function setupVersionWatcher() {
    const KEY = 'app_version';
    let current: string | null = localStorage.getItem(KEY);
    let pendingReload = false;

    const fetchVersion = async (): Promise<string | null> => {
      try {
        const res = await fetch('/version.json', { cache: 'no-store' });
        if (!res.ok) return null;
        const data: unknown = await res.json();
        if (data && typeof data === 'object' && 'version' in data) {
          const v = (data as { version: unknown }).version;
          return typeof v === 'string' ? v : String(v);
        }
        return null;
      } catch {
        return null;
      }
    };

    const doSafeReload = () => {
      if (document.visibilityState === 'visible') {
        window.location.reload();
        return;
      }
      const onVisible = () => {
        if (pendingReload && document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', onVisible);
          window.location.reload();
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      setTimeout(() => {
        if (pendingReload) {
          window.location.reload();
        }
      }, 120000);
    };

    const check = async () => {
      const v = await fetchVersion();
      if (!v) return;
      if (!current) {
        current = v;
        localStorage.setItem(KEY, v);
        return;
      }
      if (v !== current) {
        current = v;
        localStorage.setItem(KEY, v);
        pendingReload = true;
        doSafeReload();
      }
    };

    // initial check
    void check();
    // on tab focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void check();
    });
    // periodic check
    setInterval(() => { void check(); }, 300000);
  })();
}