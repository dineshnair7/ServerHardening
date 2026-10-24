create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plans_user_updated_idx on public.plans (user_id, updated_at desc);

revoke all on public.plans from anon;
grant select, insert, update, delete on public.plans to authenticated;

alter table public.plans enable row level security;

create policy "Owners can read plans"
on public.plans for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners can create plans"
on public.plans for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Owners can update plans"
on public.plans for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Owners can delete plans"
on public.plans for delete to authenticated
using ((select auth.uid()) = user_id);
