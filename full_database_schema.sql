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
-- Create a table for public profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  company_name text,
  bio text,
  photo_url text,
  contact_info jsonb, -- e.g. { "phone": "+55...", "linkedin": "..." }

  constraint full_name_length check (char_length(full_name) >= 3)
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: Public profiles are viewable by everyone (authenticated)
create policy "Public profiles are viewable by everyone"
on public.profiles for select
using ( true );

-- Policy: Users can insert their own profile
create policy "Users can insert their own profile"
on public.profiles for insert
with check ( auth.uid() = id );

-- Policy: Users can update their own profile
create policy "Users can update own profile"
on public.profiles for update
using ( auth.uid() = id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, photo_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create Storage Bucket for Avatars if it doesn't exist
-- Note: This usually needs to be done via Dashboard, but SQL can sometimes do it if extensions enabled.
-- Best to stick to Dashboard instruction for Storage.
-- Add admin flag to profiles
alter table public.profiles 
add column if not exists is_admin boolean default false;

-- Create announcements table
create table public.announcements (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text not null,
  is_active boolean default true,
  author_id uuid references public.profiles(id) not null
);

-- Enable RLS
alter table public.announcements enable row level security;

-- Policy: Everyone can read active announcements
create policy "Everyone can read active announcements"
on public.announcements for select
using ( is_active = true );

-- Policy: Only Admins can insert announcements
create policy "Admins can insert announcements"
on public.announcements for insert
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  )
);

-- Policy: Only Admins can update announcements
create policy "Admins can update announcements"
on public.announcements for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  )
);

-- Policy: Only Admins can delete announcements
create policy "Admins can delete announcements"
on public.announcements for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  )
);
