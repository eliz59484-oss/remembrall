'use client';

import React from 'react';
import { Lang, t } from '@/lib/i18n';
import { PomodoroPhase } from '@/hooks/usePomodoro';

interface PomodoroTimerProps {
  lang: Lang;
  phase: PomodoroPhase;
  formattedTime: string;
  completedToday: number;
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
}

export default function PomodoroTimer({
  lang,
  phase,
  formattedTime,
  completedToday,
  onStart,
  onStop,
  isRunning,
}: PomodoroTimerProps) {
  const phaseLabel =
    phase === 'work'
      ? t(lang, 'work')
      : phase === 'break'
        ? t(lang, 'breakTime')
        : phase === 'longBreak'
          ? t(lang, 'longBreak')
          : t(lang, 'pomodoro');

  return (
    <div className={`pomodoro-container ${isRunning ? `pomodoro-${phase}` : ''}`}>
      <div className="pomodoro-header">
        <span className="pomodoro-icon">🍅</span>
        <span className="pomodoro-label">{phaseLabel}</span>
      </div>

      {isRunning ? (
        <>
          <div className="pomodoro-time">{formattedTime}</div>
          <div className="pomodoro-progress">
            <div
              className={`pomodoro-bar phase-${phase}`}
              style={{
                animationDuration: phase === 'work' ? '1500s' : '300s',
              }}
            />
          </div>
          <button className="pomodoro-btn stop" onClick={onStop}>
            {t(lang, 'stopPomodoro')}
          </button>
        </>
      ) : (
        <button className="pomodoro-btn start" onClick={onStart}>
          {t(lang, 'startPomodoro')}
        </button>
      )}

      {completedToday > 0 && (
        <div className="pomodoro-count">
          🍅 {completedToday} {t(lang, 'pomodorosToday')}
        </div>
      )}
    </div>
  );
}
