-- ============================================
-- Schema Improvements for Meeting Room Booking System
-- Execute this script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Add monthly_hours_quota to profiles
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_hours_quota integer DEFAULT 10;

-- ============================================
-- 2. Add requirements field to bookings
-- ============================================
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS requirements text;

-- ============================================
-- 3. Create admin_notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  type text NOT NULL, -- 'new_booking', 'cancelled_booking'
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

-- Only admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.admin_notifications FOR INSERT
WITH CHECK (true);

-- ============================================
-- 4. Function: Calculate monthly hours used by user
-- ============================================
CREATE OR REPLACE FUNCTION get_user_monthly_hours(user_uuid uuid, target_month date DEFAULT CURRENT_DATE)
RETURNS numeric AS $$
DECLARE
  total_hours numeric;
  month_start timestamp with time zone;
  month_end timestamp with time zone;
BEGIN
  month_start := date_trunc('month', target_month)::timestamp with time zone;
  month_end := (date_trunc('month', target_month) + interval '1 month')::timestamp with time zone;
  
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
  ), 0) INTO total_hours
  FROM public.bookings
  WHERE user_id = user_uuid
    AND start_time >= month_start
    AND start_time < month_end;
  
  RETURN ROUND(total_hours, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Function: Check minimum 30-minute gap between bookings
-- ============================================
CREATE OR REPLACE FUNCTION check_booking_interval()
RETURNS trigger AS $$
DECLARE
  gap_minutes integer := 30;
  conflict_exists boolean;
BEGIN
  -- Check if there's a booking that ends within 30 minutes before this booking starts
  -- OR starts within 30 minutes after this booking ends
  -- For the same room
  SELECT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE room_id = NEW.room_id
    AND id <> COALESCE(NEW.id, gen_random_uuid())
    AND (
      -- The new booking starts less than 30 minutes after an existing booking ends
      (NEW.start_time > end_time AND NEW.start_time < end_time + (gap_minutes || ' minutes')::interval)
      OR
      -- The new booking ends less than 30 minutes before an existing booking starts
      (NEW.end_time < start_time AND NEW.end_time > start_time - (gap_minutes || ' minutes')::interval)
    )
  ) INTO conflict_exists;

  IF conflict_exists THEN
    RAISE EXCEPTION 'É necessário um intervalo mínimo de 30 minutos entre agendamentos na mesma sala.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_check_booking_interval ON public.bookings;
CREATE TRIGGER trigger_check_booking_interval
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION check_booking_interval();

-- ============================================
-- 6. Function: Create notification on new booking
-- ============================================
CREATE OR REPLACE FUNCTION notify_admin_on_booking()
RETURNS trigger AS $$
DECLARE
  user_name text;
  room_name text;
  booking_date text;
BEGIN
  -- Get user name
  SELECT full_name INTO user_name 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  room_name := NEW.room_id;
  booking_date := to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');
  
  -- Insert notification
  INSERT INTO public.admin_notifications (type, booking_id, user_id, message)
  VALUES (
    'new_booking',
    NEW.id,
    NEW.user_id,
    'Novo agendamento: ' || COALESCE(user_name, 'Usuário') || ' reservou ' || room_name || ' para ' || booking_date
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new bookings
DROP TRIGGER IF EXISTS trigger_notify_admin_on_booking ON public.bookings;
CREATE TRIGGER trigger_notify_admin_on_booking
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION notify_admin_on_booking();

-- ============================================
-- 7. Function: Check quota before booking
-- ============================================
CREATE OR REPLACE FUNCTION check_booking_quota()
RETURNS trigger AS $$
DECLARE
  current_hours numeric;
  user_quota integer;
  new_booking_hours numeric;
  total_after_booking numeric;
BEGIN
  -- Get user's quota
  SELECT COALESCE(monthly_hours_quota, 10) INTO user_quota
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Get current month's usage
  current_hours := get_user_monthly_hours(NEW.user_id);
  
  -- Calculate new booking duration in hours
  new_booking_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0;
  
  total_after_booking := current_hours + new_booking_hours;
  
  IF total_after_booking > user_quota THEN
    RAISE EXCEPTION 'Cota mensal excedida. Você tem %.2fh disponíveis e está tentando reservar %.2fh. Entre em contato com a direção do coworking.', 
      GREATEST(0, user_quota - current_hours), new_booking_hours;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for quota check
DROP TRIGGER IF EXISTS trigger_check_booking_quota ON public.bookings;
CREATE TRIGGER trigger_check_booking_quota
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION check_booking_quota();

-- ============================================
-- 8. Update RLS policy for bookings deletion (24h rule)
-- ============================================
-- Drop existing delete policy
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.bookings;

-- Create new policy: Users can only delete their own bookings if > 24h before start
CREATE POLICY "Enable delete for users based on user_id and 24h rule"
ON public.bookings FOR DELETE
USING (
  auth.uid() = user_id
  AND start_time > (now() + interval '24 hours')
);

-- Create policy: Admins can delete any booking anytime
CREATE POLICY "Admins can delete any booking"
ON public.bookings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);
