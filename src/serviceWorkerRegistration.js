// 이 선택적 코드는 서비스 워커를 사용하여 앱 콘텐츠를 로컬에 캐시하므로
// 앱이 더 빠르게 로드되고 오프라인에서도 작동합니다.

// 이 코드는 서비스 워커가 등록된 후 유효 범위 밖에 있는 리소스의 로드를 막고
// 오래된 자산을 자동으로 지워줍니다. 실제로 앱이 활성화된 탭이 닫힐 때까지
// 리소스 업데이트가 지연됩니다.

const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
      // [::1]은 IPv6 로컬호스트 주소입니다.
      window.location.hostname === '[::1]' ||
      // 127.0.0.0/8은 IPv4 로컬호스트로 간주됩니다.
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  );
  
  export function register(config) {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      // URL 생성자는 SW를 지원하는 모든 브라우저에서 사용할 수 있습니다.
      const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
      if (publicUrl.origin !== window.location.origin) {
        // PUBLIC_URL이 다른 오리진에 있는 경우 서비스 워커가 작동하지 않습니다.
        // CDN을 사용하는 경우 이런 일이 발생할 수 있습니다.
        // https://github.com/facebook/create-react-app/issues/2374 참조
        return;
      }
  
      window.addEventListener('load', () => {
        const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
  
        if (isLocalhost) {
          // 로컬호스트에서 실행 중입니다. 서비스 워커가 아직 존재하는지 확인합니다.
          checkValidServiceWorker(swUrl, config);
  
          // 로컬호스트에 몇 가지 추가 로깅을 추가합니다.
          navigator.serviceWorker.ready.then(() => {
            console.log(
              'This web app is being served cache-first by a service ' +
                'worker. To learn more, visit https://cra.link/PWA'
            );
          });
        } else {
          // 로컬호스트가 아닙니다. 서비스 워커를 바로 등록합니다.
          registerValidSW(swUrl, config);
        }
      });
    }
  }
  
  function registerValidSW(swUrl, config) {
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) {
            return;
          }
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // 이 시점에서 이전에 캐시된 콘텐츠가 가져와졌지만
                // 새 서비스 워커가 업데이트된 콘텐츠를 제공할 것입니다.
                console.log(
                  'New content is available and will be used when all ' +
                    'tabs for this page are closed. See https://cra.link/PWA.'
                );
  
                // 콜백 실행
                if (config && config.onUpdate) {
                  config.onUpdate(registration);
                }
              } else {
                // 이 시점에서 모든 것이 캐시되었습니다.
                console.log('Content is cached for offline use.');
  
                // 콜백 실행
                if (config && config.onSuccess) {
                  config.onSuccess(registration);
                }
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('Error during service worker registration:', error);
      });
  }
  
  function checkValidServiceWorker(swUrl, config) {
    // 서비스 워커를 찾을 수 있는지 확인합니다. 페이지를 다시 로드할 수 없을 수도 있습니다.
    fetch(swUrl, {
      headers: { 'Service-Worker': 'script' },
    })
      .then((response) => {
        // 서비스 워커가 존재하고 JS 파일을 가져왔는지 확인합니다.
        const contentType = response.headers.get('content-type');
        if (
          response.status === 404 ||
          (contentType != null && contentType.indexOf('javascript') === -1)
        ) {
          // 서비스 워커를 찾을 수 없습니다. 아마도 다른 앱일 겁니다. 페이지를 새로고침합니다.
          navigator.serviceWorker.ready.then((registration) => {
            registration.unregister().then(() => {
              window.location.reload();
            });
          });
        } else {
          // 서비스 워커를 찾았습니다. 정상적으로 진행합니다.
          registerValidSW(swUrl, config);
        }
      })
      .catch(() => {
        console.log('No internet connection found. App is running in offline mode.');
      });
  }
  
  export function unregister() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.unregister();
        })
        .catch((error) => {
          console.error(error.message);
        });
    }
  }