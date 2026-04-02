'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Task,
  getTasks,
  addTask as storageAddTask,
  updateTask,
  deleteTask as storageDeleteTask,
  getTodayTasks,
  getOverdueTasks,
  getUpcomingTasks,
} from '@/lib/storage';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);

  const refresh = useCallback(() => {
    setTasks(getTasks());
    setTodayTasks(getTodayTasks());
    setOverdueTasks(getOverdueTasks());
    setUpcomingTasks(getUpcomingTasks());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  const addTask = useCallback(
    (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
      storageAddTask(task);
      refresh();
    },
    [refresh]
  );

  const completeTask = useCallback(
    (id: string) => {
      updateTask(id, { status: 'done' });
      refresh();
    },
    [refresh]
  );

  const removeTask = useCallback(
    (id: string) => {
      storageDeleteTask(id);
      refresh();
    },
    [refresh]
  );

  const snoozeTask = useCallback(
    (id: string, minutes: number) => {
      const newDue = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      updateTask(id, { dueAt: newDue, status: 'pending' });
      refresh();
    },
    [refresh]
  );

  return {
    tasks,
    todayTasks,
    overdueTasks,
    upcomingTasks,
    addTask,
    completeTask,
    removeTask,
    snoozeTask,
    refresh,
  };
}
