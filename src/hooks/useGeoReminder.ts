'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getTasks, Task } from '@/lib/storage';

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeoReminder() {
  const notifiedRef = useRef<Set<string>>(new Set());
  const watchIdRef = useRef<number | null>(null);

  const checkGeoTasks = useCallback((position: GeolocationPosition) => {
    const tasks = getTasks().filter(
      (t) => t.status === 'pending' && t.locationLat && t.locationLng
    );
    
    tasks.forEach((task) => {
      if (notifiedRef.current.has(task.id)) return;
      
      const distance = getDistanceMeters(
        position.coords.latitude,
        position.coords.longitude,
        task.locationLat!,
        task.locationLng!
      );
      
      const radius = task.locationRadius || 200;
      
      if (distance <= radius) {
        notifiedRef.current.add(task.id);
        
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`📍 ${task.locationName || 'Nearby'}`, {
            body: task.text,
            icon: '/icon-192.png',
            tag: `geo-${task.id}`,
          });
        }
        
        // Also vibrate
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    
    // Request permission + start watching
    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted, start watching
        watchIdRef.current = navigator.geolocation.watchPosition(
          checkGeoTasks,
          () => {}, // Ignore errors silently
          {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 15000,
          }
        );
      },
      () => {} // Permission denied, do nothing
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [checkGeoTasks]);

  // Clear notified IDs when tasks change
  useEffect(() => {
    const interval = setInterval(() => {
      const tasks = getTasks();
      const activeIds = new Set(tasks.filter(t => t.status === 'pending').map(t => t.id));
      notifiedRef.current.forEach(id => {
        if (!activeIds.has(id)) notifiedRef.current.delete(id);
      });
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
}
