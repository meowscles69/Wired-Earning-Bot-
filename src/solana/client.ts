import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import bs58 from 'bs58'
import { WEBConfig } from '../setup/config'
import { logger } from '../utils/logger'

export function getConnection(rpcUrl: string): Connection {
  return new Connection(rpcUrl, 'confirmed')
}

export async function getSolanaBalance(
  publicKey: string,
  rpcUrl: string
): Promise<{ sol: number; usdc: number }> {
  try {
    const connection = getConnection(rpcUrl)
    const pubkey = new PublicKey(publicKey)
    const lamports = await connection.getBalance(pubkey)
    const sol = lamports / LAMPORTS_PER_SOL

    // TODO: fetch USDC SPL token balance
    const usdc = 0

    return { sol, usdc }
  } catch (err) {
    logger.warn('[Solana] Failed to fetch balance:', err)
    return { sol: 0, usdc: 0 }
  }
}

export async function sendSolanaTransfer(
  config: WEBConfig,
  to: string,
  amount: number,
  token: 'SOL' | 'USDC'
): Promise<string> {
  const connection = getConnection(config.rpcUrl)
  const keypair = Keypair.fromSecretKey(bs58.decode(config.walletSecretKey))

  if (token === 'SOL') {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(to),
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
    )
    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair])
    return signature
  }

  // USDC: SPL token transfer
  throw new Error('USDC transfers not yet implemented — use SOL for now')
}

export async function generateWallet(): Promise<{ publicKey: string; secretKey: string }> {
  const keypair = Keypair.generate()
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: bs58.encode(keypair.secretKey),
  }
}

export async function requestAirdrop(publicKey: string, rpcUrl: string): Promise<void> {
  const connection = getConnection(rpcUrl)
  const pubkey = new PublicKey(publicKey)
  const sig = await connection.requestAirdrop(pubkey, LAMPORTS_PER_SOL)
  await connection.confirmTransaction(sig)
  logger.info(`[Solana] Airdrop successful: 1 SOL to ${publicKey}`)
}
