-- Каждая полностью завершённая викторина или проверенный отчёт дают награду.
-- Перед начислением учитываем энергию, восстановившуюся по таймеру.
create or replace function public.restore_momentum(action_kind text)
returns integer language plpgsql security definer set search_path = ''
as $$
declare amount integer; current_value integer; last_update timestamptz; regenerated integer; value integer;
begin
  if action_kind = 'quiz' then amount := 5;
  elsif action_kind = 'report' then amount := 10;
  else raise exception 'Unknown action'; end if;

  select momentum, momentum_updated_at into current_value, last_update
  from public.profiles where user_id = auth.uid() for update;
  regenerated := least(100, current_value
    + floor(extract(epoch from (now() - last_update)) / 600)::integer);
  value := least(100, regenerated + amount);

  insert into public.momentum_actions(user_id, kind) values (auth.uid(), action_kind);
  update public.profiles set momentum = value, momentum_updated_at = now()
  where user_id = auth.uid();
  return value;
end;
$$;

grant execute on function public.restore_momentum(text) to authenticated;
