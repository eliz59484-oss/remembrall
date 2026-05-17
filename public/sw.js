const CACHE_NAME = 'remembrall-v3';
const OFFLINE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install — cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API routes (always need fresh data)
  if (request.url.includes('/api/')) return;

  // Skip chrome-extension and other non-http
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, return cached index
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// ============================================
// BACKGROUND REMINDER CHECK
// ============================================
const TASKS_KEY = 'remembrall_tasks';

function getTasks() {
  // We can't access localStorage from SW, so we use message passing
  return new Promise((resolve) => {
    self.clients.matchAll().then((clients) => {
      if (clients.length === 0) {
        resolve([]);
        return;
      }
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data || []);
      };
      clients[0].postMessage({ type: 'GET_TASKS' }, [channel.port2]);
      // Timeout fallback
      setTimeout(() => resolve([]), 3000);
    });
  });
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Schedule periodic check
  if (event.data && event.data.type === 'START_REMINDER_CHECK') {
    startReminderLoop();
  }
});

// Notification click handler — focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      // Open new window if none exist
      return self.clients.openWindow('/');
    })
  );
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'reminder-check') {
    event.waitUntil(checkReminders());
  }
});

let reminderInterval = null;

function startReminderLoop() {
  if (reminderInterval) return;
  reminderInterval = setInterval(checkReminders, 60000); // every 60s
}

async function checkReminders() {
  try {
    const tasks = await getTasks();
    const now = new Date();

    tasks.forEach((task) => {
      if (task.status !== 'pending') return;
      
      const dueAt = new Date(task.dueAt);
      const diffMin = Math.round((dueAt.getTime() - now.getTime()) / 60000);

      // Remind at exact time or if overdue by up to 1 minute
      if (diffMin >= -1 && diffMin <= 0) {
        showTaskNotification(task);
      }

      // Remind before (if configured)
      if (task.remindBefore && diffMin > 0 && diffMin <= task.remindBefore && diffMin === task.remindBefore) {
        showPreNotification(task, task.remindBefore);
      }
    });
  } catch (e) {
    // Silently fail
  }
}

function showTaskNotification(task) {
  const title = task.isFrog ? '🐸 Remembrall' : '🔮 Remembrall';
  const body = task.text;
  
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `task-${task.id}`,
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: true,
    data: { taskId: task.id },
  });
}

function showPreNotification(task, minutes) {
  // Try to detect user language from task or default to Russian
  const lang = task.lang || 'ru';
  const body = lang === 'ru'
    ? `Через ${minutes} мин: ${task.text}`
    : `In ${minutes} min: ${task.text}`;
  self.registration.showNotification('⏰ Remembrall', {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `pre-${task.id}`,
    vibrate: [100, 50, 100],
    data: { taskId: task.id },
  });
}
