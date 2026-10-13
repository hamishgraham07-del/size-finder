// Size Finder's service worker. It keeps the page and its few files on the phone, so the page opens with no signal, and it fetches a newer copy in the
// background whenever there is one, so the next visit has it. It handles this site's own files and nothing else. Nothing is sent anywhere.
const VERSION = "1c6e4d58f4dd";      // changes whenever index.html does, which is how a phone learns there is a new one
const CACHE = 'size-finder-' + VERSION;
const FILES = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.indexOf('size-finder-') === 0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // the copy kept here answers at once; a fresh one is fetched behind it and kept for next time. With no signal the kept copy is all there is.
  e.respondWith(caches.open(CACHE).then(cache => cache.match(req, { ignoreSearch: true }).then(kept => {
    const fresh = fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok && res.type === 'basic') cache.put(url.search ? url.pathname : req, res.clone()); return res; });
    if (kept) { e.waitUntil(fresh.catch(() => { /* no signal: nothing to update */ })); return kept; }
    return fresh.catch(() => req.mode === 'navigate' ? cache.match('index.html') : Response.error()).then(res => res || Response.error());
  })));
});
