


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."expire_stale_buy_signals"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_count integer;
begin
  update public.pending_actions
  set state = 'expired',
      resolved_at = coalesce(resolved_at, now())
  where action_type = 'buy_signal'
    and expires_at is not null
    and expires_at < now()
    and state not in ('executed', 'dismissed', 'expired');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."expire_stale_buy_signals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_open_pending_actions_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select count(*)::integer
  from public.pending_actions
  where user_id = p_user_id
    and state = 'awaiting_confirmation';
$$;


ALTER FUNCTION "public"."get_open_pending_actions_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_single_user_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_user_id uuid;
begin
  select user_id
  into v_user_id
  from public.user_settings
  limit 1;

  if v_user_id is null then
    raise exception 'No user_id found in public.user_settings';
  end if;

  return v_user_id;
end;
$$;


ALTER FUNCTION "public"."get_single_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_resolved"("p_dedupe_key" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_count integer;
begin
  update public.notifications
  set resolved_at = now()
  where dedupe_key = p_dedupe_key
    and resolved_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."mark_notification_resolved"("p_dedupe_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."execution_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trade_id" "uuid",
    "pending_action_id" "uuid",
    "execution_type" "text" NOT NULL,
    "ticker" "text" NOT NULL,
    "quantity" integer,
    "price" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."execution_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "market_phase" "text" NOT NULL,
    "spx_distribution_days" integer DEFAULT 0 NOT NULL,
    "ndx_distribution_days" integer DEFAULT 0 NOT NULL,
    "ftd_active" boolean DEFAULT false NOT NULL,
    "ftd_date" "date",
    "rally_attempt_day" integer,
    "indexes_above_50dma" boolean,
    "indexes_above_150dma" boolean,
    "indexes_above_200dma" boolean,
    "leaders_above_50dma_pct" numeric,
    "new_highs_count" integer,
    "new_lows_count" integer,
    "breakout_success_rate_pct" numeric,
    "ad_line_direction" "text",
    "max_long_exposure_pct" numeric,
    "notes" "text",
    "user_id" "uuid" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "last_market_scan_at" timestamp with time zone,
    CONSTRAINT "chk_ad_line_direction" CHECK ((("ad_line_direction" IS NULL) OR ("ad_line_direction" = ANY (ARRAY['up'::"text", 'flat'::"text", 'down'::"text"])))),
    CONSTRAINT "chk_market_phase" CHECK (("market_phase" = ANY (ARRAY['confirmed_uptrend'::"text", 'under_pressure'::"text", 'rally_attempt'::"text", 'correction'::"text", 'bear'::"text"]))),
    CONSTRAINT "market_snapshots_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'automation'::"text"])))
);


ALTER TABLE "public"."market_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ticker" "text",
    "trade_id" "uuid",
    "pending_action_id" "uuid",
    "trigger_type" "text" NOT NULL,
    "trigger_state" "text" NOT NULL,
    "dedupe_key" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cooldown_until" timestamp with time zone,
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ticker" "text" NOT NULL,
    "trade_id" "uuid",
    "watchlist_id" "uuid",
    "trade_plan_id" "uuid",
    "action_type" "text" NOT NULL,
    "state" "text" NOT NULL,
    "urgency" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "snoozed_until" timestamp with time zone,
    CONSTRAINT "pending_actions_action_type_check" CHECK (("action_type" = ANY (ARRAY['buy_signal'::"text", 'stop_alert'::"text", 'target_alert'::"text", 'watchlist_review'::"text", 'manual_reconciliation'::"text"]))),
    CONSTRAINT "pending_actions_state_check" CHECK (("state" = ANY (ARRAY['awaiting_confirmation'::"text", 'snoozed'::"text", 'dismissed'::"text", 'executed'::"text", 'expired'::"text"]))),
    CONSTRAINT "pending_actions_urgency_check" CHECK (("urgency" = ANY (ARRAY['urgent'::"text", 'normal'::"text", 'low'::"text"])))
);


