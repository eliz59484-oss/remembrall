import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client (for client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client (for API routes) — uses the same anon key
// With anonymous auth, the user_id comes from the session
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
