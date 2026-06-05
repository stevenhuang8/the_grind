-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Applications table
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  company text not null,
  role text not null,
  stage text not null default 'applied',
  applied_date date not null default current_date,
  url text,
  notes text,
  xp_awarded int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: users can only see their own applications
alter table applications enable row level security;

create policy "Users can view own applications"
  on applications for select
  using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on applications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on applications for update
  using (auth.uid() = user_id);

create policy "Users can delete own applications"
  on applications for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger applications_updated_at
  before update on applications
  for each row execute procedure handle_updated_at();

-- Weekly recaps
create table weekly_recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start date not null,
  recap_text text not null,
  created_at timestamptz default now()
);

alter table weekly_recaps enable row level security;

create policy "Users can view own recaps"
  on weekly_recaps for select
  using (auth.uid() = user_id);

create policy "Users can insert own recaps"
  on weekly_recaps for insert
  with check (auth.uid() = user_id);
