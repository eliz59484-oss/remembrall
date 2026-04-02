'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DbTask,
  CreateTaskInput,
  fetchTodayTasks,
  fetchOverdueTasks,
  fetchUpcomingTasks,
  fetchTasks,
  createTask,
  updateTaskDb,
  deleteTaskDb,
  ensureAuth,
  migrateFromLocalStorage,
} from '@/lib/db';

export function useTasks() {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [todayTasks, setTodayTasks] = useState<DbTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<DbTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Initialize auth + migrate local data on first load
  useEffect(() => {
    const init = async () => {
      try {
        await ensureAuth();
        setAuthReady(true);
        // Migrate existing localStorage tasks to Supabase
        const migrated = await migrateFromLocalStorage();
        if (migrated > 0) {
          console.log(`🔮 Migrated ${migrated} tasks from localStorage to cloud`);
        }
      } catch (err) {
        console.error('Auth init failed:', err);
        setAuthReady(true); // Still mark as ready to avoid blocking
      }
    };
    init();
  }, []);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    try {
      const [all, today, overdue, upcoming] = await Promise.all([
        fetchTasks(),
        fetchTodayTasks(),
        fetchOverdueTasks(),
        fetchUpcomingTasks(),
      ]);
      setTasks(all);
      setTodayTasks(today);
      setOverdueTasks(overdue);
      setUpcomingTasks(upcoming);
    } catch (err) {
      console.error('Refresh error:', err);
    }
    setLoading(false);
  }, [authReady]);

  // Auto-refresh when auth is ready and every 30 seconds
  useEffect(() => {
    if (!authReady) return;
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [authReady, refresh]);

  const addTask = useCallback(
    async (input: CreateTaskInput) => {
      await createTask(input);
      await refresh();
    },
    [refresh]
  );

  const completeTask = useCallback(
    async (id: string) => {
      await updateTaskDb(id, { status: 'done' });
      await refresh();
    },
    [refresh]
  );

  const removeTask = useCallback(
    async (id: string) => {
      await deleteTaskDb(id);
      await refresh();
    },
    [refresh]
  );

  const snoozeTask = useCallback(
    async (id: string, minutes: number) => {
      const newDue = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      await updateTaskDb(id, { due_at: newDue, status: 'pending' });
      await refresh();
    },
    [refresh]
  );

  return {
    tasks,
    todayTasks,
    overdueTasks,
    upcomingTasks,
    loading,
    authReady,
    addTask,
    completeTask,
    removeTask,
    snoozeTask,
    refresh,
  };
}
