create or replace function public.create_user_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  preferred_language text;
begin
  preferred_language := coalesce(nullif(new.raw_user_meta_data ->> 'language', ''), 'en');

  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id, language)
  values (new.id, preferred_language)
  on conflict (user_id) do update set language = excluded.language;

  return new;
end;
$$;
