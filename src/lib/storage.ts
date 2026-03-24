export interface Task {
  id: string;
  text: string;
  dueAt: string;
  priority: 'critical' | 'important' | 'normal';
  isFrog: boolean;
  isRecurring: boolean;
  recurrenceRule?: 'daily' | 'weekly' | 'none';
  remindBefore?: number; // minutes before event to remind
  locationName?: string; // e.g. "Аптека", "Gym"
  locationLat?: number;
  locationLng?: number;
  locationRadius?: number; // meters, default 200
  status: 'pending' | 'done' | 'snoozed';
  lang: 'ru' | 'en';
  createdAt: string;
}

const TASKS_KEY = 'remembrall_tasks';
const SETTINGS_KEY = 'remembrall_settings';
const POMODORO_KEY = 'remembrall_pomodoro_count';

export interface AppSettings {
  lang: 'ru' | 'en';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  ttsEnabled: boolean;
  soundType: 'magic' | 'bell' | 'gong' | 'piano' | 'harp';
  voiceName: string;
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
}

export const defaultSettings: AppSettings = {
  lang: 'ru',
  soundEnabled: true,
  vibrationEnabled: true,
  ttsEnabled: true,
  soundType: 'magic',
  voiceName: '',
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Tasks
export function getTasks(): Task[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(TASKS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function addTask(task: Omit<Task, 'id' | 'createdAt' | 'status'>): Task {
  const tasks = getTasks();
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...updates };
    saveTasks(tasks);
  }
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter((t) => t.id !== id);
  saveTasks(tasks);
}

export function getTodayTasks(): Task[] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  return getTasks()
    .filter((t) => t.status === 'pending' && t.dueAt >= startOfDay && t.dueAt < endOfDay)
    .sort((a, b) => {
      // Frogs first, then by priority, then by time
      if (a.isFrog && !b.isFrog) return -1;
      if (!a.isFrog && b.isFrog) return 1;
      const priorityOrder = { critical: 0, important: 1, normal: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.dueAt.localeCompare(b.dueAt);
    });
}

export function getOverdueTasks(): Task[] {
  const now = new Date().toISOString();
  return getTasks()
    .filter((t) => t.status === 'pending' && t.dueAt < now)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function getUpcomingTasks(minutesAhead: number = 30): Task[] {
  const now = new Date();
  const future = new Date(now.getTime() + minutesAhead * 60 * 1000).toISOString();
  const nowStr = now.toISOString();
  return getTasks()
    .filter((t) => t.status === 'pending' && t.dueAt >= nowStr && t.dueAt <= future);
}

// Settings
export function getSettings(): AppSettings {
  if (!isBrowser()) return defaultSettings;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (!isBrowser()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Pomodoro count
export function getPomodoroCount(): number {
  if (!isBrowser()) return 0;
  const raw = localStorage.getItem(POMODORO_KEY);
  if (!raw) return 0;
  try {
    const data = JSON.parse(raw);
    const today = new Date().toDateString();
    return data.date === today ? data.count : 0;
  } catch {
    return 0;
  }
}

export function incrementPomodoroCount(): void {
  if (!isBrowser()) return;
  const today = new Date().toDateString();
  const count = getPomodoroCount();
  localStorage.setItem(POMODORO_KEY, JSON.stringify({ date: today, count: count + 1 }));
}
