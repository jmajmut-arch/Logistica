// Habilita el aislamiento cross-origin (COOP/COEP) en cualquier servidor, sin depender de
// que este configure esos headers: expo-sqlite en web corre sobre wa-sqlite, que necesita
// SharedArrayBuffer, y el navegador solo lo expone en un contexto cross-origin isolado.
//
// Este mismo archivo cumple dos roles (técnica estándar "coi-serviceworker"):
// - Cargado como <script> normal (ver public/index.html, `window` existe): se registra a sí
//   mismo como Service Worker y recarga la página una vez que toma control.
// - Ejecutado como Service Worker (`window` no existe): intercepta cada fetch y agrega los
//   headers Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy a la respuesta, incluida
//   la del propio documento HTML.
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
      return;
    }

    // El documento HTML (navegación) referencia el bundle JS por nombre con hash de
    // contenido — si el navegador sirve una copia cacheada del propio HTML, queda
    // apuntando para siempre al bundle viejo aunque haya una versión nueva desplegada.
    // Los demás recursos (JS/wasm/fuentes) sí pueden cachearse normal: su URL cambia
    // en cada build.
    const fetchOptions = request.mode === 'navigate' ? { cache: 'no-store' } : undefined;

    event.respondWith(
      fetch(request, fetchOptions)
        .then((response) => {
          // Respuesta opaca (cross-origin sin CORS): no se puede leer ni reescribir, se deja pasar tal cual.
          if (response.status === 0) {
            return response;
          }
          const headers = new Headers(response.headers);
          headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
          headers.set('Cross-Origin-Opener-Policy', 'same-origin');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        })
        .catch((error) => console.error('[coi-serviceworker]', error)),
    );
  });
} else {
  (() => {
    if (window.crossOriginIsolated) {
      return;
    }
    if (!navigator.serviceWorker) {
      console.warn(
        '[coi-serviceworker] Service Worker no disponible en este navegador/origen (requiere ' +
          'HTTPS o localhost); SUSPEL no podrá usar la base de datos en la web.',
      );
      return;
    }
    navigator.serviceWorker.register(document.currentScript.src).then((registration) => {
      registration.addEventListener('updatefound', () => window.location.reload());
      if (registration.active && !navigator.serviceWorker.controller) {
        window.location.reload();
      }
    });
  })();
}
