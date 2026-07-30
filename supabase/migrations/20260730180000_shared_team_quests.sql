-- Один общий квест команды: роли, этапы, предложения, аудит и Realtime.
alter table public.team_members drop constraint if exists team_members_role_check;
update public.team_members set role = 'creator' where role = 'owner';
alter table public.team_members alter column role set default 'member';
alter table public.team_members add constraint team_members_role_check
  check (role in ('creator', 'admin', 'member'));

alter table public.team_goals
  add column if not exists description text not null default '',
  add column if not exists updated_at timestamptz not null default now();

create table public.team_goal_stages (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.team_goals(id) on delete cascade,
  position integer not null check (position >= 0),
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '',
  notes text not null default '',
  materials jsonb not null default '[]'::jsonb check (jsonb_typeof(materials) = 'array'),
  status text not null default 'pending' check (status in ('pending', 'done')),
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, position)
);

create table public.team_goal_proposals (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.team_goals(id) on delete cascade,
  stage_id uuid references public.team_goal_stages(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('add', 'edit', 'delete')),
  summary text not null check (char_length(summary) between 2 and 500),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.team_goal_history (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.team_goals(id) on delete cascade,
  actor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null default 'stage',
  entity_id uuid,
  summary text not null,
  before_data jsonb,
  after_data jsonb,
  undone_at timestamptz,
  undone_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.team_goal_stages enable row level security;
alter table public.team_goal_proposals enable row level security;
alter table public.team_goal_history enable row level security;

create or replace function public.is_team_member(target_team uuid)
returns boolean language sql security definer stable set search_path = ''
as $$ select exists (
  select 1 from public.team_members where team_id = target_team and user_id = auth.uid()
); $$;

create or replace function public.can_manage_team(target_team uuid)
returns boolean language sql security definer stable set search_path = ''
as $$ select exists (
  select 1 from public.team_members
  where team_id = target_team and user_id = auth.uid() and role in ('creator', 'admin')
); $$;

grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.can_manage_team(uuid) to authenticated;

create or replace function public.add_team_member_by_username(target_team uuid, target_username text)
returns void language plpgsql security definer set search_path = ''
as $$
declare target_user uuid;
begin
  if not public.can_manage_team(target_team) then raise exception 'Only team managers can invite members'; end if;
  select user_id into target_user from public.profiles where lower(username) = lower(trim(both '@' from target_username));
  if target_user is null then raise exception 'User not found'; end if;
  insert into public.team_members (team_id, user_id, role) values (target_team, target_user, 'member')
  on conflict (team_id, user_id) do nothing;
end; $$;

create or replace function public.set_team_member_role(target_team uuid, target_user uuid, next_role text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_manage_team(target_team) then raise exception 'Only team managers can change roles'; end if;
  if next_role not in ('admin', 'member') then raise exception 'Invalid role'; end if;
  update public.team_members set role = next_role
  where team_id = target_team and user_id = target_user and role <> 'creator';
end; $$;

grant execute on function public.add_team_member_by_username(uuid, text) to authenticated;
grant execute on function public.set_team_member_role(uuid, uuid, text) to authenticated;

drop policy if exists "members see team goals" on public.team_goals;
drop policy if exists "members create team goals" on public.team_goals;
drop policy if exists "goal creators update goals" on public.team_goals;
create policy "team members see shared goals" on public.team_goals for select
  using (public.is_team_member(team_id));
create policy "team managers create shared goals" on public.team_goals for insert
  with check (creator_id = auth.uid() and public.can_manage_team(team_id));
create policy "team managers update shared goals" on public.team_goals for update
  using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));
create policy "team managers delete shared goals" on public.team_goals for delete
  using (public.can_manage_team(team_id));

create policy "team members see shared stages" on public.team_goal_stages for select
  using (exists (select 1 from public.team_goals g where g.id = goal_id and public.is_team_member(g.team_id)));
create policy "team managers add shared stages" on public.team_goal_stages for insert
  with check (exists (select 1 from public.team_goals g where g.id = goal_id and public.can_manage_team(g.team_id)));
create policy "team managers edit shared stages" on public.team_goal_stages for update
  using (exists (select 1 from public.team_goals g where g.id = goal_id and public.can_manage_team(g.team_id)));
create policy "team managers delete shared stages" on public.team_goal_stages for delete
  using (exists (select 1 from public.team_goals g where g.id = goal_id and public.can_manage_team(g.team_id)));

create policy "team members see proposals" on public.team_goal_proposals for select
  using (exists (select 1 from public.team_goals g where g.id = goal_id and public.is_team_member(g.team_id)));
create policy "members create own proposals" on public.team_goal_proposals for insert
  with check (author_id = auth.uid() and exists (
    select 1 from public.team_goals g where g.id = goal_id and public.is_team_member(g.team_id)
  ));
create policy "managers review proposals" on public.team_goal_proposals for update
  using (exists (select 1 from public.team_goals g where g.id = goal_id and public.can_manage_team(g.team_id)));

create policy "team members see goal history" on public.team_goal_history for select
  using (exists (select 1 from public.team_goals g where g.id = goal_id and public.is_team_member(g.team_id)));

create or replace function public.change_team_stage_state(target_stage uuid, is_done boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.team_goal_stages s join public.team_goals g on g.id = s.goal_id
    where s.id = target_stage and public.is_team_member(g.team_id)
  ) then raise exception 'Not a team member'; end if;
  update public.team_goal_stages set
    status = case when is_done then 'done' else 'pending' end,
    completed_by = case when is_done then auth.uid() else null end,
    completed_at = case when is_done then now() else null end,
    updated_at = now()
  where id = target_stage;
end; $$;

create or replace function public.change_team_stage_notes(target_stage uuid, next_notes text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if char_length(next_notes) > 5000 then raise exception 'Notes are too long'; end if;
  if not exists (
    select 1 from public.team_goal_stages s join public.team_goals g on g.id = s.goal_id
    where s.id = target_stage and public.is_team_member(g.team_id)
  ) then raise exception 'Not a team member'; end if;
  update public.team_goal_stages set notes = next_notes, updated_at = now() where id = target_stage;
end; $$;

grant execute on function public.change_team_stage_state(uuid, boolean) to authenticated;
grant execute on function public.change_team_stage_notes(uuid, text) to authenticated;

create or replace function public.audit_team_stage_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare target_goal uuid := coalesce(new.goal_id, old.goal_id);
begin
  if current_setting('goalquest.undoing', true) = 'true' then return coalesce(new, old); end if;
  insert into public.team_goal_history (goal_id, actor_id, action, entity_id, summary, before_data, after_data)
  values (target_goal, auth.uid(), lower(tg_op), coalesce(new.id, old.id),
    case tg_op when 'INSERT' then 'Добавлен этап «' || new.title || '»'
      when 'DELETE' then 'Удалён этап «' || old.title || '»'
      else 'Обновлён этап «' || new.title || '»' end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end; $$;

create trigger audit_team_goal_stages after insert or update or delete on public.team_goal_stages
for each row execute function public.audit_team_stage_change();

create or replace function public.refresh_team_goal_progress()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare target_goal uuid := coalesce(new.goal_id, old.goal_id); target_team uuid;
begin
  update public.team_goals g set progress = coalesce((
    select round(100.0 * count(*) filter (where status = 'done') / nullif(count(*), 0))
    from public.team_goal_stages where goal_id = target_goal
  ), 0), updated_at = now() where id = target_goal returning team_id into target_team;
  update public.teams set progress = coalesce((
    select round(avg(progress)) from public.team_goals where team_id = target_team
  ), 0) where id = target_team;
  return coalesce(new, old);
end; $$;

create trigger refresh_shared_goal_progress after insert or update or delete on public.team_goal_stages
for each row execute function public.refresh_team_goal_progress();

create or replace function public.undo_last_team_goal_change(target_goal uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare change public.team_goal_history;
begin
  if not exists (
    select 1 from public.team_goals g where g.id = target_goal and public.can_manage_team(g.team_id)
  ) then raise exception 'Only team managers can undo changes'; end if;
  select * into change from public.team_goal_history
  where goal_id = target_goal and undone_at is null order by created_at desc limit 1 for update;
  if change.id is null then raise exception 'Nothing to undo'; end if;
  perform set_config('goalquest.undoing', 'true', true);
  if change.action = 'insert' then
    delete from public.team_goal_stages where id = change.entity_id;
  elsif change.action = 'delete' then
    insert into public.team_goal_stages select * from jsonb_populate_record(null::public.team_goal_stages, change.before_data);
  else
    update public.team_goal_stages set
      position = (change.before_data->>'position')::integer,
      title = change.before_data->>'title', description = change.before_data->>'description',
      notes = change.before_data->>'notes', materials = change.before_data->'materials',
      status = change.before_data->>'status',
      completed_by = (change.before_data->>'completed_by')::uuid,
      completed_at = (change.before_data->>'completed_at')::timestamptz,
      updated_at = now()
    where id = change.entity_id;
  end if;
  update public.team_goal_history set undone_at = now(), undone_by = auth.uid() where id = change.id;
end; $$;

grant execute on function public.undo_last_team_goal_change(uuid) to authenticated;

create index team_goal_stages_order_idx on public.team_goal_stages(goal_id, position);
create index team_goal_proposals_goal_idx on public.team_goal_proposals(goal_id, status);
create index team_goal_history_goal_idx on public.team_goal_history(goal_id, created_at desc);

alter publication supabase_realtime add table public.team_goals;
alter publication supabase_realtime add table public.team_goal_stages;
alter publication supabase_realtime add table public.team_goal_proposals;
alter publication supabase_realtime add table public.team_goal_history;
