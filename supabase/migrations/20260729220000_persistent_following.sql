-- Локальные демонстрационные рекомендации тоже запоминают подписку пользователя.
alter table public.social_ui_state drop constraint social_ui_state_scope_check;
alter table public.social_ui_state add constraint social_ui_state_scope_check
  check (scope in ('activity', 'chat', 'following'));
