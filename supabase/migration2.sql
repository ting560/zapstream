-- Executar no SQL Editor do Supabase

create table if not exists servers (
  id text primary key,
  name text not null,
  url text not null,
  username text not null,
  password text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table servers enable row level security;

create policy "anon insert" on servers for insert to anon with check (true);
create policy "anon select" on servers for select to anon using (true);
create policy "anon update" on servers for update to anon using (true);
create policy "anon delete" on servers for delete to anon using (true);

create table if not exists app_settings (
  id text primary key default 'default',
  adult_categories text[] not null default '{}',
  pin text not null default '123456',
  disabled_tabs text[] not null default '{}',
  admin_password text not null default 'admin',
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

create policy "anon select settings" on app_settings for select to anon using (true);
create policy "anon insert settings" on app_settings for insert to anon with check (true);
create policy "anon update settings" on app_settings for update to anon using (true);

-- Seed default settings row
insert into app_settings (id, adult_categories, pin, disabled_tabs, admin_password)
values ('default', '{Erótico,Adultos,XXX}', '123456', '{live,favoritos}', 'Frenesi04')
on conflict (id) do nothing;
