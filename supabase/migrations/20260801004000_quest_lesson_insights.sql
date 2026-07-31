-- Отдельная конкретная заметка Кью для каждого завершённого этапа.
alter table public.ai_quest_plans
  add column insights jsonb not null default '[]'::jsonb
  check (jsonb_typeof(insights) = 'array');
