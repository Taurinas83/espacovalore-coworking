-- ============================================
-- Schema Improvements Phase 2
-- - User Notifications for Announcements
-- - Admin Promotion Support
-- Execute this script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Create user_notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- 'new_announcement'
  title text NOT NULL,
  message text NOT NULL,
  reference_id uuid, -- announcement_id or other reference
  is_read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.user_notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.user_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert user notifications"
ON public.user_notifications FOR INSERT
WITH CHECK (true);

-- ============================================
-- 2. Function: Notify all users when announcement is created
-- ============================================
CREATE OR REPLACE FUNCTION notify_users_on_announcement()
RETURNS trigger AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all approved users and create notifications
  FOR user_record IN 
    SELECT id FROM public.profiles 
    WHERE is_approved = true 
    AND id != NEW.author_id
  LOOP
    INSERT INTO public.user_notifications (user_id, type, title, message, reference_id)
    VALUES (
      user_record.id,
      'new_announcement',
      'Novo Aviso: ' || NEW.title,
      SUBSTRING(NEW.content FROM 1 FOR 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new announcements
DROP TRIGGER IF EXISTS trigger_notify_users_on_announcement ON public.announcements;
CREATE TRIGGER trigger_notify_users_on_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION notify_users_on_announcement();

-- ============================================
-- 3. Policy: Admins can update is_admin of other users
-- ============================================
-- Drop existing update policy if exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Admins can update any profile (for is_admin toggle)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);
