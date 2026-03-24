'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MagicOrb from '@/components/MagicOrb';
import TaskList from '@/components/TaskList';
import AddTaskModal from '@/components/AddTaskModal';
import PomodoroTimer from '@/components/PomodoroTimer';
import SettingsModal from '@/components/SettingsModal';
import Tooltip from '@/components/Tooltip';
import VoiceInput from '@/components/VoiceInput';
import PhotoCapture from '@/components/PhotoCapture';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTasks } from '@/hooks/useTasks';
import { useLanguage } from '@/hooks/useLanguage';
import { useGeoReminder } from '@/hooks/useGeoReminder';
import { t } from '@/lib/i18n';
import { Task } from '@/lib/storage';
import {
  requestNotificationPermission,
  sendNotification,
  playSound,
  vibrate,
  speak,
  getRandomQuote,
} from '@/lib/notifications';
import { getSettings } from '@/lib/storage';

export default function Home() {
  const { lang, toggle } = useLanguage();
  const { todayTasks, overdueTasks, upcomingTasks, addTask, completeTask, removeTask, snoozeTask, refresh } = useTasks();
  const pomodoro = usePomodoro();
  useGeoReminder();
  const [modalOpen, setModalOpen] = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    requestNotificationPermission();
  }, []);

  // Check for due notifications every 30 seconds
  useEffect(() => {
    if (!mounted) return;

    const checkNotifications = () => {
      const settings = getSettings();
      const now = new Date();
      const overdueList = overdueTasks;

      overdueList.forEach((task) => {
        const dueTime = new Date(task.dueAt);
        const diffMs = now.getTime() - dueTime.getTime();
        // Notify if overdue by less than 60 seconds (just became overdue)
        if (diffMs > 0 && diffMs < 60000) {
          const title = lang === 'ru' ? '🔮 Напоминание!' : '🔮 Reminder!';
          sendNotification(title, task.text);
          if (settings.soundEnabled) playSound(settings.soundType);
          if (settings.vibrationEnabled) vibrate();
          if (settings.ttsEnabled) speak(task.text, task.lang, settings.voiceName || undefined);
        }
      });
    };

    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [mounted, overdueTasks, lang]);

  // Pomodoro phase change notifications
  useEffect(() => {
    if (!mounted) return;
    const settings = getSettings();
    if (pomodoro.phase === 'break' || pomodoro.phase === 'longBreak') {
      if (settings.soundEnabled) playSound(settings.soundType);
      if (settings.vibrationEnabled) vibrate();
      const msg = getRandomQuote(lang, 'pomodoroBreak');
      sendNotification('🍅 Remembrall', msg);
      if (settings.ttsEnabled) speak(msg, lang, settings.voiceName || undefined);
    } else if (pomodoro.phase === 'work' && pomodoro.completedToday > 0) {
      if (settings.soundEnabled) playSound(settings.soundType);
      const msg = t(lang, 'pomodoroActive');
      sendNotification('🍅 Remembrall', msg);
      if (settings.ttsEnabled) speak(msg, lang, settings.voiceName || undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.phase]);

  const handleVoiceResult = useCallback((text: string) => {
    // Try to parse time from voice input
    let dueAt: string;
    const now = new Date();

    // Match "в HH:MM" or "в H:MM"
    const absoluteMatch = text.match(/в\s*(\d{1,2})[:.]?(\d{2})/i);
    // Match "через X минут/мин/часов/час"
    const relativeMatch = text.match(/через\s*(\d+)\s*(мин|час|hour|min)/i);
    // Match "at HH:MM"
    const atMatch = text.match(/at\s*(\d{1,2})[:.]?(\d{2})/i);
    // Match "in X min/hour"
    const inMatch = text.match(/in\s*(\d+)\s*(min|hour)/i);
    // Match standalone time at start: "20:45 встреча" or "9:30 call"
    const standaloneMatch = text.match(/^(\d{1,2})[:.]?(\d{2})\s/);

    if (absoluteMatch) {
      const h = parseInt(absoluteMatch[1]);
      const m = parseInt(absoluteMatch[2]);
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      if (d < now) d.setDate(d.getDate() + 1); // if time passed, set tomorrow
      dueAt = d.toISOString();
    } else if (atMatch) {
      const h = parseInt(atMatch[1]);
      const m = parseInt(atMatch[2]);
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      if (d < now) d.setDate(d.getDate() + 1);
      dueAt = d.toISOString();
    } else if (relativeMatch) {
      const amount = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      const ms = unit.startsWith('час') || unit.startsWith('hour')
        ? amount * 60 * 60 * 1000
        : amount * 60 * 1000;
      dueAt = new Date(now.getTime() + ms).toISOString();
    } else if (inMatch) {
      const amount = parseInt(inMatch[1]);
      const unit = inMatch[2].toLowerCase();
      const ms = unit.startsWith('hour') ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
      dueAt = new Date(now.getTime() + ms).toISOString();
    } else if (standaloneMatch) {
      const h = parseInt(standaloneMatch[1]);
      const m = parseInt(standaloneMatch[2]);
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      if (d < now) d.setDate(d.getDate() + 1);
      dueAt = d.toISOString();
    } else {
      // Default: 1 hour from now
      dueAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }

    addTask({
      text,
      dueAt,
      priority: 'normal',
      isFrog: false,
      isRecurring: false,
      lang,
    });
  }, [addTask, lang]);

  const handleAddTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    addTask(task);
    refresh();
  }, [addTask, refresh]);

  const handleOrbClick = () => {
    setModalOpen(true);
  };

  const handleCompleteTask = useCallback((id: string) => {
    const task = [...todayTasks, ...overdueTasks].find((t) => t.id === id);
    completeTask(id);
    if (task?.isFrog) {
      const msg = getRandomQuote(lang, 'frogDone');
      const settings = getSettings();
      sendNotification('🐸 Remembrall', msg);
      if (settings.ttsEnabled) speak(msg, lang, settings.voiceName || undefined);
    }
  }, [todayTasks, overdueTasks, completeTask, lang]);

  const getStatusText = (): string => {
    if (pomodoro.phase === 'work') return t(lang, 'pomodoroActive');
    if (pomodoro.phase === 'break' || pomodoro.phase === 'longBreak') return getRandomQuote(lang, 'pomodoroBreak');
    if (overdueTasks.length > 0) return t(lang, 'hasOverdue');
    if (upcomingTasks.length > 0) return t(lang, 'hasUpcoming');
    if (todayTasks.length > 0) return t(lang, 'hasUpcoming');
    return getRandomQuote(lang, 'allClear');
  };

  if (!mounted) {
    return (
      <div className="app-loading">
        <div className="orb-container">
          <div className="orb smoke-calm">
            <div className="orb-glass" />
            <div className="orb-smoke smoke-layer-1" />
            <div className="orb-smoke smoke-layer-2" />
            <div className="orb-smoke smoke-layer-3" />
            <div className="orb-highlight" />
            <div className="orb-reflection" />
          </div>
          <div className="orb-glow" />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">🔮 {t(lang, 'appTitle')}</h1>
        <div className="header-actions">
          <Tooltip lang={lang} type="pomodoro" position="bottom">
            <button
              className={`pomodoro-pill ${pomodoro.isRunning ? 'active' : ''}`}
              onClick={() => setPomodoroOpen(!pomodoroOpen)}
            >
              🍅 {pomodoro.isRunning ? pomodoro.formattedTime : t(lang, 'pomodoro')}
            </button>
          </Tooltip>
          <button className="lang-btn" onClick={toggle}>
            {lang === 'ru' ? '🇬🇧 EN' : '🇷🇺 RU'}
          </button>
          <button className="settings-btn" onClick={() => setSettingsOpen(true)}>
            ⚙️
          </button>
        </div>
      </header>

      {/* Pomodoro — collapsible panel */}
      {pomodoroOpen && (
        <section className="pomodoro-section pomodoro-collapsible">
          <PomodoroTimer
            lang={lang}
            phase={pomodoro.phase}
            formattedTime={pomodoro.formattedTime}
            completedToday={pomodoro.completedToday}
            onStart={pomodoro.startWork}
            onStop={pomodoro.stop}
            isRunning={pomodoro.isRunning}
          />
        </section>
      )}

      {/* Magic Orb */}
      <section className="orb-section">
        <MagicOrb
          hasOverdue={overdueTasks.length > 0}
          hasUpcoming={upcomingTasks.length > 0}
          pomodoroPhase={pomodoro.phase}
          onClick={handleOrbClick}
        />
        <p className="status-text">{getStatusText()}</p>
        {(todayTasks.length > 0 || overdueTasks.length > 0) && (
          <div className="task-count-badge">
            {overdueTasks.length > 0 && (
              <span className="badge badge-overdue">{overdueTasks.length} {t(lang, 'overdue')}</span>
            )}
            <span className="badge badge-today">
              {todayTasks.length} {t(lang, 'tasksToday')}
            </span>
          </div>
        )}
      </section>

      {/* Task List — main content area */}
      <section className="tasks-section">
        <TaskList
          tasks={todayTasks}
          overdueTasks={overdueTasks}
          lang={lang}
          onComplete={handleCompleteTask}
          onDelete={removeTask}
          onSnooze={snoozeTask}
          onRefresh={refresh}
        />
      </section>

      {/* Bottom action buttons */}
      <footer className="app-footer">
        <button className="add-btn text-btn" onClick={() => setModalOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>{t(lang, 'addTask')}</span>
        </button>
        <button className="add-btn photo-btn" onClick={() => setPhotoOpen(true)}>
          📷
        </button>
        <VoiceInput lang={lang} onResult={handleVoiceResult} />
      </footer>

      {/* Add Task Modal */}
      <AddTaskModal
        lang={lang}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddTask}
      />

      <SettingsModal
        lang={lang}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLangChange={toggle}
      />

      <PhotoCapture
        lang={lang}
        isOpen={photoOpen}
        onClose={() => setPhotoOpen(false)}
        onTasksFound={(tasks) => {
          const now = new Date();
          tasks.forEach((pt: { text: string; priority: 'critical' | 'important' | 'normal'; timeHint: string | null }) => {
            let dueAt: string;
            if (pt.timeHint) {
              const [h, m] = pt.timeHint.split(':').map(Number);
              const d = new Date(now);
              d.setHours(h, m, 0, 0);
              if (d < now) d.setDate(d.getDate() + 1);
              dueAt = d.toISOString();
            } else {
              dueAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
            }
            addTask({
              text: pt.text,
              dueAt,
              priority: pt.priority,
              isFrog: false,
              isRecurring: false,
              lang,
            });
          });
          refresh();
        }}
      />
    </div>
  );
}
