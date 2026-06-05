-- Documents table: per-application file attachments (resumes, cover letters, etc.)
-- Files stored in Supabase Storage bucket 'application-documents' (private)

create table documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  user_id uuid references auth.users(id),
  file_name text not null,
  storage_path text not null,
  file_size integer,
  created_at timestamptz default now()
);

alter table documents enable row level security;

create policy "Users manage own documents"
  on documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket policy (run after creating the 'application-documents' bucket in the dashboard)
-- Files are stored as {userId}/{applicationId}/{timestamp}-{filename}
-- The first folder segment must match the authenticated user's ID

create policy "Users manage own files"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
