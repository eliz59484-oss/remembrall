'use client';

import React from 'react';
import { Task, updateTask } from '@/lib/storage';
import { Lang, t } from '@/lib/i18n';

interface TaskListProps {
  tasks: Task[];
  overdueTasks: Task[];
  lang: Lang;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onRefresh?: () => void;
}

function formatTime(dueAt: string): string {
  const d = new Date(dueAt);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusDot(dueAt: string): { dot: string; className: string } {
  const now = new Date();
  const due = new Date(dueAt);
  const diffMin = Math.round((due.getTime() - now.getTime()) / 60000);

  if (diffMin < 0) return { dot: '🔴', className: 'status-overdue' };
  if (diffMin <= 5) return { dot: '🔴', className: 'status-urgent' };
  if (diffMin < 60) return { dot: '🟡', className: 'status-soon' };
  return { dot: '🟢', className: 'status-ok' };
}

// Swipe gesture hook
function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold = 80
) {
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);
  const swipeOffset = React.useRef(0);
  const [offset, setOffset] = React.useState(0);
  const [swiping, setSwiping] = React.useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    swipeOffset.current = 0;
    setSwiping(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    // Only horizontal swipes (ignore vertical scroll)
    if (Math.abs(dy) > Math.abs(dx) && !swiping) return;

    if (Math.abs(dx) > 10) {
      setSwiping(true);
    }

    if (swiping) {
      swipeOffset.current = dx;
      setOffset(dx);
    }
  };

  const onTouchEnd = () => {
    if (swipeOffset.current < -threshold) {
      onSwipeLeft();
    } else if (swipeOffset.current > threshold) {
      onSwipeRight();
    }
    touchStart.current = null;
    swipeOffset.current = 0;
    setOffset(0);
    setSwiping(false);
  };

  return { onTouchStart, onTouchMove, onTouchEnd, offset, swiping };
}

