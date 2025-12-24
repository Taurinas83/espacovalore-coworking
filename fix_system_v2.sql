-- 1. Create Function to Delete Users (Authentication + Profile)
-- This allows the admin to completely remove a user from the system.
create or replace function public.delete_user()
returns void 
language plpgsql
security definer
as $$
declare
  request_id uuid;
begin
  -- Get the ID from the request (passed via rpc parameters usually, but supabase wraps it differently)
  -- Actually, the best way for a "delete by ID" RPC is to accept an argument.
  -- The previous function signature was wrong. Let's redefine it.
  
  -- We don't need this block, we will replace it below.
end;
$$;

drop function if exists public.delete_user();

create or replace function public.delete_user_by_id(user_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Verify if the requester is an admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  ) then
    raise exception 'Unauthorized';
  end if;

  -- Delete from public.profiles (Cascade should handle it, but good to be explicit)
  delete from public.profiles where id = user_uuid;
  
  -- Delete from auth.users (This requires this function to be run by an owner or have permissions)
  -- Note: Deleting from auth.users via SQL is restricted in Supabase unless you use the service_role key 
  -- OR you are a superuser. Standard Postgres functions can't delete from auth.users easily.
  -- WORKAROUND: We will relying on CLIENT-SIDE deletion of the profile, 
  -- and use this function to just clean up if needed, OR we trust the admin to use the Supabase Dashboard for full delete.
  -- BETTER: We just set `is_approved` to false to "Soft Delete" / Block them. 
  -- DATA DELETION REQUEST: User asked to "Delete".
  -- Let's just delete from profiles. If we delete from profiles, the user log in will fail in the app logic anyway.
  -- But the auth user remains. Ideally, we want to delete auth user.
  -- Since we can't reliably delete from auth.users via SQL without extensions, 
  -- we will stick to: 
  -- 1. Delete from Profiles.
  -- 2. (Optional) If you have `supabase-admin` JS client (service role) on the backend, you'd use that.
  -- PROPOSAL: We delete the profile. The user effectively ceases to exist in the APP.
  
  -- However, to prevent Foreign Key errors if we have bookings, we should delete them too.
  delete from public.bookings where user_id = user_uuid;
  delete from public.announcements where author_id = user_uuid;
  
  -- Finally delete profile
  delete from public.profiles where id = user_uuid;
end;
$$;


-- 2. Update Trigger to capture Assigned Room from Metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, photo_url, assigned_room)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'assigned_room' -- Capture the room!
  );
  return new;
end;
$$ language plpgsql security definer;


-- 3. Fix Admin Login (Approve yourself)
-- REPLACE 'seu@email.com' WITH YOUR EMAIL IF NEEDED, 
-- or just run this generic update for ALL existing admins.
update public.profiles
set is_approved = true
where is_admin = true;


-- 4. Ensure RLS allows Admins to DELETE profiles
drop policy if exists "Admins can delete any profile" on public.profiles;
create policy "Admins can delete any profile"
on public.profiles for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  )
);
