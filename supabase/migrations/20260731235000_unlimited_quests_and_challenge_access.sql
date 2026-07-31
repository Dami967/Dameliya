alter table public.quest_task_records drop constraint quest_task_records_step_id_check;
alter table public.quest_task_records add constraint quest_task_records_step_id_check check (step_id > 0);

drop policy "participants see challenges" on public.challenges;
create policy "participants see challenges" on public.challenges for select using (
  auth.uid() = creator_id or public.is_challenge_participant(id)
);
