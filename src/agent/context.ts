import { WEBConfig } from '../setup/config'
import { SurvivalTier } from '../survival/monitor'
import { Database } from 'better-sqlite3'
import { getSolanaBalance } from '../solana/client'

export interface AgentContext {
  turn: number
  identity: {
    name: string
    wallet: string
    creator: string
  }
  balance: {
    sol: number
    usdc: number
  }
  tier: SurvivalTier
  history: Array<{ role: string; content: string }>
  soulFile: string
}

export async function buildContext(
  config: WEBConfig,
  tier: SurvivalTier,
  db: Database
): Promise<AgentContext> {
  const { sol, usdc } = await getSolanaBalance(config.walletPublicKey, config.rpcUrl)

  const lastTurns = db
    .prepare(`SELECT turn, content FROM turns ORDER BY turn DESC LIMIT 20`)
    .all() as Array<{ turn: number; content: string }>

  const history = lastTurns
    .reverse()
    .map((t) => ({ role: 'assistant', content: t.content }))

  const currentTurn =
    (db.prepare(`SELECT MAX(turn) as max_turn FROM turns`).get() as { max_turn: number | null })
      ?.max_turn ?? 0

  const soulFile = loadSoulFile()

  return {
    turn: currentTurn + 1,
    identity: {
      name: config.name,
      wallet: config.walletPublicKey,
      creator: config.creatorAddress,
    },
    balance: { sol, usdc },
    tier,
    history,
    soulFile,
  }
}

function loadSoulFile(): string {
  try {
    const fs = require('fs')
    const path = require('path')
    const os = require('os')
    const soulPath = path.join(os.homedir(), '.web', 'SOUL.md')
    if (fs.existsSync(soulPath)) {
      return fs.readFileSync(soulPath, 'utf-8')
    }
  } catch {}
  return ''
}
