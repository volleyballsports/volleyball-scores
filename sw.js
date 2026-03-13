// Service Worker: always fetch local assets fresh from network, never from cache.

self.addEventListener('install', function (event) {
    // Activate immediately without waiting for old SW to be released
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    // Take control of all open pages immediately, then wipe any existing caches
    event.waitUntil(
        self.clients.claim().then(function () {
            return caches.keys().then(function (keys) {
                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
            });
        })
    );
});

self.addEventListener('fetch', function (event) {
    var url = event.request.url;

    // Only intercept same-origin requests (skip Firebase, Google Fonts, CDN scripts)
    if (url.indexOf(self.location.origin) !== 0) return;

    event.respondWith(
        fetch(event.request, { cache: 'no-store' })
    );
});
