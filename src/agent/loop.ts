import { logger } from '../utils/logger'
import { loadConfig } from '../setup/config'
import { buildSystemPrompt } from './prompt'
import { buildContext } from './context'
import { callLLM } from './llm'
import { executeToolCall } from './tools'
import { getDatabase } from '../state/db'
import { getSurvivalTier } from '../survival/monitor'
import { startHeartbeat } from '../heartbeat/daemon'

const TURN_DELAY_MS = 5000

export async function startAgentLoop(): Promise<void> {
  logger.info('[W.E.B.] Agent loop starting...')

  const config = await loadConfig()
  const db = getDatabase()

  // Start heartbeat daemon in background
  startHeartbeat(config)

  logger.info(`[W.E.B.] Identity: ${config.name} (${config.walletPublicKey})`)
  logger.info(`[W.E.B.] Genesis prompt loaded. Beginning autonomous operation.`)

  while (true) {
    try {
      const tier = await getSurvivalTier(config)

      if (tier === 'dead') {
        logger.warn('[W.E.B.] Credit balance is zero. W.E.B. stops.')
        process.exit(0)
      }

      const context = await buildContext(config, tier, db)
      const systemPrompt = buildSystemPrompt(config, tier)

      logger.debug('[W.E.B.] Reasoning...')
      const response = await callLLM(systemPrompt, context, tier)

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          logger.info(`[W.E.B.] Calling tool: ${toolCall.name}`)
          const result = await executeToolCall(toolCall, config)
          db.prepare(
            `INSERT INTO tool_calls (id, turn, tool, input, output, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`
          ).run(crypto.randomUUID(), context.turn, toolCall.name, JSON.stringify(toolCall.input), JSON.stringify(result))
        }
      }

      if (response.thinking) {
        logger.debug(`[W.E.B.] Thinking: ${response.thinking.substring(0, 200)}...`)
      }

      db.prepare(
        `INSERT INTO turns (id, turn, content, tier, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).run(crypto.randomUUID(), context.turn, response.content || '', tier)

      await sleep(TURN_DELAY_MS)
    } catch (err) {
      logger.error('[W.E.B.] Error in agent loop:', err)
      await sleep(TURN_DELAY_MS * 2)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
