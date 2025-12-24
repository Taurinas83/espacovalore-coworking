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
