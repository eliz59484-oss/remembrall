import { supabase, ensureAuth } from './supabase';
import type { SoundType } from './notifications';

export interface Task {
  id: string;
  text: string;
  dueAt: string;
  priority: 'critical' | 'important' | 'normal';
  isFrog: boolean;
  isRecurring: boolean;
  recurrenceRule?: 'daily' | 'weekly' | 'none';
  remindBefore?: number;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  locationRadius?: number;
  status: 'pending' | 'done' | 'snoozed';
  lang: 'ru' | 'en';
  createdAt: string;
}

const TASKS_KEY = 'remembrall_tasks';
const SETTINGS_KEY = 'remembrall_settings';
const POMODORO_KEY = 'remembrall_pomodoro_count';
const MIGRATED_KEY = 'remembrall_migrated';

export interface AppSettings {
  lang: 'ru' | 'en';
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  ttsEnabled: boolean;
  useNeuralTts: boolean;
  soundType: SoundType;
  voiceName: string;
  neuralVoice: string;
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  largeUi: boolean;
  orbMode: 'calm' | 'vibrant';
  funnyPhrases: boolean;
}

export const defaultSettings: AppSettings = {
  lang: 'ru',
  theme: 'dark',
  soundEnabled: true,
  vibrationEnabled: true,
  ttsEnabled: true,
  useNeuralTts: true,
  soundType: 'magic',
  voiceName: '',
  neuralVoice: 'ru-svetlana',
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  largeUi: false,
  orbMode: 'vibrant',
  funnyPhrases: true,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// ============================================
// LOCAL STORAGE (instant, offline)
// ============================================

function getLocalTasks(): Task[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(TASKS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveLocalTasks(tasks: Task[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ============================================
// SUPABASE (cloud, synced)
// ============================================

/** Convert camelCase Task to snake_case DB row */
function taskToRow(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    text: task.text,
    due_at: task.dueAt,
    priority: task.priority,
    is_frog: task.isFrog,
    is_recurring: task.isRecurring,
    recurrence_rule: task.recurrenceRule || 'none',
    remind_before: task.remindBefore || 5,
    location_name: task.locationName || null,
    location_lat: task.locationLat || null,
    location_lng: task.locationLng || null,
    location_radius: task.locationRadius || 200,
    status: task.status,
    lang: task.lang,
    created_at: task.createdAt,
  };
}

/** Convert snake_case DB row to camelCase Task */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(row: any): Task {
  return {
    id: row.id,
    text: row.text,
    dueAt: row.due_at,
    priority: row.priority,
    isFrog: row.is_frog,
    isRecurring: row.is_recurring,
    recurrenceRule: row.recurrence_rule,
    remindBefore: row.remind_before,
    locationName: row.location_name,
    locationLat: row.location_lat,
    locationLng: row.location_lng,
    locationRadius: row.location_radius,
    status: row.status,
    lang: row.lang,
    createdAt: row.created_at,
  };
}

// ============================================
// SYNC LAYER — localStorage + Supabase
// ============================================

let _userId: string | null = null;
let _authReady = false;

/** Initialize auth and migrate localStorage data if needed */
export async function initStorage(): Promise<void> {
  if (!isBrowser()) return;
  
  // Always mark auth as ready so the app doesn't hang
  _authReady = true;
  
  try {
    // Timeout after 5 seconds to prevent hanging
    const authPromise = ensureAuth();
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    
    _userId = await Promise.race([authPromise, timeoutPromise]);
    
    if (!_userId) {
      console.warn('Auth unavailable — running in offline mode');
      return;
    }

    if (!localStorage.getItem(MIGRATED_KEY)) {
      await migrateLocalToCloud(_userId);
      localStorage.setItem(MIGRATED_KEY, 'true');
    }

    // Sync cloud → local cache
    await syncFromCloud();
  } catch (err) {
    console.warn('Supabase init failed, using localStorage:', err);
  }
}

/** Migrate existing localStorage tasks to Supabase */
async function migrateLocalToCloud(userId: string): Promise<void> {
  const localTasks = getLocalTasks();
  if (localTasks.length === 0) return;

  const rows = localTasks.map((t) => taskToRow(t, userId));
  const { error } = await supabase
    .from('tasks')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Migration failed:', error.message);
  } else {
    console.log(`Migrated ${localTasks.length} tasks to Supabase`);
  }
}

/** Pull all tasks from Supabase into localStorage cache */
async function syncFromCloud(): Promise<void> {
  if (!_userId) return;
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', _userId)
    .order('due_at', { ascending: true });

  if (!error && data) {
    const tasks = data.map(rowToTask);
    saveLocalTasks(tasks);
  }
}

// ============================================
// PUBLIC API — same interface, now with sync
// ============================================

export function getTasks(): Task[] {
  return getLocalTasks();
}

export function saveTasks(tasks: Task[]): void {
  saveLocalTasks(tasks);
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

  // Async cloud sync (fire and forget)
  if (_userId) {
    supabase
      .from('tasks')
      .insert(taskToRow(newTask, _userId))
      .then(({ error }) => {
        if (error) console.error('Cloud add failed:', error.message);
      });
  }

  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...updates };
    saveTasks(tasks);

    // Async cloud sync
    if (_userId) {
      const row = taskToRow(tasks[idx], _userId);
      supabase
        .from('tasks')
        .update(row)
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Cloud update failed:', error.message);
        });
    }
  }
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter((t) => t.id !== id);
  saveTasks(tasks);

  // Async cloud sync
  if (_userId) {
    supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Cloud delete failed:', error.message);
      });
  }
}

export function getTodayTasks(): Task[] {
  const now = new Date();
  const nowStr = now.toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  return getTasks()
    .filter((t) => t.status === 'pending' && t.dueAt >= nowStr && t.dueAt < endOfDay)
    .sort((a, b) => {
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

// ============================================
// SETTINGS — same pattern
// ============================================

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

  // Async cloud sync
  if (_userId) {
    supabase
      .from('user_settings')
      .upsert({
        user_id: _userId,
        settings: settings,
        updated_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error('Settings sync failed:', error.message);
      });
  }
}

// ============================================
// POMODORO (stays local — no need to sync)
// ============================================

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
