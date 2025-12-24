-- Enable RLS on storage.objects (usually enabled by default, but let's be sure)
-- alter table storage.objects enable row level security;

-- Policy: Allow authenticated users to UPLOAD files to 'avatars' bucket
create policy "Allow authenticated uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
);

-- Policy: Allow users to UPDATE their own files
create policy "Allow users to update own files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid() = owner
);

-- Policy: Allow Public Read Access (in case "Public Bucket" checkbox didn't catch everything)
create policy "Give public read access"
on storage.objects
for select
to public
using ( bucket_id = 'avatars' );