function TaskItem({
  task,
  isOverdue,
  lang,
  onComplete,
  onDelete,
  onSnooze,
  onRefresh,
}: {
  task: Task;
  isOverdue: boolean;
  lang: Lang;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onRefresh?: () => void;
}) {
  const [showActions, setShowActions] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(task.text);
  const [, setTick] = React.useState(0);
  const [dismissed, setDismissed] = React.useState(false);

  // Swipe: left = delete, right = complete
  const swipe = useSwipe(
    () => {
      // Swipe left → delete with animation
      setDismissed(true);
      setTimeout(() => onDelete(task.id), 300);
    },
    () => {
      // Swipe right → complete with animation
      setDismissed(true);
      setTimeout(() => onComplete(task.id), 300);
    }
  );

  // Re-render every 30s to update status dot
  React.useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const priorityIcon = task.priority === 'critical' ? '🔴' : task.priority === 'important' ? '🟡' : '🟢';
  const status = getStatusDot(task.dueAt);

  const handleSaveText = () => {
    if (editText.trim() && editText !== task.text) {
      updateTask(task.id, { text: editText.trim() });
      if (onRefresh) onRefresh();
    }
    setEditing(false);
  };

  const handleSetRemindBefore = (minutes: number) => {
    updateTask(task.id, { remindBefore: minutes });
    if (onRefresh) onRefresh();
    setShowActions(false);
  };

  const remindLabel = task.remindBefore
    ? (lang === 'ru'
        ? `🔔 за ${task.remindBefore} мин`
        : `🔔 ${task.remindBefore}m before`)
    : '';

  // Swipe visual hints
  const swipeStyle: React.CSSProperties = swipe.swiping
    ? {
        transform: `translateX(${swipe.offset}px)`,
        transition: 'none',
      }
    : dismissed
    ? {
        transform: swipe.offset < 0 ? 'translateX(-120%)' : 'translateX(120%)',
        opacity: 0,
        transition: 'all 0.3s ease-out',
      }
    : {};

  const showSwipeHint = swipe.swiping && Math.abs(swipe.offset) > 30;
  const swipeDirection = swipe.offset > 0 ? 'right' : 'left';

  return (
    <div className={`task-item-wrapper ${dismissed ? 'task-dismissed' : ''}`}>
      {/* Swipe background hints */}
      {showSwipeHint && (
        <div className={`swipe-bg swipe-bg-${swipeDirection}`}>
          <span className="swipe-bg-icon">
            {swipeDirection === 'right' ? '✅' : '🗑️'}
          </span>
          <span className="swipe-bg-label">
            {swipeDirection === 'right'
              ? (lang === 'ru' ? 'Готово' : 'Done')
              : (lang === 'ru' ? 'Удалить' : 'Delete')
            }
          </span>
        </div>
      )}

      <div
        className={`task-item ${isOverdue ? 'task-overdue' : ''} ${task.isFrog ? 'task-frog' : ''} priority-${task.priority}`}
        style={swipeStyle}
        onTouchStart={swipe.onTouchStart}
        onTouchMove={swipe.onTouchMove}
        onTouchEnd={swipe.onTouchEnd}
      >
        <div className="task-main" onClick={() => !editing && setShowActions(!showActions)}>
          <div className="task-left">
            <button
              className="task-check"
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task.id);
              }}
              aria-label={t(lang, 'done')}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <div className="task-info">
              {editing ? (
                <input
                  className="task-edit-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleSaveText}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveText();
                    if (e.key === 'Escape') { setEditText(task.text); setEditing(false); }
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="task-text">
                  {task.isFrog && '🐸 '}
                  {task.text}
                </span>
              )}
              <span className="task-time-abs">
                {formatTime(task.dueAt)}
                {remindLabel && <span className="remind-badge">{remindLabel}</span>}
                {task.locationName && <span className="remind-badge geo-badge">📍 {task.locationName}</span>}
              </span>
            </div>
          </div>
          <div className="task-right">
            <span className="task-priority">{priorityIcon}</span>
            <span className={`task-time-display ${status.className}`}>
              {status.dot} {formatTime(task.dueAt)}
            </span>
          </div>
        </div>
        {showActions && (
          <div className="task-actions">
            <div className="actions-row">
              <span className="actions-label">{lang === 'ru' ? '🔔 Напомнить за:' : '🔔 Remind:'}</span>
              <button
                className={`action-btn remind-btn ${task.remindBefore === 5 ? 'active' : ''}`}
                onClick={() => handleSetRemindBefore(5)}
              >
                5 {lang === 'ru' ? 'мин' : 'min'}
              </button>
              <button
                className={`action-btn remind-btn ${task.remindBefore === 15 ? 'active' : ''}`}
                onClick={() => handleSetRemindBefore(15)}
              >
                15 {lang === 'ru' ? 'мин' : 'min'}
              </button>
              <button
                className={`action-btn remind-btn ${task.remindBefore === 30 ? 'active' : ''}`}
                onClick={() => handleSetRemindBefore(30)}
              >
                30 {lang === 'ru' ? 'мин' : 'min'}
              </button>
            </div>
            <div className="actions-row">
              <button className="action-btn edit-btn" onClick={(e) => { e.stopPropagation(); setEditing(true); setShowActions(false); }}>
                ✏️ {lang === 'ru' ? 'Редактировать' : 'Edit'}
              </button>
              <button className="action-btn snooze-btn" onClick={() => { onSnooze(task.id, 15); setShowActions(false); }}>
                ⏰ {t(lang, 'snooze')}
              </button>
              <button className="action-btn delete-btn" onClick={() => { onDelete(task.id); setShowActions(false); }}>
                {t(lang, 'delete')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaskList({ tasks, overdueTasks, lang, onComplete, onDelete, onSnooze, onRefresh }: TaskListProps) {
  const allTasks = [...overdueTasks, ...tasks];

  if (allTasks.length === 0) {
    return (
      <div className="task-list-empty">
        <p>{t(lang, 'noTasks')}</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      <h2 className="task-list-title">{t(lang, 'tasksToday')}</h2>
      {overdueTasks.length > 0 && (
        <div className="overdue-label">{t(lang, 'overdue')}</div>
      )}
      {allTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isOverdue={overdueTasks.some((ot) => ot.id === task.id)}
          lang={lang}
          onComplete={onComplete}
          onDelete={onDelete}
          onSnooze={onSnooze}
          onRefresh={onRefresh}
        />
      ))}

      {/* Swipe hint for first-time users */}
      {allTasks.length > 0 && allTasks.length <= 2 && (
        <p className="swipe-hint">
          {lang === 'ru'
            ? '💡 Свайп → готово | ← удалить'
            : '💡 Swipe → done | ← delete'}
        </p>
      )}
    </div>
  );
}
