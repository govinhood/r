const CACHE_NAME='gfm-v1';
const urlsToCache=['/r/','/r/index.html','/r/style.css','/r/script.js','/r/assets/icon-192.png','/r/assets/icon-512.png','/r/assets/gfmlcct.png','/r/assets/gfmst.png','/r/assets/gfmc.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)));self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));