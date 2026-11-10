-- Makes the shared recruiter demo account read-only at the database level.
-- Run after schema.sql and documents.sql. Replace the email in the last statement first.
--
-- The service role bypasses these policies, which is how scripts/seed-demo.ts writes.
--
-- To change the demo account's password or email later, first remove the marker:
--   update auth.users set raw_app_meta_data = raw_app_meta_data - 'demo' where email = '...';
-- then make the change and run the last statement below again.

create or replace function public.is_demo_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'demo')::boolean, false)
$$;

-- Restrictive policies are ANDed with the existing per-user policies.

create policy "Demo cannot insert applications"
  on applications as restrictive for insert to authenticated
  with check (not public.is_demo_user());

create policy "Demo cannot update applications"
  on applications as restrictive for update to authenticated
  using (not public.is_demo_user());

create policy "Demo cannot delete applications"
  on applications as restrictive for delete to authenticated
  using (not public.is_demo_user());

create policy "Demo cannot insert documents"
  on documents as restrictive for insert to authenticated
  with check (not public.is_demo_user());

create policy "Demo cannot update documents"
  on documents as restrictive for update to authenticated
  using (not public.is_demo_user());

create policy "Demo cannot delete documents"
  on documents as restrictive for delete to authenticated
  using (not public.is_demo_user());

create policy "Demo cannot insert recaps"
  on weekly_recaps as restrictive for insert to authenticated
  with check (not public.is_demo_user());

create policy "Demo cannot insert files"
  on storage.objects as restrictive for insert to authenticated
  with check (not public.is_demo_user());

create policy "Demo cannot update files"
  on storage.objects as restrictive for update to authenticated
  using (not public.is_demo_user());

create policy "Demo cannot delete files"
  on storage.objects as restrictive for delete to authenticated
  using (not public.is_demo_user());

-- RLS does not cover auth.updateUser(), so guard the credentials directly.
-- Only these columns are compared because every sign-in also updates this row.

create or replace function public.protect_demo_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.raw_app_meta_data ->> 'demo' = 'true'
    and new.raw_app_meta_data ->> 'demo' = 'true'
    and (
      new.encrypted_password is distinct from old.encrypted_password
      or new.email is distinct from old.email
      or new.email_change is distinct from old.email_change
      or new.phone is distinct from old.phone
      or new.raw_user_meta_data is distinct from old.raw_user_meta_data
    )
  then
    raise exception 'The demo account cannot be modified';
  end if;
  return new;
end;
$$;

create trigger protect_demo_user
  before update on auth.users
  for each row execute procedure public.protect_demo_user();

-- Mark the demo account. Replace with the value of DEMO_EMAIL.
update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"demo": true}'::jsonb
  where email = 'REPLACE_WITH_DEMO_EMAIL';
