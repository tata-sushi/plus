// Handlers de push, injetados no service worker gerado (workbox importScripts).
// Mostram a notificação quando o servidor dispara e abrem o app ao tocar.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'TATÁ Plus', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'TATÁ Plus'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'tata-plus',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ('focus' in c) {
          try {
            c.navigate(url)
          } catch (e) {
            /* navigate pode falhar em alguns navegadores */
          }
          return c.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
