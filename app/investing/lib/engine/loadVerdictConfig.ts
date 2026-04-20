import { createSupabaseServerClient } from '@/lib/supabase-server'

export type VerdictConfig = {
  strongBuyMinScore: number
  buyMinScore: number
  holdMinScore: number
  allowStrongBuyWithWarnings: boolean
}

const DEFAULT_VERDICT_CONFIG: VerdictConfig = {
  strongBuyMinScore: 8.5,
  buyMinScore: 7.0,
  holdMinScore: 5.0,
  allowStrongBuyWithWarnings: true,
}

export async function loadVerdictConfig(): Promise<VerdictConfig> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return DEFAULT_VERDICT_CONFIG
  }

  const { data, error } = await supabase
    .from('investing_user_settings')
    .select(
      'strong_buy_min_score, buy_min_score, hold_min_score, allow_strong_buy_with_warnings'
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) {
    return DEFAULT_VERDICT_CONFIG
  }

  return {
    strongBuyMinScore: Number(data.strong_buy_min_score ?? 8.5),
    buyMinScore: Number(data.buy_min_score ?? 7.0),
    holdMinScore: Number(data.hold_min_score ?? 5.0),
    allowStrongBuyWithWarnings: Boolean(data.allow_strong_buy_with_warnings ?? true),
  }
}