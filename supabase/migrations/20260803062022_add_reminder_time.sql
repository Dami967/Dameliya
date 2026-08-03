alter table public.user_settings
  add column reminder_time time not null default '18:00';