ALTER TABLE "public"."pending_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rule_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "setup_evaluation_id" "uuid" NOT NULL,
    "rule_code" "text" NOT NULL,
    "rule_name" "text" NOT NULL,
    "passed" boolean,
    "actual_value_text" "text",
    "actual_value_numeric" numeric,
    "notes" "text",
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."rule_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scan_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "job_type" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "ticker" "text",
    "window_key" "text" NOT NULL,
    "status" "text" NOT NULL,
    "message" "text",
    "changes_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone
);


ALTER TABLE "public"."scan_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."setup_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "watchlist_id" "uuid" NOT NULL,
    "evaluation_date" "date" NOT NULL,
    "market_phase_pass" boolean,
    "trend_template_pass" boolean,
    "liquidity_pass" boolean,
    "base_pattern_valid" boolean,
    "volume_pattern_valid" boolean,
    "rs_line_confirmed" boolean,
    "entry_near_pivot_pass" boolean,
    "volume_breakout_pass" boolean,
    "earnings_risk_flag" boolean DEFAULT false NOT NULL,
    "binary_event_flag" boolean DEFAULT false NOT NULL,
    "rr_pass" boolean,
    "rr_ratio" numeric,
    "setup_grade" "text",
    "score_total" numeric,
    "verdict" "text",
    "fail_reason" "text",
    "notes" "text",
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "chk_setup_evaluations_grade" CHECK ((("setup_grade" IS NULL) OR ("setup_grade" = ANY (ARRAY['A+'::"text", 'A'::"text", 'B'::"text", 'C'::"text"])))),
    CONSTRAINT "chk_setup_evaluations_verdict" CHECK ((("verdict" IS NULL) OR ("verdict" = ANY (ARRAY['pass'::"text", 'watch'::"text", 'fail'::"text"]))))
);


ALTER TABLE "public"."setup_evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trade_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "watchlist_id" "uuid" NOT NULL,
    "setup_evaluation_id" "uuid",
    "plan_date" "date" NOT NULL,
    "side" "text" DEFAULT 'long'::"text" NOT NULL,
    "portfolio_value" numeric,
    "risk_pct" numeric,
    "dollar_risk" numeric,
    "entry_price" numeric NOT NULL,
    "stop_price" numeric NOT NULL,
    "risk_per_share" numeric,
    "planned_shares" integer,
    "position_value" numeric,
    "position_cap_pct" numeric DEFAULT 25 NOT NULL,
    "adjusted_shares" integer,
    "target_1_price" numeric,
    "target_2_price" numeric,
    "expected_rr" numeric,
    "earnings_size_adjustment_pct" numeric,
    "correlation_adjustment_pct" numeric,
    "final_shares" integer,
    "final_position_value" numeric,
    "approval_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "blocked_reason" "text",
    "user_id" "uuid" NOT NULL,
    "source_watchlist_id" "uuid",
    "generated_by" "text" DEFAULT 'manual'::"text" NOT NULL,
    CONSTRAINT "chk_trade_plans_approval_status" CHECK (("approval_status" = ANY (ARRAY['draft'::"text", 'approved'::"text", 'blocked'::"text", 'executed'::"text"]))),
    CONSTRAINT "chk_trade_plans_side" CHECK (("side" = ANY (ARRAY['long'::"text", 'short'::"text"]))),
    CONSTRAINT "trade_plans_generated_by_check" CHECK (("generated_by" = ANY (ARRAY['manual'::"text", 'automation'::"text"])))
);


