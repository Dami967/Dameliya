-- Живой чат, идеи, голосование, приглашения и AI-выводы командного квеста.
alter table public.team_goal_stages add column ai_insight text;

create table public.team_ideas (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 2 and 1000),
  created_at timestamptz not null default now()
);
create table public.team_idea_votes (
  idea_id uuid not null references public.team_ideas(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);
create table public.team_invites (
  token uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  inviter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.team_ideas enable row level security;
alter table public.team_idea_votes enable row level security;
alter table public.team_invites enable row level security;
create policy "members see team ideas" on public.team_ideas for select
  using (public.is_team_member(team_id));
create policy "members add team ideas" on public.team_ideas for insert
  with check (author_id = auth.uid() and public.is_team_member(team_id));
create policy "authors delete team ideas" on public.team_ideas for delete
  using (author_id = auth.uid());
create policy "members see idea votes" on public.team_idea_votes for select
  using (exists (select 1 from public.team_ideas i where i.id = idea_id and public.is_team_member(i.team_id)));
create policy "members vote for ideas" on public.team_idea_votes for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.team_ideas i where i.id = idea_id and public.is_team_member(i.team_id)
  ));
create policy "users remove own votes" on public.team_idea_votes for delete using (user_id = auth.uid());
create policy "managers create team invites" on public.team_invites for insert
  with check (inviter_id = auth.uid() and public.can_manage_team(team_id));
create policy "managers see team invites" on public.team_invites for select
  using (inviter_id = auth.uid());

create or replace function public.accept_team_invite(invite_token uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare invite public.team_invites; team_name text;
begin
  select * into invite from public.team_invites where token = invite_token;
  if invite.token is null or invite.expires_at <= now() then raise exception 'Invite expired'; end if;
  insert into public.team_members(team_id,user_id,role) values(invite.team_id,auth.uid(),'member')
    on conflict (team_id,user_id) do nothing;
  select name into team_name from public.teams where id = invite.team_id;
  return team_name;
end;
$$;
create or replace function public.invite_team_friend(target_team uuid, target_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_manage_team(target_team) then raise exception 'Only managers can invite'; end if;
  if not exists (
    select 1 from public.follows a join public.follows b
      on a.follower_id=b.following_id and a.following_id=b.follower_id
    where a.follower_id=auth.uid() and a.following_id=target_user
  ) then raise exception 'Only mutual friends can be invited'; end if;
  insert into public.team_members(team_id,user_id,role) values(target_team,target_user,'member')
    on conflict (team_id,user_id) do nothing;
end;
$$;
create or replace function public.set_team_stage_insight(target_stage uuid, insight_text text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if char_length(insight_text) > 1000 then raise exception 'Insight too long'; end if;
  if not exists (select 1 from public.team_goal_stages s join public.team_goals g on g.id=s.goal_id
    where s.id=target_stage and public.is_team_member(g.team_id)) then raise exception 'Not a team member'; end if;
  update public.team_goal_stages set ai_insight=insight_text,updated_at=now() where id=target_stage;
end;
$$;
grant execute on function public.accept_team_invite(uuid) to authenticated;
grant execute on function public.invite_team_friend(uuid,uuid) to authenticated;
grant execute on function public.set_team_stage_insight(uuid,text) to authenticated;

create or replace function public.audit_team_stage_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare target_goal uuid := coalesce(new.goal_id, old.goal_id);
begin
  if current_setting('goalquest.undoing', true) = 'true' then return coalesce(new, old); end if;
  insert into public.team_goal_history (goal_id, actor_id, action, entity_id, summary, before_data, after_data)
  values (target_goal, auth.uid(), lower(tg_op), coalesce(new.id, old.id),
    case when tg_op = 'INSERT' then 'Добавлен этап «' || new.title || '»'
      when tg_op = 'DELETE' then 'Удалён этап «' || old.title || '»'
      when new.ai_insight is distinct from old.ai_insight then 'Кью обновил главную мысль: ' || new.ai_insight
      else 'Обновлён этап «' || new.title || '»' end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

alter publication supabase_realtime add table public.team_messages;
alter publication supabase_realtime add table public.team_ideas;
alter publication supabase_realtime add table public.team_idea_votes;
