'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSettings } from '@/lib/storage';

export type PomodoroPhase = 'idle' | 'work' | 'break' | 'longBreak';

export function usePomodoro() {
  const [phase, setPhase] = useState<PomodoroPhase>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onPhaseEndRef = useRef<((phase: PomodoroPhase) => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPhase = useCallback((newPhase: PomodoroPhase) => {
    clearTimer();
    const settings = getSettings();
    let duration = 0;
    switch (newPhase) {
      case 'work':
        duration = settings.workDuration * 60;
        break;
      case 'break':
        duration = settings.breakDuration * 60;
        break;
      case 'longBreak':
        duration = settings.longBreakDuration * 60;
        break;
      default:
        setPhase('idle');
        setTimeLeft(0);
        return;
    }
    setPhase(newPhase);
    setTimeLeft(duration);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          if (onPhaseEndRef.current) {
            onPhaseEndRef.current(newPhase);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const startWork = useCallback(() => {
    startPhase('work');
  }, [startPhase]);

  const stop = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setTimeLeft(0);
  }, [clearTimer]);

  const handlePhaseEnd = useCallback((endedPhase: PomodoroPhase) => {
    if (endedPhase === 'work') {
      const newCount = cycleCount + 1;
      setCycleCount(newCount);
      setCompletedToday((prev) => prev + 1);

      if (newCount % 4 === 0) {
        startPhase('longBreak');
      } else {
        startPhase('break');
      }
    } else {
      startPhase('work');
    }
  }, [cycleCount, startPhase]);

  useEffect(() => {
    onPhaseEndRef.current = handlePhaseEnd;
  }, [handlePhaseEnd]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    phase,
    timeLeft,
    formattedTime: formatTime(timeLeft),
    completedToday,
    startWork,
    stop,
    isRunning: phase !== 'idle',
  };
}
