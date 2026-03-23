select ticker, action_type, urgency, state, title, message, created_at
from pending_actions
where action_type in ('stop_alert', 'target_alert')
order by created_at desc;

select ticker, trigger_type, trigger_state, dedupe_key, sent_at, cooldown_until
from notifications
where trigger_type in ('stop_alert', 'target_alert')
order by sent_at desc;

select ticker, entry_price_actual, last_monitored_at, last_stop_alert_at, last_target_1_alert_at, last_target_2_alert_at
from trades
where ticker in ('SPY', 'AAPL')
order by entry_price_actual desc, ticker;

select job_type, window_key, status, message, changes_json, started_at, finished_at
from scan_logs
where job_type = 'trade-monitor'
order by started_at desc
limit 5;
