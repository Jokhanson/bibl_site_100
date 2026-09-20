-- Таблица комментариев для сайта «Черниговка: страницы прошлого»
-- Вставьте в Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  text text not null check (char_length(text) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

-- Включить Row Level Security
alter table public.comments enable row level security;

-- Читать могут все посетители, но только одобренные комментарии
create policy "public_can_read_approved"
  on public.comments
  for select
  using (status = 'approved');

-- Писать может любой анонимный посетитель, комментарий уходит в статус pending
create policy "public_can_insert_pending"
  on public.comments
  for insert
  with check (status = 'pending');