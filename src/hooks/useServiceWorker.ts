'use client';

import { useEffect } from 'react';
import { getTasks } from '@/lib/storage';

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Register the service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        // Tell SW to start reminder checking
        if (registration.active) {
          registration.active.postMessage({ type: 'START_REMINDER_CHECK' });
        }

        // When a new SW takes over
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === 'activated') {
                newWorker.postMessage({ type: 'START_REMINDER_CHECK' });
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });

    // Listen for messages from SW (task data requests)
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GET_TASKS') {
        // Respond with current tasks from localStorage
        const tasks = getTasks();
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage(tasks);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);
}
