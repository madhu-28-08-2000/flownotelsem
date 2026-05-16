
create table public.workspaces (
  client_id text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create policy "public read workspaces"
  on public.workspaces for select
  using (true);

create policy "public insert workspaces"
  on public.workspaces for insert
  with check (true);

create policy "public update workspaces"
  on public.workspaces for update
  using (true) with check (true);
