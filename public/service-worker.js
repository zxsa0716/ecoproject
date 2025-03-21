/* eslint-disable no-restricted-globals */

// 이 서비스 워커는 Workbox를 사용하여 자산 캐싱 및 오프라인 기능을 제공합니다.
// Workbox 라이브러리를 사용할 수 있으면 자동으로 사용합니다.

const CACHE_NAME = 'eco-quest-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

// 설치 단계: 필요한 자산을 캐시합니다
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 활성화 단계: 이전 캐시를 정리합니다
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});

// 패치 이벤트: 캐시에서 응답을 제공하거나 네트워크 요청을 수행합니다
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에서 응답이 발견된 경우 반환합니다
        if (response) {
          return response;
        }

        // 캐시에 없으면 네트워크로 요청합니다
        return fetch(event.request)
          .then((response) => {
            // 유효한 응답인지 확인합니다
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 나중에 사용할 수 있도록 응답의 복사본을 캐시에 저장합니다
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
      .catch(() => {
        // 네트워크가 오프라인 상태인 경우 오프라인 페이지를 제공할 수 있습니다
        // 여기에서는 단순히 에러를 전달합니다
      })
  );
});

// 푸시 알림 이벤트 처리
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/logo192.png'
    });
  }
});

// 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // 알림 클릭 시 특정 URL로 이동
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
  );
});