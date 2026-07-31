-- У каждой команды может быть только одна общая карта приключения.
create unique index team_goals_one_per_team_idx on public.team_goals(team_id);

create or replace function public.replace_team_quest(
  target_goal uuid,
  next_title text,
  next_description text,
  next_stages jsonb
)
returns void language plpgsql security definer set search_path = ''
as $$
declare target_team uuid;
begin
  select team_id into target_team from public.team_goals where id = target_goal;
  if target_team is null or not public.can_manage_team(target_team) then
    raise exception 'Only team managers can rebuild the map';
  end if;
  if jsonb_typeof(next_stages) <> 'array' or jsonb_array_length(next_stages) < 1 then
    raise exception 'Stages are required';
  end if;
  update public.team_goals set title = next_title, description = next_description, progress = 0
    where id = target_goal;
  delete from public.team_goal_stages where goal_id = target_goal;
  insert into public.team_goal_stages (goal_id, position, title, description, created_by)
  select target_goal, stage_number - 1, stage->>'title', coalesce(stage->>'description', ''), auth.uid()
  from jsonb_array_elements(next_stages) with ordinality as items(stage, stage_number);
end;
$$;

grant execute on function public.replace_team_quest(uuid,text,text,jsonb) to authenticated;
