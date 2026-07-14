-- Executar no SQL Editor do Supabase

create table if not exists visits (
  id text primary key,
  ip text not null default '',
  city text not null default 'Desconhecida',
  region text not null default 'Desconhecido',
  country text not null default 'Desconhecido',
  page text not null default '/',
  user_agent text not null default '',
  referrer text not null default '',
  server_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_visits_created_at on visits(created_at desc);

-- Enable Row Level Security (opcional)
alter table visits enable row level security;

-- Permitir anon inserir e selecionar
create policy "anon insert" on visits for insert to anon with check (true);
create policy "anon select" on visits for select to anon using (true);
create policy "anon delete" on visits for delete to anon using (true);
