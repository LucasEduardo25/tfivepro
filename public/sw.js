/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — SERVICE WORKER DE PRODUÇÃO (PWA SHELL ONLY)
 * 
 * DIRETRIZES DE SEGURANÇA E ARQUITETURA:
 * 1. O Service Worker serve ESTRITAMENTE para precache do App Shell e ativos estáticos.
 * 2. NÃO atua como banco de dados ou camada de armazenamento offline de dados de negócio.
 * 3. NÃO intercepta requisições de API, autenticação ou banco de dados do Supabase.
 * 4. Supabase é a ÚNICA fonte operacional em tempo real.
 */

const CACHE_NAME = 'tfive-pro-cache-v5.3.1';

// Ativos estáticos do shell da aplicação para inicialização rápida do PWA
const STATIC_APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icons/apple-touch-icon.png',
  '/icons/tfive-192.png',
  '/icons/tfive-512.png',
  '/icons/tfive-maskable-512.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
];

// 1. INSTALL: Precache do App Shell estático
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_APP_SHELL) {
        try {
          await cache.add(asset);
        } catch {
          // Ignora falha de ativo individual não-crítico
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE: Limpeza estrita de caches legados e reivindicação imediata de controle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[TFIVE PRO SW] Removendo cache legado:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. MESSAGE: Permitir que a aplicação acione atualização instantânea
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. FETCH: Interceptação restrita e segura
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // REGRA CRÍTICA DE ISOLAMENTO:
  // Nunca interceptar requisições que não sejam GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Nunca interceptar requisições de terceiros ou externas (ex: Supabase REST/Auth, Google Fonts, CDNs)
  // O Supabase DEVE fluir 100% direto pela rede sem interferência de cache.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Nunca interceptar rotas de API, Auth ou endpoints dinâmicos locais
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/rest/')
  ) {
    return;
  }

  // A. NAVEGAÇÃO HTML (PWA App Shell)
  // Network-First com fallback para o shell do index.html em caso de indisponibilidade de rede.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // B. ATIVOS ESTÁTICOS DO BUNDLE (JS, CSS, Chunks Vite)
  // Network-First para scripts e estilos para evitar traps de código desatualizado
  const isCodeBundle = 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.includes('/assets/');

  if (isCodeBundle) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response('', { status: 503, statusText: 'Offline Asset Unavailable' });
          });
        })
    );
    return;
  }

  // C. MÍDIA ESTÁTICA / ÍCONES / FONTES
  // Stale-While-Revalidate estrito à mesma origem
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Falha de rede silenciosa para mídia secundária
        });

      return cachedResponse || fetchPromise;
    })
  );
});
