import { supabase } from './supabase';

// =============================================
// Types (matching DB schema)
// =============================================

export interface DbTask {
  id: string;
  user_id: string;
  text: string;
  due_at: string;
  priority: 'critical' | 'important' | 'normal';
  is_frog: boolean;
  is_recurring: boolean;
  recurrence_rule: 'daily' | 'weekly' | 'none';
  remind_before: number;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_radius: number;
  status: 'pending' | 'done' | 'snoozed';
  lang: 'ru' | 'en';
  created_at: string;
}

export interface DbSettings {
  id: string;
  user_id: string;
  lang: string;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  tts_enabled: boolean;
  sound_type: string;
  voice_name: string;
  work_duration: number;
  break_duration: number;
  long_break_duration: number;
  updated_at: string;
}

export interface CreateTaskInput {
  text: string;
  due_at: string;
  priority: 'critical' | 'important' | 'normal';
  is_frog?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: 'daily' | 'weekly' | 'none';
  remind_before?: number;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  location_radius?: number;
  lang: 'ru' | 'en';
}

// =============================================
// Auth — Anonymous sign-in
// =============================================

let currentUserId: string | null = null;

export async function ensureAuth(): Promise<string> {
  // Check if we already have a session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    currentUserId = session.user.id;
    return session.user.id;
  }

  // Try to restore from localStorage
  const storedSession = typeof window !== 'undefined' 
    ? localStorage.getItem('remembrall_auth_id') 
    : null;

  if (storedSession) {
    // Re-check if session is still valid
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      currentUserId = user.id;
      return user.id;
    }
  }

  // Sign in anonymously
  const { data, error } = await supabase.auth.signInAnonymously();
  
  if (error) {
    console.error('Anonymous auth failed:', error);
    throw new Error('Authentication failed');
  }

  if (data.user) {
    currentUserId = data.user.id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('remembrall_auth_id', data.user.id);
    }
    return data.user.id;
  }

  throw new Error('No user returned from auth');
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

// =============================================
// Tasks CRUD
// =============================================

export async function fetchTasks(): Promise<DbTask[]> {
  await ensureAuth();
  
  const { data, error } = await supabase
    .from('remembrall_tasks')
    .select('*')
    .order('due_at', { ascending: true });

  if (error) {
    console.error('fetchTasks error:', error);
    return [];
  }
  return data || [];
}

export async function fetchTodayTasks(): Promise<DbTask[]> {
  await ensureAuth();
  
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const { data, error } = await supabase
    .from('remembrall_tasks')
    .select('*')
    .eq('status', 'pending')
    .gte('due_at', startOfDay)
    .lt('due_at', endOfDay)
    .order('due_at', { ascending: true });

  if (error) {
    console.error('fetchTodayTasks error:', error);
    return [];
  }

  // Sort: frogs first, then by priority, then by time
  return (data || []).sort((a, b) => {
    if (a.is_frog && !b.is_frog) return -1;
    if (!a.is_frog && b.is_frog) return 1;
    const priorityOrder: Record<string, number> = { critical: 0, important: 1, normal: 2 };
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return a.due_at.localeCompare(b.due_at);
  });
}

export async function fetchOverdueTasks(): Promise<DbTask[]> {
  await ensureAuth();
  
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('remembrall_tasks')
    .select('*')
    .eq('status', 'pending')
    .lt('due_at', now)
    .order('due_at', { ascending: true });

  if (error) {
    console.error('fetchOverdueTasks error:', error);
    return [];
  }
  return data || [];
}

export async function fetchUpcomingTasks(minutesAhead: number = 30): Promise<DbTask[]> {
  await ensureAuth();
  
  const now = new Date();
  const future = new Date(now.getTime() + minutesAhead * 60 * 1000).toISOString();
  const nowStr = now.toISOString();

  const { data, error } = await supabase
    .from('remembrall_tasks')
    .select('*')
    .eq('status', 'pending')
    .gte('due_at', nowStr)
    .lte('due_at', future);

  if (error) {
    console.error('fetchUpcomingTasks error:', error);
    return [];
  }
  return data || [];
}

