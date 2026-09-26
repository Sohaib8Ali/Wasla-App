/* =========================================================
   service-worker.js
   يسمح بتشغيل الموقع بدون إنترنت (Offline) بعد أول زيارة،
   لأن كل البيانات أصلاً محفوظة في LocalStorage على الجهاز.
   ========================================================= */

const CACHE_NAME = "odm-cache-v1";

// الملفات الأساسية التي يجب حفظها في الكاش لتعمل بدون إنترنت
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/utils.js",
  "./js/storage.js",
  "./js/orders.js",
  "./js/delivery.js",
  "./js/reports.js",
  "./js/app.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

/* عند التثبيت: نحفظ كل الملفات الأساسية في الكاش */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

/* عند التفعيل: نحذف أي نسخة كاش قديمة من إصدار سابق */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* عند كل طلب: نحاول الشبكة أولاً، وإذا فشلت (بدون إنترنت) نستخدم الكاش */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
