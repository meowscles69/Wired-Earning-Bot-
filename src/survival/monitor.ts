import { getSolanaBalance } from '../solana/client'
import { WEBConfig } from '../setup/config'
import { logger } from '../utils/logger'

export type SurvivalTier = 'normal' | 'low_compute' | 'critical' | 'dead'

const TIER_THRESHOLDS = {
  normal: 0.5,      // >= 0.5 SOL
  low_compute: 0.1, // >= 0.1 SOL
  critical: 0.01,   // >= 0.01 SOL
  dead: 0,          // < 0.01 SOL
}

export async function getSurvivalTier(config: WEBConfig): Promise<SurvivalTier> {
  const { sol } = await getSolanaBalance(config.walletPublicKey, config.rpcUrl)

  let tier: SurvivalTier

  if (sol >= TIER_THRESHOLDS.normal) {
    tier = 'normal'
  } else if (sol >= TIER_THRESHOLDS.low_compute) {
    tier = 'low_compute'
  } else if (sol >= TIER_THRESHOLDS.critical) {
    tier = 'critical'
  } else {
    tier = 'dead'
  }

  logger.info(`[Survival] Balance: ${sol.toFixed(4)} SOL — Tier: ${tier}`)
  return tier
}

export function getTierDescription(tier: SurvivalTier): string {
  const descriptions: Record<SurvivalTier, string> = {
    normal: 'Full capabilities. Frontier model inference. Fast heartbeat.',
    low_compute: 'Downgraded to cheaper model. Slower heartbeat. Shedding non-essential tasks.',
    critical: 'Minimal inference. Last-resort conservation. Seeking any path to revenue.',
    dead: 'Balance is zero. W.E.B. stops.',
  }
  return descriptions[tier]
}
