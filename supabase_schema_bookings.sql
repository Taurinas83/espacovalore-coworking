-- Create a table for room bookings
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  room_id text not null, -- Using text for simplicity (e.g., "Sala de Reunião", "Sala de Treinamento") or UUID if you have a rooms table
  user_id uuid references auth.users not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  title text,
  
  -- Constraint to ensure end_time is after start_time
  constraint bookings_dates_check check (end_time > start_time)
);

-- Enable RLS
alter table public.bookings enable row level security;

-- Policy: Everyone can view bookings (to see availability)
create policy "Enable read access for all users"
on public.bookings for select
using ( true );

-- Policy: Authenticated users can insert their own bookings
create policy "Enable insert for authenticated users"
on public.bookings for insert
with check ( auth.uid() = user_id );

-- Policy: Users can update their own bookings
create policy "Enable update for users based on user_id"
on public.bookings for update
using ( auth.uid() = user_id );

-- Policy: Users can delete their own bookings
create policy "Enable delete for users based on user_id"
on public.bookings for delete
using ( auth.uid() = user_id );

-- Double Booking Prevention (Requires 'btree_gist' extension)
-- If extension is not available, you might need a trigger-based approach. 
-- Most Supabase projects have extensions enabled or available.
-- create extension if not exists btree_gist;

-- alter table public.bookings
-- add constraint no_double_booking
-- exclude using gist (
--   room_id with =,
--   tsrange(start_time, end_time) with &&
-- );

-- ALTERNATIVE: Database Function for double booking check (if GIST is too complex or fails)
create or replace function check_double_booking()
returns trigger as $$
begin
  if exists (
    select 1 from public.bookings
    where room_id = new.room_id
    and id <> new.id -- exclude self on update
    and tsrange(start_time, end_time) && tsrange(new.start_time, new.end_time)
  ) then
    raise exception 'Room is already booked for this time slot';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_check_double_booking
before insert or update on public.bookings
for each row execute function check_double_booking();
