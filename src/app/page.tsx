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
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { t } from '@/lib/i18n';
import { Task, initStorage } from '@/lib/storage';
import {
  requestNotificationPermission,
  sendNotification,
  playSound,
  vibrate,
  speak,
  speakNeural,
  getRandomQuote,
} from '@/lib/notifications';
import { getSettings } from '@/lib/storage';

// Track which tasks have already been notified this session (persisted in sessionStorage)
const NOTIFIED_KEY = 'remembrall_notified';
function getNotifiedTasks(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const saved = sessionStorage.getItem(NOTIFIED_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch { return new Set(); }
}
function markNotified(key: string) {
  const set = getNotifiedTasks();
  set.add(key);
  try { sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set])); } catch {}
}

export default function Home() {
  const { lang, toggle } = useLanguage();
  const { todayTasks, overdueTasks, upcomingTasks, addTask, completeTask, removeTask, snoozeTask, refresh } = useTasks();
  const pomodoro = usePomodoro();
  useGeoReminder();
  useServiceWorker();
  const [modalOpen, setModalOpen] = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    requestNotificationPermission();
    // Apply saved theme + accessibility settings
    const savedSettings = getSettings();
    document.documentElement.setAttribute('data-theme', savedSettings.theme || 'dark');
    document.documentElement.setAttribute('data-size', savedSettings.largeUi ? 'large' : 'normal');
    document.documentElement.setAttribute('data-orb', savedSettings.orbMode || 'vibrant');
    // Initialize Supabase in background (never blocks UI)
    initStorage()
      .then(() => refresh())
      .catch(() => {}); // silently handle — app works offline
  }, []);

  // Check for due notifications every 10 seconds
  useEffect(() => {
    if (!mounted) return;

    const checkNotifications = () => {
      const settings = getSettings();
      const now = new Date();
      const allPending = [...overdueTasks, ...todayTasks, ...upcomingTasks];

      allPending.forEach((task) => {
        if (task.status !== 'pending') return;

        const dueTime = new Date(task.dueAt).getTime();
        const remindMs = (task.remindBefore || 5) * 60 * 1000;
        const remindAt = dueTime - remindMs;
        const nowMs = now.getTime();

        // Notify if: task is overdue OR we're within the remindBefore window
        const isOverdue = nowMs >= dueTime;
        const isRemindTime = nowMs >= remindAt && nowMs < dueTime;

        if (!isOverdue && !isRemindTime) return;

        // Build unique key: per-task + per-phase (remind vs overdue)
        const notifKey = isOverdue ? `overdue:${task.id}` : `remind:${task.id}`;
        if (getNotifiedTasks().has(notifKey)) return;
        markNotified(notifKey);

        // Frog tasks get special treatment 🐸
        if (task.isFrog) {
          const frogTitle = lang === 'ru' ? '🐸 Ква-ква! Съешь лягушку!' : '🐸 Ribbit! Eat the frog!';
          const frogBody = isOverdue
            ? (lang === 'ru' ? `⚠️ Просрочено: ${task.text}` : `⚠️ Overdue: ${task.text}`)
            : (lang === 'ru' ? `⏰ Через ${task.remindBefore || 5} мин: ${task.text}` : `⏰ In ${task.remindBefore || 5} min: ${task.text}`);
          
          sendNotification(frogTitle, frogBody);
          if (settings.soundEnabled) playSound('frog'); // Always croak for frogs!
          if (settings.vibrationEnabled) vibrate([300, 150, 300, 150, 500]); // Special pattern
          if (settings.ttsEnabled) {
            const ttsMsg = lang === 'ru' 
              ? `Ква-ква! Пора съесть лягушку: ${task.text}` 
              : `Ribbit! Time to eat the frog: ${task.text}`;
            if (settings.useNeuralTts) {
              speakNeural(ttsMsg, task.lang, settings.neuralVoice);
            } else {
              speak(ttsMsg, task.lang, settings.voiceName || undefined);
            }
          }
        } else {
          // Regular task notification
          const title = isOverdue
            ? (lang === 'ru' ? '🔮 Просрочено!' : '🔮 Overdue!')
            : (lang === 'ru' ? '🔮 Скоро!' : '🔮 Coming up!');
          const body = isOverdue
            ? task.text
            : (lang === 'ru' ? `Через ${task.remindBefore || 5} мин: ${task.text}` : `In ${task.remindBefore || 5} min: ${task.text}`);
          
          sendNotification(title, body);
          if (settings.soundEnabled) playSound(settings.soundType);
          if (settings.vibrationEnabled) vibrate();
          if (settings.ttsEnabled) {
            if (settings.useNeuralTts) {
              speakNeural(task.text, task.lang, settings.neuralVoice);
            } else {
              speak(task.text, task.lang, settings.voiceName || undefined);
            }
          }
        }
      });
    };

    // Check immediately + every 10 seconds
    checkNotifications();
    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [mounted, overdueTasks, todayTasks, upcomingTasks, lang]);

  // Pomodoro phase change notifications
  useEffect(() => {
    if (!mounted) return;
    const settings = getSettings();
    if (pomodoro.phase === 'break' || pomodoro.phase === 'longBreak') {
      if (settings.soundEnabled) playSound(settings.soundType);
      if (settings.vibrationEnabled) vibrate();
      const msg = getRandomQuote(lang, 'pomodoroBreak');
      sendNotification('🍅 Remembrall', msg);
      if (settings.ttsEnabled) {
        if (settings.useNeuralTts) {
          speakNeural(msg, lang, settings.neuralVoice);
        } else {
          speak(msg, lang, settings.voiceName || undefined);
        }
      }
    } else if (pomodoro.phase === 'work' && pomodoro.completedToday > 0) {
      if (settings.soundEnabled) playSound(settings.soundType);
      const msg = t(lang, 'pomodoroActive');
      sendNotification('🍅 Remembrall', msg);
      if (settings.ttsEnabled) {
        if (settings.useNeuralTts) {
          speakNeural(msg, lang, settings.neuralVoice);
        } else {
          speak(msg, lang, settings.voiceName || undefined);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.phase]);

  const handleVoiceResult = useCallback((text: string) => {
    let dueAt: string;
    let priority: 'critical' | 'important' | 'normal' = 'normal';
    const now = new Date();
    const lower = text.toLowerCase();

    // Priority from voice
    if (/\u043a\u0440\u0438\u0442\u0438\u0447|\u0441\u0440\u043e\u0447\u043d\u043e|urgent|critical/.test(lower)) priority = 'critical';
    else if (/\u0432\u0430\u0436\u043d\u043e|important/.test(lower)) priority = 'important';

    // Time regex patterns
    const absoluteMatch = text.match(/\u0432\s*(\d{1,2})[:.h]?(\d{2})/i);
    const relativeMatch = text.match(/\u0447\u0435\u0440\u0435\u0437\s*(\d+)\s*(\u043c\u0438\u043d|\u0447\u0430\u0441|hour|min)/i);
    const atMatch = text.match(/at\s*(\d{1,2})[:.h]?(\d{2})/i);
    const inMatch = text.match(/in\s*(\d+)\s*(min|hour)/i);
    const standaloneMatch = text.match(/^(\d{1,2})[:.h]?(\d{2})\s/);

    if (/\u043f\u0440\u043e\u0441\u0440\u043e\u0447\u0435\u043d\u043e|\u043f\u0440\u043e\u0441\u0440\u043e\u0447\u0435\u043d\u0430|overdue|\u0443\u0436\u0435\s*\u043f\u0440\u043e\u0448\u043b\u043e/.test(lower)) {
      dueAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      if (priority === 'normal') priority = 'critical';
    } else if (/\u0441\u0435\u0439\u0447\u0430\u0441|\u043d\u0435\u043c\u0435\u0434\u043b\u0435\u043d\u043d\u043e|\u043f\u0440\u044f\u043c\u043e\s*\u0441\u0435\u0439\u0447\u0430\u0441|now|immediately/.test(lower)) {
      dueAt = new Date(now.getTime() + 2 * 60 * 1000).toISOString();
    } else if (/\u0437\u0430\u0432\u0442\u0440\u0430 \u0443\u0442\u0440\u043e\u043c|tomorrow morning/.test(lower)) {
      const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0);
      dueAt = d.toISOString();
    } else if (/\u0437\u0430\u0432\u0442\u0440\u0430 \u0432\u0435\u0447\u0435\u0440\u043e\u043c|tomorrow evening/.test(lower)) {
      const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(19, 0, 0, 0);
      dueAt = d.toISOString();
    } else if (/\u0437\u0430\u0432\u0442\u0440\u0430|tomorrow/.test(lower)) {
      const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
      dueAt = d.toISOString();
    } else if (/\u0441\u0435\u0433\u043e\u0434\u043d\u044f \u0432\u0435\u0447\u0435\u0440\u043e\u043c|tonight/.test(lower)) {
      const d = new Date(now); d.setHours(19, 0, 0, 0); dueAt = d.toISOString();
    } else if (/\u0441\u0435\u0433\u043e\u0434\u043d\u044f|today/.test(lower)) {
      const d = new Date(now); d.setHours(23, 59, 0, 0); dueAt = d.toISOString();
    } else if (/\u0432\u0435\u0447\u0435\u0440\u043e\u043c|\u0432\u0435\u0447\u0435\u0440/.test(lower)) {
      const d = new Date(now); d.setHours(19, 0, 0, 0);
      if (d < now) d.setDate(d.getDate() + 1);
      dueAt = d.toISOString();
    } else if (/\u0443\u0442\u0440\u043e\u043c|\u0443\u0442\u0440\u043e|morning/.test(lower)) {
      const d = new Date(now); d.setHours(8, 0, 0, 0);
      if (d < now) d.setDate(d.getDate() + 1);
      dueAt = d.toISOString();
    } else if (absoluteMatch) {
      const h = parseInt(absoluteMatch[1]), m = parseInt(absoluteMatch[2]);
      const d = new Date(now); d.setHours(h, m, 0, 0);
      if (d < now) d.setDate(d.getDate() + 1);
      dueAt = d.toISOString();
    } else if (atMatch) {
      const h = parseInt(atMatch[1]), m = parseInt(atMatch[2]);
      const d = new Date(now); d.setHours(h, m, 0, 0);
      if (d < now) d.setDate(d.getDate() + 1);
      dueAt = d.toISOString();
    } else if (relativeMatch) {
      const ms = relativeMatch[2].startsWith('\u0447\u0430\u0441') || relativeMatch[2].startsWith('hour')
        ? parseInt(relativeMatch[1]) * 3600000 : parseInt(relativeMatch[1]) * 60000;
      dueAt = new Date(now.getTime() + ms).toISOString();
    } else if (inMatch) {
      const ms = inMatch[2].startsWith('hour') ? parseInt(inMatch[1]) * 3600000 : parseInt(inMatch[1]) * 60000;
      dueAt = new Date(now.getTime() + ms).toISOString();
    } else if (standaloneMatch) {
      const h = parseInt(standaloneMatch[1]), m = parseInt(standaloneMatch[2]);
      const d = new Date(now); d.setHours(h, m, 0, 0);
      if (d < now) d.setDate(d.getDate() + 1);
      dueAt = d.toISOString();
    } else {
      dueAt = new Date(now.getTime() + 3600000).toISOString();
    }

    addTask({ text, dueAt, priority, isFrog: false, isRecurring: false, lang });
  }, [addTask, lang]);

  const handleAddTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    addTask(task);
  }, [addTask]);

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
      if (settings.ttsEnabled) {
        if (settings.useNeuralTts) {
          speakNeural(msg, lang, settings.neuralVoice);
        } else {
          speak(msg, lang, settings.voiceName || undefined);
        }
      }
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
              // If time already passed today, keep it as-is (will show as overdue)
              dueAt = d.toISOString();
            } else {
              dueAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
            }
            const safePriority = ['critical', 'important', 'normal'].includes(pt.priority) ? pt.priority : 'normal';
            addTask({
              text: pt.text,
              dueAt,
              priority: safePriority as 'critical' | 'important' | 'normal',
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
