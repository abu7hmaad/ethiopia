// Service Worker لتطبيق "دليل وحجوزات إثيوبيا"
// يخزّن هيكل الصفحة فقط، ويترك كل الطلبات الحيّة (البيانات، الأخبار، الصرف، الخرائط، الرفع) تمرّ مباشرة للشبكة.
const CACHE = 'ethiopia-abuahmad-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// النطاقات الحيّة التي يجب ألا تُخزَّن إطلاقاً (تمرّ مباشرة للإنترنت)
const LIVE = /script\.google\.com|workers\.dev|exchangerate-api|open-meteo|windy\.com|google\.com\/maps|r2\.dev/i;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;

  // الطلبات الحيّة تمرّ مباشرة بدون تخزين
  if (LIVE.test(r.url)) return;

  // صفحات التصفّح: الشبكة أولاً، والكاش عند انقطاع النت
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then((res) => {
          const cp = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', cp).catch(() => {}));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // باقي الملفات (خطوط، أيقونات، CSS): الكاش أولاً ثم الشبكة
  e.respondWith(
    caches.match(r).then((hit) =>
      hit ||
      fetch(r)
        .then((res) => {
          const cp = res.clone();
          caches.open(CACHE).then((c) => c.put(r, cp).catch(() => {}));
          return res;
        })
        .catch(() => hit)
    )
  );
});
