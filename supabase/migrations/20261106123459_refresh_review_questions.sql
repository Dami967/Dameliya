-- Refresh generated questions when the owner changes a goal, lesson, or language.
-- Score, attempts and rewards remain writable only through the existing RPCs.
create policy "users update own completed step questions"
  on public.quest_reviews for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.ai_quest_plans p, jsonb_array_elements(p.steps) s
      where p.id = plan_id and p.user_id = auth.uid()
        and (s->>'id')::integer = step_id and s->>'state' = 'done'
    )
  );
grant update (questions) on public.quest_reviews to authenticated;