ALTER TABLE "public"."trade_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trade_plan_id" "uuid",
    "ticker" "text" NOT NULL,
    "side" "text" DEFAULT 'long'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "entry_date" "date",
    "entry_price_actual" numeric,
    "shares_entered" integer,
    "stop_price_initial" numeric,
    "stop_price_current" numeric,
    "target_1_price" numeric,
    "target_2_price" numeric,
    "trim_1_taken" boolean DEFAULT false NOT NULL,
    "trim_1_date" "date",
    "trim_1_price" numeric,
    "trim_2_taken" boolean DEFAULT false NOT NULL,
    "trim_2_date" "date",
    "trim_2_price" numeric,
    "exit_date" "date",
    "exit_price_actual" numeric,
    "shares_exited" integer DEFAULT 0 NOT NULL,
    "pnl_dollar" numeric,
    "pnl_pct" numeric,
    "r_multiple" numeric,
    "exit_reason" "text",
    "thesis_intact" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "user_id" "uuid" NOT NULL,
    "trade_state" "text" DEFAULT 'open'::"text" NOT NULL,
    "last_monitored_at" timestamp with time zone,
    "last_stop_alert_at" timestamp with time zone,
    "last_target_1_alert_at" timestamp with time zone,
    "last_target_2_alert_at" timestamp with time zone,
    CONSTRAINT "chk_trades_side" CHECK (("side" = ANY (ARRAY['long'::"text", 'short'::"text"]))),
    CONSTRAINT "chk_trades_status" CHECK (("status" = ANY (ARRAY['open'::"text", 'partial'::"text", 'closed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "trades_shares_exited_check" CHECK (("shares_exited" >= 0)),
    CONSTRAINT "trades_trade_state_check" CHECK (("trade_state" = ANY (ARRAY['open'::"text", 'partial'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."trades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "portfolio_value" numeric DEFAULT 100000 NOT NULL,
    "timezone" "text" DEFAULT 'America/Toronto'::"text" NOT NULL,
    "email_notifications_enabled" boolean DEFAULT true NOT NULL,
    "digest_email_enabled" boolean DEFAULT true NOT NULL,
    "urgent_alerts_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notification_email" "text"
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."watchlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ticker" "text" NOT NULL,
    "company_name" "text",
    "sector" "text",
    "industry" "text",
    "setup_type" "text" NOT NULL,
    "setup_score" numeric,
    "trend_score" numeric,
    "volume_score" numeric,
    "relative_strength" numeric,
    "earnings_date" "date",
    "catalyst" "text",
    "risk_level" "text",
    "position_size_pct" numeric,
    "status" "text" DEFAULT 'watchlist'::"text" NOT NULL,
    "notes" "text",
    "market_snapshot_id" "uuid",
    "base_pattern" "text",
    "setup_grade" "text",
    "trend_template_pass" boolean,
    "rs_strength_level" "text",
    "volume_dry_up_pass" boolean,
    "pivot_price" numeric,
    "entry_zone_low" numeric,
    "entry_zone_high" numeric,
    "stop_price" numeric,
    "target_1_price" numeric,
    "target_2_price" numeric,
    "rr_ratio" numeric,
    "earnings_within_2_weeks" boolean DEFAULT false NOT NULL,
    "binary_event_risk" boolean DEFAULT false NOT NULL,
    "action_status" "text" DEFAULT 'watchlist'::"text" NOT NULL,
    "rs_line_confirmed" boolean,
    "base_pattern_valid" boolean,
    "entry_near_pivot" boolean,
    "volume_breakout_confirmed" boolean,
    "liquidity_pass" boolean,
    "eps_growth_pct" numeric,
    "eps_accelerating" boolean,
    "revenue_growth_pct" numeric,
    "acc_dist_rating" "text",
    "industry_group_rank" integer,
    "user_id" "uuid" NOT NULL,
    "signal_state" "text" DEFAULT 'candidate'::"text" NOT NULL,
    "last_evaluated_at" timestamp with time zone,
    "last_fundamentals_at" timestamp with time zone,
    "consecutive_fail_count" integer DEFAULT 0 NOT NULL,
    "flagged_for_review" boolean DEFAULT false NOT NULL,
    "last_hard_fail_reason" "text",
    "data_status" "text" DEFAULT 'fresh'::"text" NOT NULL,
    CONSTRAINT "watchlist_acc_dist_rating_check" CHECK (("acc_dist_rating" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text", 'D'::"text", 'E'::"text"]))),
    CONSTRAINT "watchlist_data_status_check" CHECK (("data_status" = ANY (ARRAY['fresh'::"text", 'stale'::"text", 'error'::"text"]))),
    CONSTRAINT "watchlist_industry_group_rank_check" CHECK ((("industry_group_rank" IS NULL) OR (("industry_group_rank" >= 1) AND ("industry_group_rank" <= 197)))),
    CONSTRAINT "watchlist_signal_state_check" CHECK (("signal_state" = ANY (ARRAY['candidate'::"text", 'evaluated'::"text", 'plan_generated'::"text", 'signal_sent'::"text", 'awaiting_confirmation'::"text", 'snoozed'::"text", 'dismissed'::"text", 'converted_to_trade'::"text", 'flagged_for_review'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."watchlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "week_ending" "date" NOT NULL,
    "market_phase" "text",
    "ibd_status" "text",
    "spx_distribution_days" integer,
    "ndx_distribution_days" integer,
    "ftd_active" boolean,
    "phase_changed" boolean DEFAULT false NOT NULL,
    "prior_phase" "text",
    "current_phase" "text",
    "top_sectors" "text",
    "deteriorating_sectors" "text",
    "portfolio_value" numeric,
    "weekly_pnl_dollar" numeric,
    "weekly_pnl_pct" numeric,
    "total_heat_pct" numeric,
    "heat_ceiling_pct" numeric,
    "drawdown_from_hwm_pct" numeric,
    "open_positions_count" integer,
    "wins_count" integer,
    "losses_count" integer,
    "avg_win_r" numeric,
    "avg_loss_r" numeric,
    "biggest_rule_violation" "text",
    "next_week_triggers" "text",
    "primary_focus" "text",
    "notes" "text",
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."weekly_reviews" OWNER TO "postgres";


ALTER TABLE ONLY "public"."execution_log"
    ADD CONSTRAINT "execution_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_snapshots"
    ADD CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_snapshots"
    ADD CONSTRAINT "market_snapshots_snapshot_date_key" UNIQUE ("snapshot_date");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_dedupe_key_key" UNIQUE ("dedupe_key");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_actions"
    ADD CONSTRAINT "pending_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rule_results"
    ADD CONSTRAINT "rule_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scan_logs"
    ADD CONSTRAINT "scan_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."setup_evaluations"
    ADD CONSTRAINT "setup_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_plans"
    ADD CONSTRAINT "trade_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_reviews"
    ADD CONSTRAINT "weekly_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_reviews"
    ADD CONSTRAINT "weekly_reviews_week_ending_key" UNIQUE ("week_ending");



CREATE INDEX "idx_execution_log_pending_action_id" ON "public"."execution_log" USING "btree" ("pending_action_id");



CREATE INDEX "idx_execution_log_trade_id" ON "public"."execution_log" USING "btree" ("trade_id");



CREATE INDEX "idx_execution_log_user_created_at" ON "public"."execution_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_market_snapshots_snapshot_date" ON "public"."market_snapshots" USING "btree" ("snapshot_date" DESC);



CREATE UNIQUE INDEX "idx_market_snapshots_snapshot_date_unique" ON "public"."market_snapshots" USING "btree" ("snapshot_date");



CREATE UNIQUE INDEX "idx_notifications_dedupe_key" ON "public"."notifications" USING "btree" ("dedupe_key");



CREATE INDEX "idx_notifications_user_trigger_sent_at" ON "public"."notifications" USING "btree" ("user_id", "trigger_type", "sent_at" DESC);



CREATE INDEX "idx_pending_actions_trade_id" ON "public"."pending_actions" USING "btree" ("trade_id");



CREATE INDEX "idx_pending_actions_user_id" ON "public"."pending_actions" USING "btree" ("user_id");



CREATE INDEX "idx_pending_actions_user_state_urgency" ON "public"."pending_actions" USING "btree" ("user_id", "state", "urgency");



CREATE INDEX "idx_pending_actions_watchlist_id" ON "public"."pending_actions" USING "btree" ("watchlist_id");



CREATE INDEX "idx_rule_results_setup_evaluation_id" ON "public"."rule_results" USING "btree" ("setup_evaluation_id");



CREATE INDEX "idx_scan_logs_job_window" ON "public"."scan_logs" USING "btree" ("job_type", "window_key");



CREATE INDEX "idx_scan_logs_job_window_ticker" ON "public"."scan_logs" USING "btree" ("job_type", "window_key", "ticker");



CREATE INDEX "idx_scan_logs_user_started_at" ON "public"."scan_logs" USING "btree" ("user_id", "started_at" DESC);



CREATE INDEX "idx_setup_evaluations_evaluation_date" ON "public"."setup_evaluations" USING "btree" ("evaluation_date" DESC);



CREATE INDEX "idx_setup_evaluations_watchlist_id" ON "public"."setup_evaluations" USING "btree" ("watchlist_id");



CREATE INDEX "idx_trade_plans_approval_status" ON "public"."trade_plans" USING "btree" ("approval_status");



CREATE INDEX "idx_trade_plans_plan_date" ON "public"."trade_plans" USING "btree" ("plan_date" DESC);



CREATE INDEX "idx_trade_plans_watchlist_id" ON "public"."trade_plans" USING "btree" ("watchlist_id");



CREATE INDEX "idx_trades_entry_date" ON "public"."trades" USING "btree" ("entry_date" DESC);



CREATE INDEX "idx_trades_status" ON "public"."trades" USING "btree" ("status");



CREATE INDEX "idx_trades_ticker" ON "public"."trades" USING "btree" ("ticker");



CREATE INDEX "idx_watchlist_action_status" ON "public"."watchlist" USING "btree" ("action_status");



CREATE INDEX "idx_watchlist_status" ON "public"."watchlist" USING "btree" ("status");



CREATE INDEX "idx_watchlist_ticker" ON "public"."watchlist" USING "btree" ("ticker");



CREATE INDEX "idx_weekly_reviews_week_ending" ON "public"."weekly_reviews" USING "btree" ("week_ending" DESC);



CREATE OR REPLACE TRIGGER "trg_user_settings_touch_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



ALTER TABLE ONLY "public"."execution_log"
    ADD CONSTRAINT "execution_log_pending_action_id_fkey" FOREIGN KEY ("pending_action_id") REFERENCES "public"."pending_actions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."execution_log"
    ADD CONSTRAINT "execution_log_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."execution_log"
    ADD CONSTRAINT "execution_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_snapshots"
    ADD CONSTRAINT "market_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pending_action_id_fkey" FOREIGN KEY ("pending_action_id") REFERENCES "public"."pending_actions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_actions"
    ADD CONSTRAINT "pending_actions_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pending_actions"
    ADD CONSTRAINT "pending_actions_trade_plan_id_fkey" FOREIGN KEY ("trade_plan_id") REFERENCES "public"."trade_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pending_actions"
    ADD CONSTRAINT "pending_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_actions"
    ADD CONSTRAINT "pending_actions_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlist"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rule_results"
    ADD CONSTRAINT "rule_results_setup_evaluation_id_fkey" FOREIGN KEY ("setup_evaluation_id") REFERENCES "public"."setup_evaluations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rule_results"
    ADD CONSTRAINT "rule_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scan_logs"
    ADD CONSTRAINT "scan_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."setup_evaluations"
    ADD CONSTRAINT "setup_evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."setup_evaluations"
    ADD CONSTRAINT "setup_evaluations_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlist"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_plans"
    ADD CONSTRAINT "trade_plans_setup_evaluation_id_fkey" FOREIGN KEY ("setup_evaluation_id") REFERENCES "public"."setup_evaluations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trade_plans"
    ADD CONSTRAINT "trade_plans_source_watchlist_id_fkey" FOREIGN KEY ("source_watchlist_id") REFERENCES "public"."watchlist"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trade_plans"
    ADD CONSTRAINT "trade_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_plans"
    ADD CONSTRAINT "trade_plans_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlist"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_trade_plan_id_fkey" FOREIGN KEY ("trade_plan_id") REFERENCES "public"."trade_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_market_snapshot_id_fkey" FOREIGN KEY ("market_snapshot_id") REFERENCES "public"."market_snapshots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_reviews"
    ADD CONSTRAINT "weekly_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."execution_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "execution_log_delete_own" ON "public"."execution_log" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "execution_log_insert_own" ON "public"."execution_log" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "execution_log_select_own" ON "public"."execution_log" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "execution_log_update_own" ON "public"."execution_log" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."market_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "market_snapshots_delete_own" ON "public"."market_snapshots" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "market_snapshots_insert_own" ON "public"."market_snapshots" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "market_snapshots_select_own" ON "public"."market_snapshots" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "market_snapshots_update_own" ON "public"."market_snapshots" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_insert_own" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."pending_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pending_actions_delete_own" ON "public"."pending_actions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "pending_actions_insert_own" ON "public"."pending_actions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "pending_actions_select_own" ON "public"."pending_actions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "pending_actions_update_own" ON "public"."pending_actions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rule_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rule_results_delete_own" ON "public"."rule_results" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rule_results_insert_own" ON "public"."rule_results" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rule_results_select_own" ON "public"."rule_results" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rule_results_update_own" ON "public"."rule_results" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."scan_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scan_logs_delete_own" ON "public"."scan_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "scan_logs_insert_own" ON "public"."scan_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "scan_logs_select_own" ON "public"."scan_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "scan_logs_update_own" ON "public"."scan_logs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."setup_evaluations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "setup_evaluations_delete_own" ON "public"."setup_evaluations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "setup_evaluations_insert_own" ON "public"."setup_evaluations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "setup_evaluations_select_own" ON "public"."setup_evaluations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "setup_evaluations_update_own" ON "public"."setup_evaluations" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."trade_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trade_plans_delete_own" ON "public"."trade_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "trade_plans_insert_own" ON "public"."trade_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "trade_plans_select_own" ON "public"."trade_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "trade_plans_update_own" ON "public"."trade_plans" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."trades" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trades_delete_own" ON "public"."trades" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "trades_insert_own" ON "public"."trades" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "trades_select_own" ON "public"."trades" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "trades_update_own" ON "public"."trades" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_settings_delete_own" ON "public"."user_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_settings_insert_own" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_settings_select_own" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_settings_update_own" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."watchlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "watchlist_delete_own" ON "public"."watchlist" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "watchlist_insert_own" ON "public"."watchlist" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "watchlist_select_own" ON "public"."watchlist" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "watchlist_update_own" ON "public"."watchlist" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."weekly_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "weekly_reviews_delete_own" ON "public"."weekly_reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "weekly_reviews_insert_own" ON "public"."weekly_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "weekly_reviews_select_own" ON "public"."weekly_reviews" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "weekly_reviews_update_own" ON "public"."weekly_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_stale_buy_signals"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_stale_buy_signals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_stale_buy_signals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_open_pending_actions_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_open_pending_actions_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_open_pending_actions_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_single_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_single_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_single_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_resolved"("p_dedupe_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_resolved"("p_dedupe_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_resolved"("p_dedupe_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."execution_log" TO "anon";
GRANT ALL ON TABLE "public"."execution_log" TO "authenticated";
GRANT ALL ON TABLE "public"."execution_log" TO "service_role";



GRANT ALL ON TABLE "public"."market_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."market_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."market_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."pending_actions" TO "anon";
GRANT ALL ON TABLE "public"."pending_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_actions" TO "service_role";



GRANT ALL ON TABLE "public"."rule_results" TO "anon";
GRANT ALL ON TABLE "public"."rule_results" TO "authenticated";
GRANT ALL ON TABLE "public"."rule_results" TO "service_role";



GRANT ALL ON TABLE "public"."scan_logs" TO "anon";
GRANT ALL ON TABLE "public"."scan_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."scan_logs" TO "service_role";



GRANT ALL ON TABLE "public"."setup_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."setup_evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."setup_evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."trade_plans" TO "anon";
GRANT ALL ON TABLE "public"."trade_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_plans" TO "service_role";



GRANT ALL ON TABLE "public"."trades" TO "anon";
GRANT ALL ON TABLE "public"."trades" TO "authenticated";
GRANT ALL ON TABLE "public"."trades" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."watchlist" TO "anon";
GRANT ALL ON TABLE "public"."watchlist" TO "authenticated";
GRANT ALL ON TABLE "public"."watchlist" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_reviews" TO "anon";
GRANT ALL ON TABLE "public"."weekly_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_reviews" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







