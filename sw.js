/* 离线缓存 service worker（由 build.mjs 自动生成，版本 fl-2026093008）
   注意：service worker 只在 https 或 localhost 下才会注册成功。
   用 file:// 双击打开时它不会生效，但应用本身仍然完全可用。

   缓存策略（踩过的坑）：
   - HTML 必须「网络优先」：否则每次重新构建后，浏览器会把旧的 index.html
     直接从缓存吐出来，用户看到的是旧版本（实测就是这样卡住的）。
   - 其余静态资源用「缓存优先」，保证离线可用。
   - 每次构建都会换一个 CACHE 名，旧缓存会在 activate 时删掉。 */
const CACHE = 'fl-2026093008';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isHTML(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (isHTML(req)) {
    // 网络优先：拿到新版本就更新缓存；断网时用缓存兜底
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // 其他资源：缓存优先
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
