alter table public.profiles add column momentum_updated_at timestamptz not null default now();

create table public.momentum_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('quiz', 'report')),
  created_at timestamptz not null default now()
);
alter table public.momentum_actions enable row level security;
create policy "users read own momentum actions" on public.momentum_actions
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.use_ai_momentum()
returns integer language plpgsql security definer set search_path = ''
as $$
declare current_value integer; last_update timestamptz; regenerated integer;
begin
  select momentum, momentum_updated_at into current_value, last_update
  from public.profiles where user_id = auth.uid() for update;
  regenerated := least(100, current_value + floor(extract(epoch from (now() - last_update)) / 600)::integer);
  if regenerated < 1 then return -1; end if;
  update public.profiles set momentum = regenerated - 1, momentum_updated_at = now()
  where user_id = auth.uid();
  return regenerated - 1;
end;
$$;
grant execute on function public.use_ai_momentum() to authenticated;

create or replace function public.restore_momentum(action_kind text)
returns integer language plpgsql security definer set search_path = ''
as $$
declare cooldown interval; amount integer; value integer;
begin
  if action_kind = 'quiz' then cooldown := interval '1 hour'; amount := 5;
  elsif action_kind = 'report' then cooldown := interval '1 day'; amount := 10;
  else raise exception 'Unknown action'; end if;
  if exists (select 1 from public.momentum_actions
    where user_id = auth.uid() and kind = action_kind and created_at > now() - cooldown)
  then raise exception 'Action cooldown'; end if;
  insert into public.momentum_actions(user_id, kind) values (auth.uid(), action_kind);
  update public.profiles set momentum = least(100, momentum + amount), momentum_updated_at = now()
  where user_id = auth.uid() returning momentum into value;
  return value;
end;
$$;
grant execute on function public.restore_momentum(text) to authenticated;
