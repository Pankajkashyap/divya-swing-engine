export type ThesisStatus =
  | 'Intact'
  | 'Strengthening'
  | 'Under review'
  | 'Weakening'
  | 'Broken'

export type WatchlistStatus =
  | 'Watching — overvalued'
  | 'Watching — approaching entry'
  | 'Ready to buy'
  | 'Under research'
  | 'Removed'

export type AccountType = 'TFSA' | 'Non-registered'

export type BucketType =
  | 'Core compounder'
  | 'Quality growth'
  | 'Special opportunity'
  | 'TFSA Cash'
  | 'Non-registered Cash'

export type Verdict = 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid' | 'Red Flag'

export type Confidence = 'High' | 'Medium' | 'Low'

export type Action = 'BUY' | 'SELL' | 'ADD' | 'TRIM' | 'HOLD'

export type EmotionalState =
  | 'Calm & analytical'
  | 'Excited'
  | 'Fearful'
  | 'Impatient'
  | 'Pressured'
  | 'Confident'

export type FrameworkSupported = 'Yes' | 'Partially' | 'No — override'

export type CyclePhase =
  | 'Early recovery'
  | 'Mid-cycle'
  | 'Late cycle'
  | 'Contraction'
  | 'Uncertain'

export type Sector =
  | 'Technology'
  | 'Consumer Staples'
  | 'Consumer Discretionary'
  | 'Healthcare'
  | 'Financials'
  | 'Industrials'
  | 'Energy'
  | 'Communication Services'
  | 'Real Estate'
  | 'Utilities'
  | 'Materials'

export type Holding = {
  id: string
  user_id: string | null
  ticker: string
  company: string
  account: AccountType
  base_currency: string
  sector: Sector | string
  shares: number
  avg_cost: number
  current_price: number
  market_value: number | null
  gain_loss_pct: number | null
  thesis: string | null
  thesis_breakers: string | null
  thesis_status: ThesisStatus
  date_bought: string | null
  bucket: BucketType | null
  created_at: string
  updated_at: string
}

export type WatchlistItem = {
  id: string
  user_id: string | null
  ticker: string
  company: string
  sector: Sector | string
  why_watching: string | null
  target_entry: number | null
  current_price: number
  fair_value_low: number | null
  fair_value_high: number | null
  scorecard_overall: number | null
  status: WatchlistStatus
  date_added: string
  discount_to_entry: number | null
  created_at: string
  updated_at: string
}

export type StockAnalysis = {
  id: string
  user_id: string | null
  ticker: string
  company: string
  analysis_date: string
  sector: Sector | string
  moat_score: number | null
  valuation_score: number | null
  mgmt_score: number | null
  roic_score: number | null
  fin_health_score: number | null
  biz_understanding_score: number | null
  overall_score: number | null
  verdict: Verdict | null
  fair_value_low: number | null
  fair_value_high: number | null
  thesis: string | null
  thesis_breakers: string | null
  confidence: Confidence | null
  raw_analysis: string | null
  created_at: string
  updated_at: string
  moat_json?: Record<string, unknown> | null
  management_json?: Record<string, unknown> | null
  moat_score_auto?: number | null
  management_score_auto?: number | null
  qualitative_confidence?: string | null
  qualitative_imported_at?: string | null
  roic_score_auto?: number | null
  roic_score_explanation?: string | null
  fin_health_score_auto?: number | null
  fin_health_score_explanation?: string | null
  business_understanding_json?: Record<string, unknown> | null
  biz_understanding_score_auto?: number | null
  biz_understanding_score_explanation?: string | null
  valuation_score_auto?: number | null
  valuation_score_explanation?: string | null
  confidence_auto?: string | null
  confidence_explanation?: string | null
  verdict_auto?: Verdict | null
  verdict_explanation?: string | null
}

export type DecisionJournalEntry = {
  id: string
  user_id: string | null
  entry_number: number
  entry_date: string
  ticker: string
  account: AccountType
  action: Action
  shares: number | null
  price: number | null
  portfolio_weight_after: number | null
  reasoning: string | null
  emotional_state: EmotionalState | null
  scorecard_overall: number | null
  framework_supported: FrameworkSupported | null
  three_month_review: string | null
  twelve_month_review: string | null
  review_due_3m: string | null
  review_due_12m: string | null
  created_at: string
}

export type QuarterlyReview = {
  id: string
  user_id: string | null
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  review_date: string
  portfolio_value: number | null
  quarter_return: number | null
  ytd_return: number | null
  sp500_quarter: number | null
  sp500_ytd: number | null
  alpha: number | null
  num_holdings: number | null
  cash_pct: number | null
  cycle_phase: CyclePhase | null
  top_lesson: string | null
  action_items: string | null
  emotional_discipline: number | null
  created_at: string
}

export type SectorTarget = {
  id: string
  user_id: string | null
  sector: Sector | string
  min_pct: number
  max_pct: number
  created_at: string
}

export type BucketTarget = {
  id: string
  user_id: string | null
  bucket: BucketType | string
  target_pct: number | null
  min_pct: number | null
  max_pct: number | null
  created_at: string
}

export type PriceCache = {
  id: string
  ticker: string
  price_date: string
  close_price: number
  fetched_at: string
}