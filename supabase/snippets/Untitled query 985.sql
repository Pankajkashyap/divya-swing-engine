select snapshot_date, market_phase, source, last_market_scan_at
from market_snapshots
order by snapshot_date desc
limit 5;