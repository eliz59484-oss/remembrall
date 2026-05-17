'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getTasks } from '@/lib/storage';
import { sendNotification, speak, speakNeural, playSound, vibrate } from '@/lib/notifications';
import { getSettings } from '@/lib/storage';

const GEO_NOTIFIED_KEY = 'remembrall_geo_notified';

function getNotifiedGeo(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(GEO_NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markGeoNotified(id: string) {
  const set = getNotifiedGeo();
  set.add(id);
  try { sessionStorage.setItem(GEO_NOTIFIED_KEY, JSON.stringify([...set])); } catch {}
}

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeoReminder() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  const checkNearbyTasks = useCallback((position: GeolocationPosition) => {
    lastPositionRef.current = position;
    const settings = getSettings();
    const tasks = getTasks().filter(
      (t) => t.status === 'pending' && t.locationLat != null && t.locationLng != null
    );

    tasks.forEach((task) => {
      if (getNotifiedGeo().has(task.id)) return;

      const dist = getDistanceMeters(
        position.coords.latitude,
        position.coords.longitude,
        task.locationLat!,
        task.locationLng!
      );
      const radius = task.locationRadius || 200;

      console.log(`[geo] Task "${task.text.substring(0, 30)}" — dist: ${Math.round(dist)}m / radius: ${radius}m`);

      if (dist <= radius) {
        markGeoNotified(task.id);
        console.log(`[geo] ✅ In zone! Notifying: "${task.text.substring(0, 40)}"`);

        // System notification
        sendNotification(
          `📍 ${task.locationName || (settings.lang === 'ru' ? 'Рядом!' : 'Nearby!')}`,
          task.text,
        );

        // Sound + vibration
        if (settings.soundEnabled) playSound(settings.soundType);
        if (settings.vibrationEnabled) vibrate([200, 100, 200, 100, 300]);

        // TTS
        if (settings.ttsEnabled) {
          const msg = settings.lang === 'ru'
            ? `Напоминание рядом: ${task.text}`
            : `Nearby reminder: ${task.text}`;
          if (settings.useNeuralTts) {
            speakNeural(msg, settings.lang, settings.neuralVoice);
          } else {
            speak(msg, settings.lang, settings.voiceName || undefined);
          }
        }
      }
    });
  }, []);

  const pollPosition = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      checkNearbyTasks,
      (err) => console.warn('[geo] Position error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [checkNearbyTasks]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    // Check if any tasks have geo set — skip if none
    const geoTasks = getTasks().filter(
      (t) => t.status === 'pending' && t.locationLat != null
    );
    if (geoTasks.length === 0) {
      console.log('[geo] No geo tasks — skipping watch');
      // Still set up interval in case user adds geo tasks later
    }

    // First check immediately
    pollPosition();

    // Then poll every 60 seconds (battery friendly vs watchPosition)
    intervalRef.current = setInterval(pollPosition, 60 * 1000);

    // Clean up stale notified IDs every 5 minutes
    const cleanInterval = setInterval(() => {
      const activePending = new Set(
        getTasks().filter(t => t.status === 'pending').map(t => t.id)
      );
      const notified = getNotifiedGeo();
      let changed = false;
      notified.forEach(id => {
        if (!activePending.has(id)) { notified.delete(id); changed = true; }
      });
      if (changed) {
        try { sessionStorage.setItem(GEO_NOTIFIED_KEY, JSON.stringify([...notified])); } catch {}
      }
    }, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(cleanInterval);
    };
  }, [pollPosition]);
}
