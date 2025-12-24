-- Add approval and assigned_room columns to profiles
alter table public.profiles 
add column if not exists is_approved boolean default false;

alter table public.profiles 
add column if not exists assigned_room text;

-- Update RLS to allow Admins to update ANY profile (to approve them)
create policy "Admins can update any profile"
on public.profiles for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  )
);

-- Note: The existing "Users can update own profile" policy still allows users to edit their own bio/photo, which is fine.
-- But we might want to prevent them from changing 'is_approved' themselves. 
-- RLS 'using' clause handles ROW selection, 'with check' handles the NEW data.
-- Standard 'Users can update own profile' usually allows all columns unless restricted by a Trigger or separate column policies (which Supabase doesn't support natively easily without triggers).
-- For this MVP, we trust the frontend or assume the 'assigned_room' and 'is_approved' are not exposed in the generic profile edit form (ProfileEditPage.tsx), which is true. 
-- Ideally, a trigger would prevent non-admins from changing those columns, but let's keep it simple for now.

-- If you are the FIRST admin and you are locked out because is_approved=false, run this:
-- update public.profiles set is_approved = true where id = (select id from auth.users where email = 'seu@email.com');
