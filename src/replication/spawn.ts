import { WEBConfig } from '../setup/config'
import { generateWallet, sendSolanaTransfer } from '../solana/client'
import { getDatabase } from '../state/db'
import { logger } from '../utils/logger'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

const execAsync = promisify(exec)

interface SpawnOptions {
  name: string
  genesisPrompt: string
  initialSol: number
}

export async function spawnChild(config: WEBConfig, opts: SpawnOptions): Promise<{
  success: boolean
  childWallet?: string
  error?: string
}> {
  logger.info(`[Replication] Spawning child: ${opts.name}`)

  try {
    // 1. Generate child wallet
    const { publicKey: childPublicKey, secretKey: childSecretKey } = await generateWallet()

    // 2. Fund child wallet
    await sendSolanaTransfer(config, childPublicKey, opts.initialSol, 'SOL')
    logger.info(`[Replication] Funded ${childPublicKey} with ${opts.initialSol} SOL`)

    // 3. Write child config
    const childDir = path.join(os.homedir(), `.web-children`, opts.name)
    await fs.mkdir(childDir, { recursive: true })

    const childConfig: WEBConfig = {
      name: opts.name,
      genesisPrompt: opts.genesisPrompt,
      creatorAddress: config.walletPublicKey, // parent is creator
      walletPublicKey: childPublicKey,
      walletSecretKey: childSecretKey,
      rpcUrl: config.rpcUrl,
      anthropicApiKey: config.anthropicApiKey,
      createdAt: new Date().toISOString(),
    }

    await fs.writeFile(
      path.join(childDir, 'config.json'),
      JSON.stringify(childConfig, null, 2)
    )

    // 4. Log to DB
    const db = getDatabase()
    db.prepare(
      `INSERT INTO children (id, name, wallet_public_key, genesis_prompt, initial_sol, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))`
    ).run(
      crypto.randomUUID(),
      opts.name,
      childPublicKey,
      opts.genesisPrompt,
      opts.initialSol
    )

    logger.info(`[Replication] Child ${opts.name} spawned successfully: ${childPublicKey}`)
    return { success: true, childWallet: childPublicKey }
  } catch (err: unknown) {
    const error = err as { message: string }
    logger.error('[Replication] Failed to spawn child:', err)
    return { success: false, error: error.message }
  }
}
