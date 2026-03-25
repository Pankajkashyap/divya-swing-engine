do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'divya-watchlist-screener-nightly'
  ) then
    perform cron.unschedule('divya-watchlist-screener-nightly');
  end if;
end $$;

select cron.schedule(
  'divya-watchlist-screener-nightly',
  '0 4 * * 1-5',
  $$
  select net.http_post(
    url := 'https://tbxvccwbhnrcantntkhy.supabase.co/functions/v1/watchlist-screener',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  )
  $$
);