// No authenticated health data is cached by this worker.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});if(clients[0]){await clients[0].focus();clients[0].postMessage({type:'open-care'});}else await self.clients.openWindow('/health.html#care');})());});
