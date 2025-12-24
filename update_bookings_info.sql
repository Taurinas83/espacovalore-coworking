-- Add columns to bookings table for snapshotting user info
alter table public.bookings 
add column if not exists user_unit text,
add column if not exists user_company_name text;

-- Optional: You might want to enforce them to be not null in valid bookings, 
-- but for existing records it's better to leave nullable or update them.
-- We will leave them nullable for database constraint, but enforce in Frontend.
