-- ============================================
-- Remembrall — Supabase Database Setup
-- ============================================

-- 1. Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  due_at timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical','important','normal')),
  is_frog boolean NOT NULL DEFAULT false,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule text DEFAULT 'none' CHECK (recurrence_rule IN ('daily','weekly','none')),
  remind_before int DEFAULT 5,
  location_name text,
  location_lat double precision,
  location_lng double precision,
  location_radius int DEFAULT 200,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','snoozed')),
  lang text NOT NULL DEFAULT 'ru' CHECK (lang IN ('ru','en')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. User settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — users can only manage their own data
CREATE POLICY "Users manage own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON public.tasks(user_id, due_at);

-- 6. Auto-update timestamp trigger for settings
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
