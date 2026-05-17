import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Sign in anonymously — zero friction, user just opens the app.
 * Creates a persistent anonymous session stored in localStorage.
 */
export async function ensureAuth(): Promise<string | null> {
  // Check existing session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) {
    return session.user.id;
  }

  // No session — create anonymous user
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('Anonymous auth failed:', error.message);
    return null;
  }
  return data.session?.user?.id ?? null;
}

/**
 * Link email to anonymous account (for cross-device sync).
 * User can optionally add email later in Settings.
 */
export async function linkEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Get current user ID (or null if not authenticated)
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
