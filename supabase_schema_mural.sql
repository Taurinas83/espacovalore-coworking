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
