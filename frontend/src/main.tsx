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
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  });
}