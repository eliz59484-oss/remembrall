'use client';

import React from 'react';
import { PomodoroPhase } from '@/hooks/usePomodoro';

interface MagicOrbProps {
  hasOverdue: boolean;
  hasUpcoming: boolean;
  pomodoroPhase: PomodoroPhase;
  onClick: () => void;
}

export default function MagicOrb({ hasOverdue, hasUpcoming, pomodoroPhase, onClick }: MagicOrbProps) {
  let smokeClass = 'smoke-calm';
  if (pomodoroPhase === 'work') smokeClass = 'smoke-work';
  else if (pomodoroPhase === 'break' || pomodoroPhase === 'longBreak') smokeClass = 'smoke-break';
  else if (hasOverdue) smokeClass = 'smoke-overdue';
  else if (hasUpcoming) smokeClass = 'smoke-upcoming';

  return (
    <button className="orb-container" onClick={onClick} aria-label="Add reminder">
      <div className="orb-hands">
        <div className="orb-hand orb-hand-left" />
        <div className="orb-hand orb-hand-right" />
      </div>
      <div className={`orb ${smokeClass}`}>
        <div className="orb-glass" />
        <div className="orb-smoke smoke-layer-1" />
        <div className="orb-smoke smoke-layer-2" />
        <div className="orb-smoke smoke-layer-3" />
        <div className="orb-highlight" />
        <div className="orb-reflection" />
      </div>
      <div className="orb-glow" />
      <div className="orb-shadow" />
    </button>
  );
}
