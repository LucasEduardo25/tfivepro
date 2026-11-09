import React from "react";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { recordSanitizedError } from './services/errorLogService';

// Global uncaught error listener to safeguard against startup crashes before React mounts
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('TFIVE PRO Global window.onerror:', event.error || event.message);
    recordSanitizedError('window_onerror', event.error || event.message, {
      route: window.location.pathname + window.location.search
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('TFIVE PRO Global unhandled rejection:', event.reason);
    recordSanitizedError('unhandled_rejection', event.reason, {
      route: window.location.pathname + window.location.search
    });
  });
}

// Register Service Worker for offline PWA capabilities & secure updates
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Checagem proativa de atualizações
        reg.update().catch(() => {});
        
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[TFIVE PRO PWA] Nova versão instalada em background.');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('Service Worker registration skipped:', err);
      });
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}


