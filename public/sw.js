const SW_VERSION = '2026-04-01-4'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('message', (event) => {
  if (!event.data) return

  if (event.data.type === 'GET_VERSION') {
    event.source?.postMessage({
      type: 'SW_VERSION',
      version: SW_VERSION,
    })
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})