export async function createTask(input: CreateTaskInput): Promise<DbTask | null> {
  const userId = await ensureAuth();

  const { data, error } = await supabase
    .from('remembrall_tasks')
    .insert({
      user_id: userId,
      text: input.text,
      due_at: input.due_at,
      priority: input.priority,
      is_frog: input.is_frog ?? false,
      is_recurring: input.is_recurring ?? false,
      recurrence_rule: input.recurrence_rule ?? 'none',
      remind_before: input.remind_before ?? 15,
      location_name: input.location_name ?? null,
      location_lat: input.location_lat ?? null,
      location_lng: input.location_lng ?? null,
      location_radius: input.location_radius ?? 200,
      lang: input.lang,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('createTask error:', error);
    return null;
  }
  return data;
}

export async function updateTaskDb(
  taskId: string,
  updates: Partial<Pick<DbTask, 'text' | 'due_at' | 'priority' | 'is_frog' | 'status' | 'is_recurring' | 'recurrence_rule'>>
): Promise<boolean> {
  await ensureAuth();

  const { error } = await supabase
    .from('remembrall_tasks')
    .update(updates)
    .eq('id', taskId);

  if (error) {
    console.error('updateTask error:', error);
    return false;
  }
  return true;
}

export async function deleteTaskDb(taskId: string): Promise<boolean> {
  await ensureAuth();

  const { error } = await supabase
    .from('remembrall_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('deleteTask error:', error);
    return false;
  }
  return true;
}

// =============================================
// Settings
// =============================================

export async function fetchSettings(): Promise<DbSettings | null> {
  await ensureAuth();

  const { data, error } = await supabase
    .from('remembrall_settings')
    .select('*')
    .single();

  if (error) {
    // No settings row yet — that's fine
    if (error.code === 'PGRST116') return null;
    console.error('fetchSettings error:', error);
    return null;
  }
  return data;
}

export async function saveSettingsDb(settings: Partial<Omit<DbSettings, 'id' | 'user_id' | 'updated_at'>>): Promise<boolean> {
  const userId = await ensureAuth();

  const { error } = await supabase
    .from('remembrall_settings')
    .upsert(
      {
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('saveSettings error:', error);
    return false;
  }
  return true;
}

// =============================================
// Pomodoro
// =============================================

export async function logPomodoroSession(phase: 'work' | 'break' | 'longBreak', completed: boolean): Promise<boolean> {
  const userId = await ensureAuth();

  const { error } = await supabase
    .from('remembrall_pomodoro_sessions')
    .insert({
      user_id: userId,
      phase,
      completed,
      started_at: new Date().toISOString(),
      session_date: new Date().toISOString().split('T')[0],
    });

  if (error) {
    console.error('logPomodoroSession error:', error);
    return false;
  }
  return true;
}

export async function fetchTodayPomodoroCount(): Promise<number> {
  await ensureAuth();

  const today = new Date().toISOString().split('T')[0];

  const { count, error } = await supabase
    .from('remembrall_pomodoro_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('phase', 'work')
    .eq('completed', true)
    .eq('session_date', today);

  if (error) {
    console.error('fetchTodayPomodoroCount error:', error);
    return 0;
  }
  return count ?? 0;
}

// =============================================
// Migration: localStorage → Supabase
// =============================================

export async function migrateFromLocalStorage(): Promise<number> {
  const MIGRATION_KEY = 'remembrall_migrated_to_cloud';
  
  if (typeof window === 'undefined') return 0;
  if (localStorage.getItem(MIGRATION_KEY)) return 0; // Already migrated

  const raw = localStorage.getItem('remembrall_tasks');
  if (!raw) {
    localStorage.setItem(MIGRATION_KEY, 'true');
    return 0;
  }

  try {
    const localTasks = JSON.parse(raw);
    if (!Array.isArray(localTasks) || localTasks.length === 0) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return 0;
    }

    let migrated = 0;

    for (const task of localTasks) {
      const result = await createTask({
        text: task.text,
        due_at: task.dueAt || task.due_at,
        priority: task.priority || 'normal',
        is_frog: task.isFrog || task.is_frog || false,
        is_recurring: task.isRecurring || task.is_recurring || false,
        recurrence_rule: task.recurrenceRule || task.recurrence_rule || 'none',
        remind_before: task.remindBefore || task.remind_before || 15,
        location_name: task.locationName || task.location_name || undefined,
        location_lat: task.locationLat || task.location_lat || undefined,
        location_lng: task.locationLng || task.location_lng || undefined,
        location_radius: task.locationRadius || task.location_radius || undefined,
        lang: task.lang || 'ru',
      });

      if (result) migrated++;
    }

    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log(`✅ Migrated ${migrated}/${localTasks.length} tasks to Supabase`);
    return migrated;
  } catch (e) {
    console.error('Migration error:', e);
    return 0;
  }
}
