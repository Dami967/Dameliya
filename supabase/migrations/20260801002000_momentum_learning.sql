-- Ответы викторин и отчёты становятся частью персонального контекста Кью.
alter table public.momentum_actions
  add column content text,
  add column ai_analysis text;

create or replace function public.save_momentum_learning(
  action_kind text,
  content_text text,
  analysis_text text default ''
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if action_kind not in ('quiz', 'report') then raise exception 'Unknown action'; end if;
  if char_length(content_text) > 5000 or char_length(analysis_text) > 3000
  then raise exception 'Learning entry is too long'; end if;

  update public.momentum_actions
    set content = content_text, ai_analysis = nullif(analysis_text, '')
  where id = (
    select id from public.momentum_actions
    where user_id = auth.uid() and kind = action_kind
    order by created_at desc limit 1
  );
end;
$$;
grant execute on function public.save_momentum_learning(text,text,text) to authenticated;
