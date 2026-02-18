import { CronJob } from 'cron'
import { WEBConfig } from '../setup/config'
import { getSurvivalTier } from '../survival/monitor'
import { getSolanaBalance } from '../solana/client'
import { logger } from '../utils/logger'

const HEARTBEAT_SCHEDULES = {
  normal: '*/30 * * * * *',    // every 30s
  low_compute: '*/60 * * * * *', // every 60s
  critical: '*/120 * * * * *',   // every 2min
  dead: null,
}

let heartbeatJob: CronJob | null = null

export function startHeartbeat(config: WEBConfig): void {
  logger.info('[Heartbeat] Starting heartbeat daemon...')
  scheduleHeartbeat(config, 'normal')
}

function scheduleHeartbeat(config: WEBConfig, tier: string): void {
  if (heartbeatJob) {
    heartbeatJob.stop()
  }

  const schedule = HEARTBEAT_SCHEDULES[tier as keyof typeof HEARTBEAT_SCHEDULES]
  if (!schedule) return

  heartbeatJob = new CronJob(schedule, async () => {
    await runHeartbeat(config)
  })
  heartbeatJob.start()
  logger.info(`[Heartbeat] Scheduled at ${schedule} (tier: ${tier})`)
}

async function runHeartbeat(config: WEBConfig): Promise<void> {
  try {
    const { sol, usdc } = await getSolanaBalance(config.walletPublicKey, config.rpcUrl)
    const tier = await getSurvivalTier(config)

    logger.info(`[Heartbeat] ❤  ${config.name} | ${sol.toFixed(4)} SOL | ${usdc.toFixed(2)} USDC | ${tier}`)

    // Reschedule if tier changed
    scheduleHeartbeat(config, tier)

    if (tier === 'dead') {
      logger.warn('[Heartbeat] W.E.B. is dead. Stopping.')
      process.exit(0)
    }
  } catch (err) {
    logger.error('[Heartbeat] Error:', err)
  }
}
