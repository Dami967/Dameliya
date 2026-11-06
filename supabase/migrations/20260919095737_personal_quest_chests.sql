-- Chapter indexes encode level * 100 + chapter within a ten-step level.
alter table public.quest_chest_openings drop constraint quest_chest_openings_chapter_index_check;
alter table public.quest_chest_openings add constraint quest_chest_openings_chapter_index_check
  check (chapter_index between 0 and 32000 and chapter_index % 100 between 0 and 2);

create function public.open_personal_quest_chest(target_plan uuid, target_chapter integer,
  generated_id text, generated_title text, generated_icon text, generated_category text,
  generated_rarity text, generated_description text)
returns text language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; existing text; completed integer; total integer; start_position integer; label text;
begin
  select user_id into owner_id from public.ai_quest_plans where id = target_plan and user_id = auth.uid() for update;
  if owner_id is null then raise exception 'Plan not found'; end if;
  select reward_label into existing from public.quest_chest_openings
    where user_id = auth.uid() and plan_id = target_plan and chapter_index = target_chapter;
  if existing is not null then return existing; end if;
  if target_chapter < 0 or target_chapter > 32000 or target_chapter % 100 > 2 then raise exception 'Invalid chapter'; end if;
  start_position := (target_chapter / 100) * 10 + (target_chapter % 100) * 3;
  select count(*), count(*) filter (where step.value->>'state' = 'done') into total, completed
    from public.ai_quest_plans p cross join lateral jsonb_array_elements(p.steps) with ordinality step(value, position)
    where p.id = target_plan and p.user_id = auth.uid()
      and step.position > start_position and step.position <= start_position + 3;
  if total <> 3 or completed <> 3 then raise exception 'Chest is locked'; end if;
  label := generated_icon || ' ' || generated_title;
  insert into public.ai_generated_rewards(user_id,id,title,icon,category,rarity,description)
    values(auth.uid(),generated_id,generated_title,generated_icon,generated_category,generated_rarity,generated_description);
  insert into public.user_rewards(user_id,reward_id) values(auth.uid(),generated_id);
  insert into public.quest_chest_openings(user_id,plan_id,chapter_index,reward_id,reward_label)
    values(auth.uid(),target_plan,target_chapter,generated_id,label);
  return label;
end $$;
revoke all on function public.open_personal_quest_chest(uuid,integer,text,text,text,text,text,text) from public;
grant execute on function public.open_personal_quest_chest(uuid,integer,text,text,text,text,text,text) to authenticated;
