select column_name 
from information_schema.columns 
where table_schema = 'public' 
and table_name = 'trades' 
and column_name in ('trade_state', 'shares_remaining');