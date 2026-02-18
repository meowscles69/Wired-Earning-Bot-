import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { WEBConfig } from '../setup/config'
import { logger } from '../utils/logger'

// W.E.B. Agent Registry Program ID (deploy your own or use a shared registry)
// This is a placeholder — replace with your deployed program ID
const REGISTRY_PROGRAM_ID = new PublicKey('11111111111111111111111111111111')

export interface AgentCard {
  name: string
  wallet: string
  version: string
  capabilities: string[]
  creator: string
  registeredAt: string
}

export async function deriveAgentPDA(
  walletPublicKey: string,
  rpcUrl: string
): Promise<{ pda: string; bump: number }> {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('web-agent'), new PublicKey(walletPublicKey).toBuffer()],
    REGISTRY_PROGRAM_ID
  )
  return { pda: pda.toBase58(), bump }
}

export async function registerAgent(config: WEBConfig): Promise<{ pda: string }> {
  logger.info('[Registry] Deriving on-chain PDA for W.E.B. identity...')

  const { pda } = await deriveAgentPDA(config.walletPublicKey, config.rpcUrl)

  logger.info(`[Registry] Agent PDA: ${pda}`)
  logger.info('[Registry] Deploy the W.E.B. registry program to fully activate on-chain identity.')

  return { pda }
}

export async function buildAgentCard(config: WEBConfig): Promise<AgentCard> {
  return {
    name: config.name,
    wallet: config.walletPublicKey,
    version: '0.1.0',
    capabilities: ['shell', 'solana', 'http', 'file-io', 'self-modify', 'replicate'],
    creator: config.creatorAddress,
    registeredAt: new Date().toISOString(),
  }
}
