alter table public.user_settings
  add column if not exists notification_email text null;

update public.user_settings
set notification_email = 'REPLACE_WITH_YOUR_EMAIL'
where notification_email is null;