const CACHE_NAME = 'electromapas-pro-v8-root';
const STATIC_ASSETS = [
  '/app/',
  '/app/index.html',
  '/app/manifest.json',
  '/app/tailwind.min.js',
  '/app/icon-192.png',
  '/app/icon-512.png',
  '/assets/3d/clinica_marquesa_joelho.webp',
  '/assets/3d/clinica_marquesa_ombro.webp',
  '/assets/3d/clinica_marquesa_lombar.webp',
  '/assets/3d/clinica_colocacao_cervical.webp',
  '/assets/3d/clinica_colocacao_cotovelo.webp',
  '/assets/3d/clinica_colocacao_punho.webp',
  '/assets/3d/clinica_colocacao_tornozelo.webp',
  '/assets/3d/clinica_colocacao_isquiotibiais.webp',
  '/assets/3d/mapa_3d_joelho.webp',
  '/assets/3d/mapa_3d_cervical.webp',
  '/assets/3d/mapa_3d_lombar.webp',
  '/assets/3d/mapa_3d_membros_superiores.webp',
  '/assets/3d/mapa_3d_punho.webp',
  '/assets/3d/mapa_3d_tornozelo.webp',
  '/assets/3d/mapa_3d_isquiotibiais.webp',
  '/assets/3d/anatomia_neural_3d.webp',
  '/assets/videos/legendas_joelho_pt_pt.vtt',
  '/assets/videos/video_01_preparacao_pele_pt_pt.vtt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW v8] Cache estático concluído.');
    }).catch((err) => {
      console.warn('[SW v8] Aviso cache parcial:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key.startsWith('electromapas-') && key !== CACHE_NAME).map((key) => {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  // Vídeos (.mp4): rede direta para streaming sem sobrecarregar armazenamento
  if (event.request.url.endsWith('.mp4')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((fetchErr) => {
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match(event.request).then((match) => match || caches.match('/app/index.html'));
        }
        throw fetchErr;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
