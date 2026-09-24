-- Таблица комментариев для сайта «Черниговка: страницы прошлого»
-- Вставьте в Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Скрипт идемпотентный: можно запускать повторно безопасно.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  text text not null check (char_length(text) between 1 and 2000),
  status text not null default 'approved' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

-- Обновляем дефолт колонки, если таблица была создана старой версией скрипта
alter table public.comments alter column status set default 'approved';

-- Включить Row Level Security
alter table public.comments enable row level security;

-- Удаляем старые версии политик, чтобы скрипт можно было запускать повторно
drop policy if exists "public_can_read_approved" on public.comments;
drop policy if exists "public_can_insert_pending" on public.comments;
drop policy if exists "public_can_insert_approved" on public.comments;

-- Читать могут все посетители (виден любой комментарий, включая ранее
-- записанный как pending старой версией скрипта)
create policy "public_can_read_approved"
  on public.comments
  for select
  using (true);

-- Писать может любой анонимный посетитель, комментарий сразу публикуется
create policy "public_can_insert_approved"
  on public.comments
  for insert
  with check (status = 'approved');